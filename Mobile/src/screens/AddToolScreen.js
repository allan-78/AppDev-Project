import React, { useEffect, useMemo, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { pickAndUploadImage } from "../utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";

export default function AddToolScreen({ navigation, route }) {
  const toolToEdit = route?.params?.tool || null;
  const isEditing = !!toolToEdit;
  
  const [navigateOnSuccess, setNavigateOnSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: toolToEdit?.name || "",
    description: toolToEdit?.description || "",
    rules: toolToEdit?.rules || "",
    depositPoints: String(toolToEdit?.depositPoints ?? "10"),
    category: toolToEdit?.category?._id || toolToEdit?.category || "",
    imageUrl: toolToEdit?.images?.[0]?.url || "",
    pickupLocation: toolToEdit?.pickupLocation || "",
    availableWindows: toolToEdit?.availableWindows || "",
    securityNotes: toolToEdit?.securityNotes || "",
    maxBorrowDays: String(toolToEdit?.maxBorrowDays ?? "7"),
    condition: toolToEdit?.condition || "good",
    requiresIdCheck: toolToEdit?.requiresIdCheck ?? true,
    requiresPhotoEvidence: toolToEdit?.requiresPhotoEvidence ?? true
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api("/tools/categories").then((data) => {
      setCategories(data.categories);
      if (!isEditing && data.categories[0] && !form.category) {
        setForm((current) => ({ ...current, category: data.categories[0]._id }));
      }
    }).catch(console.error);
  }, []);

  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Tool name is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.rules.trim()) e.rules = "Borrowing rules are required.";
    if (!form.category) e.category = "Please select a category.";
    if (!form.imageUrl) e.imageUrl = "Please choose a listing photo.";
    if (!form.depositPoints || Number.isNaN(Number(form.depositPoints))) e.depositPoints = "Deposit points must be a number.";
    if (!form.maxBorrowDays || Number.isNaN(Number(form.maxBorrowDays))) e.maxBorrowDays = "Max borrow days must be a number.";
    if (!form.pickupLocation.trim()) e.pickupLocation = "Pickup location is required.";
    return e;
  }, [form]);

  async function submit() {
    if (submitting) return;
    if (Object.keys(errors).length) {
      setMessage(Object.values(errors)[0]);
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const url = isEditing ? `/tools/${toolToEdit._id}` : "/tools";
      const method = isEditing ? "PATCH" : "POST";
      await api(url, {
        method,
        body: JSON.stringify({
          ...form,
          depositPoints: Number(form.depositPoints),
          maxBorrowDays: Number(form.maxBorrowDays),
          images: [{ url: form.imageUrl, label: "listing" }]
        })
      });
      setMessage(isEditing ? "Tool updated successfully." : "Tool listed successfully.");
      if (!isEditing) {
        setForm({ ...form, name: "", description: "", rules: "", imageUrl: "", pickupLocation: "", availableWindows: "", securityNotes: "" });
      }
      setNavigateOnSuccess(true);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseImage() {
    try {
      setMessage("Uploading image...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setForm({ ...form, imageUrl: uploaded.url });
      setMessage(uploaded ? "Image attached." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    if (navigateOnSuccess) {
      const timer = setTimeout(() => {
        navigation.navigate("BrowseTools");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [navigateOnSuccess, navigation]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
      <ScrollView contentContainerStyle={[styles.contentInner, { paddingBottom: 40 }]}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#0b1f33" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33" }}>{isEditing ? "Edit Listing" : "List a Tool"}</Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{isEditing ? "Update your tool info, requirements or rules." : "Earn trust by lending useful equipment to neighbors"}</Text>
        </View>

        {/* Step Progress */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
          {["Details", "Settings", "Review"].map((step, i) => (
            <View key={step} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: i === 0 ? "#0b1f33" : "#e2e8f0", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: i === 0 ? "#fff" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 10, color: i === 0 ? "#0b1f33" : "#94a3b8", fontWeight: i === 0 ? "700" : "500" }}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Basic Info Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0b1f33", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Ionicons name="information-circle" size={18} color="#0b1f33" /> Basic Information
          </Text>

          {/* Tool Name */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Tool Name *</Text>
          <TextInput
            style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, borderWidth: 1, borderColor: errors.name ? "#ef4444" : "#ded8cc" }}
            value={form.name}
            onChangeText={(value) => setForm({ ...form, name: value })}
            placeholder="What are you lending?"
            placeholderTextColor="#94a3b8"
          />
          {errors.name ? <Text style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{errors.name}</Text> : null}

          {/* Description */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Description *</Text>
          <TextInput
            style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: errors.description ? "#ef4444" : "#ded8cc" }}
            value={form.description}
            onChangeText={(value) => setForm({ ...form, description: value })}
            placeholder="Describe your tool, its condition, and what's included..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          {/* Category */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Category *</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: form.category === category._id ? "#0b1f33" : "#f1f5f9", borderWidth: 1, borderColor: form.category === category._id ? "#0b1f33" : "#e2e8f0" }}
                onPress={() => setForm({ ...form, category: category._id })}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: form.category === category._id ? "#fff" : "#64748b" }}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Condition</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {["excellent", "good", "fair", "needs_repair"].map((condition) => (
              <TouchableOpacity
                key={condition}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: form.condition === condition ? "#0b1f33" : "#f1f5f9", borderWidth: 1, borderColor: form.condition === condition ? "#0b1f33" : "#e2e8f0" }}
                onPress={() => setForm({ ...form, condition })}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: form.condition === condition ? "#fff" : "#64748b", textTransform: "capitalize" }}>
                  {condition.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0b1f33", marginBottom: 12 }}>
            <Ionicons name="camera" size={18} color="#0b1f33" /> Listing Photo *
          </Text>
          {form.imageUrl ? (
            <View style={{ position: "relative", marginBottom: 12 }}>
              <Image source={{ uri: resolveUrl(form.imageUrl) }} style={{ width: "100%", height: 200, borderRadius: 12, backgroundColor: "#f1f5f9" }} resizeMode="cover" />
              <TouchableOpacity
                onPress={() => setForm({ ...form, imageUrl: "" })}
                style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={chooseImage}
              style={{ borderWidth: 2, borderColor: "#ded8cc", borderStyle: "dashed", borderRadius: 12, padding: 24, alignItems: "center", backgroundColor: "#faf9f7", marginBottom: 12 }}
            >
              <Ionicons name="image-outline" size={40} color="#94a3b8" />
              <Text style={{ color: "#64748b", fontWeight: "600", marginTop: 8, fontSize: 13 }}>Tap to upload a photo</Text>
              <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>Shows on the Browse & Detail screens</Text>
            </TouchableOpacity>
          )}
          {errors.imageUrl ? <Text style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{errors.imageUrl}</Text> : null}
        </View>

        {/* Borrowing Settings Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0b1f33", marginBottom: 14 }}>
            <Ionicons name="settings" size={18} color="#0b1f33" /> Borrowing Settings
          </Text>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Escrow Points *</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, borderWidth: 1, borderColor: errors.depositPoints ? "#ef4444" : "#ded8cc", paddingHorizontal: 12 }}>
                <Ionicons name="wallet-outline" size={16} color="#94a3b8" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
                  value={form.depositPoints}
                  onChangeText={(value) => setForm({ ...form, depositPoints: value })}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Max Borrow Days *</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, borderWidth: 1, borderColor: errors.maxBorrowDays ? "#ef4444" : "#ded8cc", paddingHorizontal: 12 }}>
                <Ionicons name="time-outline" size={16} color="#94a3b8" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
                  value={form.maxBorrowDays}
                  onChangeText={(value) => setForm({ ...form, maxBorrowDays: value })}
                  keyboardType="numeric"
                  placeholder="7"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* Pickup Location */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Pickup Location *</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, borderWidth: 1, borderColor: errors.pickupLocation ? "#ef4444" : "#ded8cc", paddingHorizontal: 12, marginBottom: 12 }}>
            <Ionicons name="location-outline" size={16} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
              value={form.pickupLocation}
              onChangeText={(value) => setForm({ ...form, pickupLocation: value })}
              placeholder="Where will borrowers pick up?"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Available Windows */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Available Pickup Windows</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, borderWidth: 1, borderColor: "#ded8cc", paddingHorizontal: 12, marginBottom: 12 }}>
            <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
              value={form.availableWindows}
              onChangeText={(value) => setForm({ ...form, availableWindows: value })}
              placeholder="e.g. Evenings & weekends"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Rules & Security Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0b1f33", marginBottom: 14 }}>
            <Ionicons name="shield-checkmark" size={18} color="#0b1f33" /> Rules & Security
          </Text>

          {/* Borrowing Rules */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Borrowing Rules *</Text>
          <TextInput
            style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: errors.rules ? "#ef4444" : "#ded8cc" }}
            value={form.rules}
            onChangeText={(value) => setForm({ ...form, rules: value })}
            placeholder="What rules should borrowers follow? e.g. Return clean, no disassembly..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          {/* Security Notes */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Security Notes</Text>
          <TextInput
            style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, minHeight: 60, textAlignVertical: "top", borderWidth: 1, borderColor: "#ded8cc" }}
            value={form.securityNotes}
            onChangeText={(value) => setForm({ ...form, securityNotes: value })}
            placeholder="ID handoff process, photo evidence expectations..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          {/* Toggles */}
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f7f4ed", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ded8cc" }}
              onPress={() => setForm({ ...form, requiresIdCheck: !form.requiresIdCheck })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="id-card-outline" size={18} color="#0b1f33" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>Require ID Check</Text>
              </View>
              <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: form.requiresIdCheck ? "#059669" : "#e2e8f0", padding: 2 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: form.requiresIdCheck ? "flex-end" : "flex-start" }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f7f4ed", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ded8cc" }}
              onPress={() => setForm({ ...form, requiresPhotoEvidence: !form.requiresPhotoEvidence })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="camera-outline" size={18} color="#0b1f33" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>Require Pickup/Return Photos</Text>
              </View>
              <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: form.requiresPhotoEvidence ? "#059669" : "#e2e8f0", padding: 2 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: form.requiresPhotoEvidence ? "flex-end" : "flex-start" }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message */}
        {message ? (
          <View style={{ padding: 12, backgroundColor: message.includes("successfully") ? "#e8f7ef" : message.includes("error") || message.includes("Failed") ? "#fef2f2" : "#fffbeb", borderRadius: 10, marginBottom: 12 }}>
            <Text style={{ color: message.includes("successfully") ? "#059669" : "#ef4444", fontSize: 13, fontWeight: "600" }}>{message}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={{ backgroundColor: "#0b1f33", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: submitting ? 0.6 : 1 }}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{submitting ? (isEditing ? "Saving..." : "Publishing...") : (isEditing ? "Save Changes" : "Publish Tool")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: "center", paddingVertical: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: "#64748b", fontWeight: "600", fontSize: 13 }}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}