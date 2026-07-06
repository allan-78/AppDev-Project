import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, SafeAreaView, TextInput } from "react-native";
import { api, uploadMedia, resolveUrl } from "../api/client";
import * as ImagePicker from "expo-image-picker";
import GlobalLoader from "../components/GlobalLoader";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAuth } from "../store/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import TrustBadge from "../components/TrustBadge";
import ToolCard from "../components/ToolCard";
import ProfileCardModal from "../components/ProfileCardModal";
import SkeletonLoader from "../components/SkeletonLoader";

const COLORS = {
  navy: "#0b1f33",
  green: "#059669",
  amber: "#d97706",
  red: "#ef4444",
  gold: "#94733d",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  gray: "#64748b",
  lightGray: "#94a3b8",
  bg: "#f7f4ed",
  border: "#e2e8f0",
  card: "#ffffff",
};

export default function ToolDetailScreen({ route, navigation }) {
  const tool = route.params?.tool;
  const { user } = useAuth();
  const presetRange = route.params?.presetRange;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [startDate, setStartDate] = useState(presetRange?.startDate || "");
  const [endDate, setEndDate] = useState(presetRange?.endDate || "");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickerField, setPickerField] = useState(null);
  const [similarTools, setSimilarTools] = useState([]);
  const [profileModal, setProfileModal] = useState({ visible: false, userId: null });
  const [dataLoading, setDataLoading] = useState(true);

  const images = tool?.images || [];
  const owner = tool?.owner;
  const health = tool?.healthScore ?? 100;
  const healthColor = health > 60 ? COLORS.green : health > 30 ? COLORS.amber : COLORS.red;
  const rules = tool?.rules || {};

  useEffect(() => {
    if (!tool) navigation.goBack();
  }, [tool]);

  useEffect(() => {
    if (!tool?._id) return;
    setDataLoading(true);
    api(`/tools?category=${tool.category?._id || ""}&limit=4`)
      .then((data) => setSimilarTools((data.tools || []).filter((t) => t._id !== tool._id).slice(0, 3)))
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [tool?._id]);

  useEffect(() => {
    if (presetRange?.startDate) setStartDate(presetRange.startDate);
    if (presetRange?.endDate) setEndDate(presetRange.endDate);
  }, [presetRange]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission required", "Please allow media access.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
    if (!result.canceled) setEvidence(result.assets[0]);
  };

  const submitRequest = async () => {
    if (loading) return;
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const today = new Date();
    if (!s || isNaN(s.getTime())) return Alert.alert("Invalid date", "Please choose a valid start date.");
    if (!e || isNaN(e.getTime())) return Alert.alert("Invalid date", "Please choose a valid end date.");
    if (s > e) return Alert.alert("Invalid range", "Start date must be before end date.");
    if (s < new Date(today.toDateString())) return Alert.alert("Invalid date", "Start cannot be in the past.");

    setLoading(true);
    try {
      let mediaUpload;
      if (evidence) mediaUpload = await uploadMedia(evidence);
      const payload = {
        tool: tool._id,
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        requestNote: note,
        evidenceUrl: mediaUpload?.url || null,
        evidenceMedia: mediaUpload || null,
      };
      const result = await api("/borrow-requests", { method: "POST", body: JSON.stringify(payload) });
      if (mediaUpload?.url) {
        try {
          await api(`/messages/borrow-requests/${result.borrowRequest._id}`, {
            method: "POST",
            body: JSON.stringify({ body: note || `Requesting ${tool.name}.`, imageUrl: mediaUpload.url }),
          });
        } catch (_) {}
      }
      Alert.alert("Request Sent", "Your borrow request has been submitted for review.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const quickRange = (days) => {
    const s = new Date();
    const e = new Date(Date.now() + days * 86400000);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  };

  // Parse rules - could be a string (newline separated) or an object
  const parsedRules = typeof rules === "string" 
    ? rules.split("\n").filter(Boolean).map((r, i) => [`rule_${i + 1}`, r])
    : Object.entries(rules);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ─── Hero Gallery ─── */}
        <View style={{ position: "relative", width: "100%", height: 320, backgroundColor: "#f1f5f9" }}>
          <Image
            source={{ uri: resolveUrl(images[activeImageIndex]?.url) }}
            style={{ width: "100%", height: 320 }}
            resizeMode="cover"
          />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "rgba(0,0,0,0.3)" }} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: "absolute", top: 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {images.length > 1 && (
            <View style={{ position: "absolute", bottom: 16, right: 16, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{activeImageIndex + 1} / {images.length}</Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={{ position: "absolute", bottom: 16, alignSelf: "center", flexDirection: "row", gap: 6 }}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setActiveImageIndex(i)} style={{ width: activeImageIndex === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: activeImageIndex === i ? COLORS.card : "rgba(255,255,255,0.5)" }} />
              ))}
            </View>
          )}
        </View>

        {/* ─── Content ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
          {/* Main Info Card */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.navy, lineHeight: 28 }}>{tool?.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray }}>{tool?.category?.name || "Tool"}</Text>
                  </View>
                  <View style={{ width: 1, height: 12, backgroundColor: COLORS.border }} />
                  <Text style={{ fontSize: 11, color: COLORS.lightGray, textTransform: "capitalize" }}>{tool?.condition}</Text>
                </View>
              </View>
              {owner && <TrustBadge score={owner.trustPoints || 0} />}
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e8f7ef", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                <Ionicons name="wallet-outline" size={16} color={COLORS.green} />
                <Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.green }}>{tool?.depositPoints} pts escrow</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                <Ionicons name="time-outline" size={16} color={COLORS.blue} />
                <Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.blue }}>{tool?.maxBorrowDays || 7} days max</Text>
              </View>
            </View>
          </View>

          {/* ─── Owner Card ─── */}
          <TouchableOpacity
            onPress={() => owner?._id && setProfileModal({ visible: true, userId: owner._id })}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.navy, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {owner?.avatarUrl || owner?.profilePicture ? (
                <Image source={{ uri: resolveUrl(owner.avatarUrl || owner.profilePicture) }} style={{ width: 52, height: 52, borderRadius: 26 }} />
              ) : (
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>{(owner?.fullName || "U").charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.navy }}>{owner?.fullName || "Owner"}</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{owner?.trustPoints || 0} trust points</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Chat", { user: owner })} style={{ backgroundColor: COLORS.navy, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Message</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* ─── Description ─── */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Description</Text>
            <Text style={{ fontSize: 14, color: COLORS.navy, lineHeight: 22 }}>{tool?.description || "No description provided."}</Text>
          </View>

          {/* ─── Pickup Info ─── */}
          {tool?.pickupLocation && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Pickup Location</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="location-outline" size={18} color={COLORS.gray} />
                <Text style={{ fontSize: 14, color: COLORS.navy }}>{tool.pickupLocation}</Text>
              </View>
            </View>
          )}

          {tool?.availableWindows && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Available Pickup Windows</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                <Text style={{ fontSize: 14, color: COLORS.navy }}>{tool.availableWindows}</Text>
              </View>
            </View>
          )}

          {tool?.securityNotes && (
            <View style={{ backgroundColor: "#fffbeb", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#fcd34d" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.amber, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Security Notes</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.amber} />
                <Text style={{ fontSize: 14, color: "#92400e", lineHeight: 20 }}>{tool.securityNotes}</Text>
              </View>
            </View>
          )}

          {/* ─── Health Score ─── */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.7 }}>Health Score</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: healthColor }} />
                <Text style={{ fontSize: 18, fontWeight: "900", color: healthColor }}>{health}%</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ width: `${health}%`, height: 8, backgroundColor: healthColor, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: COLORS.lightGray }}>Poor</Text>
              <Text style={{ fontSize: 10, color: COLORS.lightGray, fontWeight: health > 60 ? "700" : "400" }}>Excellent</Text>
            </View>
          </View>

          {/* ─── Borrowing Rules ─── */}
          {parsedRules.length > 0 && (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>Borrowing Rules</Text>
              <RulesList rules={parsedRules} />
            </View>
          )}

          {/* ─── Borrow Form ─── */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.navy, marginBottom: 2 }}>Request to Borrow</Text>
            <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 16 }}>Select dates and submit your borrowing request</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[
                { label: "1 Day", days: 1 },
                { label: "3 Days", days: 3 },
                { label: "1 Week", days: 7 },
                { label: "2 Weeks", days: 14 },
              ].map((preset) => (
                <TouchableOpacity key={preset.days} onPress={() => quickRange(preset.days)} style={{ flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.navy }}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <TouchableOpacity onPress={() => setPickerField("start")} style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", marginBottom: 4 }}>Start Date</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 13, color: startDate ? COLORS.navy : COLORS.lightGray }}>{startDate || "Pick date"}</Text>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.lightGray} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPickerField("end")} style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", marginBottom: 4 }}>End Date</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 13, color: endDate ? COLORS.navy : COLORS.lightGray }}>{endDate || "Pick date"}</Text>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.lightGray} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", marginBottom: 4 }}>Note (optional)</Text>
              <TextInput style={{ backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: COLORS.navy, borderWidth: 1, borderColor: COLORS.border, minHeight: 60, textAlignVertical: "top" }} value={note} onChangeText={setNote} placeholder="Add any notes for the owner..." placeholderTextColor={COLORS.lightGray} multiline />
            </View>

            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity onPress={pickImage} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: evidence ? COLORS.green : COLORS.border, borderStyle: evidence ? "solid" : "dashed" }}>
                <Ionicons name={evidence ? "checkmark-circle" : "camera-outline"} size={20} color={evidence ? COLORS.green : COLORS.gray} />
                <Text style={{ fontSize: 13, color: evidence ? COLORS.green : COLORS.gray, fontWeight: "600" }}>{evidence ? "Evidence attached" : "Attach photo for ID verification"}</Text>
              </TouchableOpacity>
              {evidence && (
                <View style={{ position: "relative", marginTop: 10 }}>
                  <Image source={{ uri: evidence.uri }} style={{ width: "100%", height: 160, borderRadius: 12, backgroundColor: "#f1f5f9" }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setEvidence(null)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={submitRequest} disabled={loading} style={{ backgroundColor: COLORS.navy, paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="paper-plane" size={18} color="#fff" />}
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{loading ? "Submitting..." : "Submit Borrow Request"}</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Ratings ─── */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.navy, marginBottom: 10 }}>Ratings & Reviews</Text>
            <RatingsSection toolId={tool?._id} />
          </View>
        </View>

        {/* ─── Similar Tools ─── */}
        {similarTools.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.navy, marginBottom: 10 }}>Similar Tools</Text>
            {similarTools.map((t) => (
              <ToolCard key={t._id} tool={t} onPress={() => navigation.replace("ToolDetail", { tool: t })} />
            ))}
          </View>
        )}
      </ScrollView>

      {loading && <GlobalLoader fullScreen message="Submitting request..." />}
      <DateTimePickerModal isVisible={!!pickerField} mode="date" onConfirm={(date) => { const iso = date.toISOString().slice(0, 10); if (pickerField === "start") setStartDate(iso); else setEndDate(iso); setPickerField(null); }} onCancel={() => setPickerField(null)} />
      <ProfileCardModal
        visible={profileModal.visible}
        userId={profileModal.userId}
        onClose={() => setProfileModal({ visible: false, userId: null })}
        onMessage={(profile) => navigation.navigate("Chat", { user: profile })}
        onViewFullProfile={(profile) => navigation.navigate("Profile", { userId: profile._id })}
      />
    </SafeAreaView>
  );
}

/* ─── Rules List ─── */
function RulesList({ rules, maxItems = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rules : rules.slice(0, maxItems);

  return (
    <>
      {visible.map(([key, value], index) => {
        // If value is a string (rules stored as newline-separated text)
        if (typeof value === "string" && !key.startsWith("rule_")) {
          const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
          return (
            <View key={key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f8fafc" }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Ionicons name="information" size={14} color={COLORS.gray} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.gray }}>{label}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.navy }}>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</Text>
            </View>
          );
        }
        // If it's a plain string rule (from newline split)
        if (typeof value === "string" && key.startsWith("rule_")) {
          return (
            <View key={`rule-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f8fafc" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray, marginTop: 6, marginRight: 10 }} />
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.navy, lineHeight: 18 }}>{value}</Text>
            </View>
          );
        }
        // Boolean/object rules
        return (
          <View key={key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f8fafc" }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Ionicons name={typeof value === "boolean" ? (value ? "checkmark" : "close") : "information"} size={14} color={typeof value === "boolean" ? (value ? COLORS.green : COLORS.red) : COLORS.gray} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: COLORS.gray }}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.navy }}>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</Text>
          </View>
        );
      })}
      {rules.length > maxItems && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.blue} />
          <Text style={{ fontSize: 12, color: COLORS.blue, fontWeight: "700" }}>{expanded ? "Show less" : `Show all ${rules.length} rules`}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

/* ─── Ratings Section ─── */
function RatingsSection({ toolId }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toolId) return;
    api(`/ratings/tool/${toolId}`)
      .then((data) => setRatings(data.ratings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [toolId]);

  if (loading) return <View style={{ paddingVertical: 20, alignItems: "center" }}><ActivityIndicator size="small" color={COLORS.navy} /></View>;

  if (ratings.length === 0) {
    return (
      <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: COLORS.border }}>
        <Ionicons name="star-outline" size={40} color="#ded8cc" />
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.gray, marginTop: 8 }}>No ratings yet</Text>
        <Text style={{ fontSize: 12, color: COLORS.lightGray, marginTop: 4, textAlign: "center" }}>Be the first to borrow and rate this tool</Text>
      </View>
    );
  }

  const avg = (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1);

  return (
    <View style={{ backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((s) => (<Ionicons key={s} name="star" size={16} color={s <= Math.round(Number(avg)) ? COLORS.gold : "#e2e8f0"} />))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: COLORS.navy }}>{avg}</Text>
          <Text style={{ fontSize: 13, color: COLORS.gray }}>({ratings.length})</Text>
        </View>
      </View>
      <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
        {ratings.map((r, i) => (
          <View key={r._id} style={{ padding: 14, borderBottomWidth: i < ratings.length - 1 ? 1 : 0, borderBottomColor: COLORS.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#e8f7ef", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: COLORS.green }}>{(r.rater?.fullName || "N").charAt(0)}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.navy }}>{r.rater?.fullName || "Neighbor"}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 1 }}>
                {[1, 2, 3, 4, 5].map((s) => (<Ionicons key={s} name="star" size={12} color={s <= (r.rating || 0) ? COLORS.gold : "#e2e8f0"} />))}
              </View>
            </View>
            {r.review ? <Text style={{ fontSize: 13, color: COLORS.gray, lineHeight: 18 }}>{r.review}</Text> : null}
            {r.createdAt && <Text style={{ fontSize: 11, color: COLORS.lightGray, marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}