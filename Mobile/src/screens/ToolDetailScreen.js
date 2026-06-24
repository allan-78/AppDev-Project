import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/styles";
import { api, uploadImage, resolveUrl } from "../api/client";
import ScreenHeader from "../components/ScreenHeader";
import * as ImagePicker from "expo-image-picker";
import GlobalLoader from "../components/GlobalLoader";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAuth } from "../store/AuthProvider";
import { pickAndUploadImage } from "../utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";

export default function ToolDetailScreen({ route, navigation }) {
  const tool = route.params?.tool || null;
  const { user, refreshProfile } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickerField, setPickerField] = useState(null); // 'start' | 'end' | null

  useEffect(() => {
    if (!tool) navigation.goBack();
  }, [tool]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission required", "Please allow media access to upload evidence.");
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true });
    if (!result.cancelled) {
      setEvidence(result);
    }
  }

  async function submitRequest() {
    if (loading) return;
    // Ensure user has uploaded ID before requesting
    if (!user?.idImageUrl) {
      return Alert.alert(
        "ID required",
        "You must upload a valid ID to request a borrow. Upload now?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upload",
            onPress: async () => {
              try {
                const uploaded = await pickAndUploadImage();
                if (!uploaded) return;
                await api("/users/profile", { method: "PATCH", body: JSON.stringify({ idImageUrl: uploaded.url }) });
                await refreshProfile();
                Alert.alert("Uploaded", "ID uploaded. Please submit your borrow request again.");
              } catch (err) {
                Alert.alert("Upload failed", err.message || "Could not upload ID");
              }
            }
          }
        ]
      );
    }
    // Validate dates
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const today = new Date();
    if (!s || isNaN(s.getTime())) return Alert.alert("Invalid date", "Please choose a valid start date.");
    if (!e || isNaN(e.getTime())) return Alert.alert("Invalid date", "Please choose a valid end date.");
    if (s > e) return Alert.alert("Invalid range", "Start date must be before end date.");
    if (s < new Date(today.toDateString())) return Alert.alert("Invalid date", "Start date cannot be in the past.");

    setLoading(true);
    try {
      let imageUpload;
      if (evidence) {
        imageUpload = await uploadImage(evidence);
      }
      const payload = { tool: tool._id, startDate: s.toISOString(), endDate: e.toISOString(), requestNote: note, evidenceUrl: imageUpload?.url || null };
      const result = await api("/borrow-requests", { method: "POST", body: JSON.stringify(payload) });
      const borrowRequest = result.borrowRequest;
      // If we uploaded evidence, attach it as a first message on the thread
      if (imageUpload?.url) {
        try {
          await api(`/messages/borrow-requests/${borrowRequest._id}`, { method: "POST", body: JSON.stringify({ body: note || `Requesting to borrow ${tool.name}.`, imageUrl: imageUpload.url }) });
        } catch (e) {
          console.warn("Failed to attach evidence message", e.message);
        }
      }
      Alert.alert("Request sent", "Your borrow request was submitted.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function quickRange(days) {
    const s = new Date();
    const e = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title={tool?.name || "Tool"} subtitle={tool?.category?.name} />
        <View style={styles.content}>
          <View style={styles.contentInner}>
        <Image source={{ uri: resolveUrl(tool?.images?.[0]?.url) }} style={styles.previewImage} />
        <Text style={styles.cardTitle}>{tool?.name}</Text>
        <Text style={styles.muted}>{tool?.description}</Text>
        <Text style={styles.points}>Escrow: {tool?.depositPoints} pts</Text>

        <Text style={{ marginTop: 12, fontWeight: "800" }}>Start date (YYYY-MM-DD)</Text>
        <TouchableOpacity onPress={() => setPickerField('start')}>
          <TextInput style={styles.input} value={startDate} placeholder="YYYY-MM-DD" editable={false} />
        </TouchableOpacity>
        <Text style={{ marginTop: 8, fontWeight: "800" }}>End date (YYYY-MM-DD)</Text>
        <TouchableOpacity onPress={() => setPickerField('end')}>
          <TextInput style={styles.input} value={endDate} placeholder="YYYY-MM-DD" editable={false} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={styles.chip} onPress={() => quickRange(1)}><Text style={styles.chipText}>Tomorrow</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => quickRange(3)}><Text style={styles.chipText}>3 days</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => quickRange(7)}><Text style={styles.chipText}>1 week</Text></TouchableOpacity>
        </View>

        <Text style={{ marginTop: 8, fontWeight: "800" }}>Request note</Text>
        <TextInput style={[styles.input, styles.textArea]} value={note} onChangeText={setNote} placeholder="Add any notes for the owner" />

        <View style={{ marginTop: 8, gap: 8 }}>
          <TouchableOpacity style={styles.ghostButton} onPress={pickImage}><Text style={styles.link}>Attach photo evidence</Text></TouchableOpacity>
          {evidence ? <Image source={{ uri: evidence.uri }} style={{ width: "100%", height: 160, borderRadius: 8 }} /> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.primaryButton} onPress={submitRequest}><Text style={styles.primaryButtonText}>Submit borrow request</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={async () => {
              // try find an existing borrow request for this user/tool
              try {
                const data = await api("/borrow-requests");
                const requests = data.requests || [];
                const existing = requests.find(r => r.tool && (r.tool._id || r.tool) === tool._id && (r.borrower?._id === (user && user._id) || r.borrower === (user && user._id)));
                if (existing) {
                  navigation.navigate("Chat", { request: existing });
                } else {
                  Alert.alert("No chat available", "Start a borrow request to open an owner chat.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Start request", onPress: () => { /* shallow scroll to request form */ } }
                  ]);
                }
              } catch (e) {
                Alert.alert("Error", "Could not open chat");
              }
            }}>
              <Ionicons name="chatbubble-outline" size={20} color="#0f172a" />
              <Text style={{ marginLeft: 6, color: "#0f172a", fontWeight: "800" }}>Contact</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
        </View>
        </View>
      </View>
      </ScrollView>
      {loading ? <GlobalLoader fullScreen message={"Submitting request..."} /> : null}
      <DateTimePickerModal
        isVisible={!!pickerField}
        mode="date"
        onConfirm={(date) => {
          const iso = date.toISOString().slice(0, 10);
          if (pickerField === 'start') setStartDate(iso);
          if (pickerField === 'end') setEndDate(iso);
          setPickerField(null);
        }}
        onCancel={() => setPickerField(null)}
      />
    </SafeAreaView>
  );
}

// Date picker modal handlers
const _ = null;
