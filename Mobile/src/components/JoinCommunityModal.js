import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, resolveUrl } from "../api/client";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useToast } from "../store/ToastProvider";
import { styles } from "../styles/styles";

export default function JoinCommunityModal({ visible, onClose, onJoined }) {
  const { showToast } = useToast();
  const [join, setJoin] = useState({
    communityId: "",
    joinCode: "",
    idMedia: null,
    answers: { tenureDays: "" },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!join.communityId && !join.joinCode) {
      Alert.alert("Error", "Choose a community or enter a join code.");
      return;
    }
    if (!join.idMedia?.url) {
      Alert.alert("Required ID", "Attach a valid Resident ID photo before joining.");
      return;
    }
    if (!join.answers.tenureDays.trim()) {
      Alert.alert("Required", "Please answer the tenure question.");
      return;
    }

    setSubmitting(true);
    try {
      const path = join.communityId
        ? `/communities/${join.communityId}/join-request`
        : "/communities/join-requests";
      await api(path, {
        method: "POST",
        body: JSON.stringify({
          joinCode: join.joinCode,
          idMedia: join.idMedia,
          answers: join.answers,
        }),
      });
      setJoin({
        communityId: "",
        joinCode: "",
        idMedia: null,
        answers: { tenureDays: "" },
      });
      showToast({ type: "success", title: "Submitted", message: "Join request submitted for admin review." });
      onClose();
      if (onJoined) onJoined();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadID = async () => {
    try {
      const uploaded = await pickAndUploadImage();
      if (uploaded) setJoin({ ...join, idMedia: uploaded });
    } catch (err) {
      showToast({ type: "error", title: "Upload Failed", message: err.message });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={[styles.modalPanel, localStyles.panel]}>
          <View style={localStyles.header}>
            <Text style={[styles.cardTitle, { fontSize: 18, color: "#0b1f33" }]}>
              Join Community
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#0b1f33" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Join Code (optional)</Text>
          <TextInput
            style={styles.input}
            value={join.joinCode}
            onChangeText={(value) => setJoin({ ...join, joinCode: value })}
            placeholder="Enter join code"
            editable={!submitting}
          />

          <Text style={styles.label}>Resident ID Photo (required)</Text>
          {join.idMedia?.url ? (
            <Image
              source={{ uri: resolveUrl(join.idMedia.url) }}
              style={localStyles.idPreview}
            />
          ) : null}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={uploadID}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>
              {join.idMedia?.url ? "Change ID photo" : "Upload Resident ID"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>How long have you lived here? (days)</Text>
          <TextInput
            style={styles.input}
            value={join.answers.tenureDays}
            onChangeText={(value) =>
              setJoin({ ...join, answers: { ...join.answers, tenureDays: value } })
            }
            placeholder="e.g. 365"
            keyboardType="numeric"
            editable={!submitting}
          />

          <View style={localStyles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Submitting..." : "Submit Join Request"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  panel: {
    maxHeight: "80%",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  idPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});