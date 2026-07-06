import React, { useEffect, useState } from "react";
import { Alert, Image, Modal, Text, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useAuth } from "../store/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import TrustBadge from "../components/TrustBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../store/ToastProvider";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(user || {});
  const [requests, setRequests] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [form, setForm] = useState({ avatarUrl: (user && user.avatarUrl) || "", bio: (user && user.bio) || "", phone: (user && user.phone) || "", address: (user && user.address) || "" });
  const [message, setMessage] = useState("");
  const [editVisible, setEditVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ idImageUrl: "", fullName: "", phone: "", address: "" });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [lifetimeStats, setLifetimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [profileData, requestData, toolsData, borrowData, statsData] = await Promise.all([
        api("/users/profile"),
        api("/communities/requests"),
        api("/tools?owner=me&limit=10"),
        api("/borrow-requests?filter=lent"),
        api("/trust-points/lifetime-stats").catch(() => ({ stats: null }))
      ]);
      
      setProfile(profileData.user);
      setMemberships(profileData.memberships || []);
      setRequests(requestData.requests);
      setMyListings(toolsData.tools || []);
      setActiveLoans(borrowData.requests || []);
      setLifetimeStats(statsData.stats);
      
      setForm({
        avatarUrl: profileData.user.avatarUrl || "",
        bio: profileData.user.bio || "",
        phone: profileData.user.phone || "",
        address: profileData.user.address || ""
      });
      setVerifyForm({
        idImageUrl: profileData.user.idImageUrl || "",
        fullName: profileData.user.fullName || "",
        phone: profileData.user.phone || "",
        address: profileData.user.address || ""
      });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
  }

  async function deleteTool(toolId) {
    Alert.alert("Delete Listing", "Are you sure you want to delete this tool?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/tools/" + toolId, { method: "DELETE" });
            showToast({ type: "success", title: "Deleted", message: "Tool deleted successfully." });
            await load();
          } catch (err) {
            showToast({ type: "error", title: "Error", message: err.message });
          }
        }
      }
    ]);
  }

  async function save() {
    try {
      const data = await api("/users/profile", { method: "PATCH", body: JSON.stringify(form) });
      setProfile(data.user);
      showToast({ type: "success", title: "Success", message: "Profile updated." });
      setEditVisible(false);
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function uploadVerifyID() {
    try {
      const uploaded = await pickAndUploadImage();
      if (uploaded) setVerifyForm({ ...verifyForm, idImageUrl: uploaded.url });
    } catch (err) {
      showToast({ type: "error", title: "Upload Failed", message: err.message });
    }
  }

  async function submitVerification() {
    if (!verifyForm.idImageUrl) return Alert.alert("Required", "Please upload your ID photo.");
    if (!verifyForm.fullName.trim()) return Alert.alert("Required", "Full name is required.");
    if (!verifyForm.phone.trim()) return Alert.alert("Required", "Phone number is required.");
    if (!verifyForm.address.trim()) return Alert.alert("Required", "Address is required.");

    setVerifySubmitting(true);
    try {
      const data = await api("/users/verify-id", {
        method: "POST",
        body: JSON.stringify(verifyForm)
      });
      setProfile(data.user);
      setVerifyVisible(false);
      showToast({ type: "success", title: "Submitted", message: "ID submitted for review." });
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function chooseAvatar() {
    try {
      const uploaded = await pickAndUploadImage();
      if (uploaded) {
        setForm({ ...form, avatarUrl: uploaded.url });
        showToast({ type: "info", title: "Photo Attached", message: "Save profile to apply changes." });
      }
    } catch (err) {
      showToast({ type: "error", title: "Upload Failed", message: err.message });
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  const activeBorrowCount = requests.filter((r) => ["approved", "picked_up", "overdue"].includes(r.status)).length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const ActionRow = ({ icon, title, onPress, badge, color = "#0b1f33" }) => (
    <TouchableOpacity 
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
      onPress={onPress}
    >
      <View style={{ width: 32 }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, color: color, fontWeight: "500" }}>{title}</Text>
      {badge > 0 && (
        <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#ffffff" }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0b1f33" colors={["#0b1f33"]} />}>
        
        {/* Banner & Avatar Section (Reddit Style) */}
        <View style={{ height: 100, backgroundColor: "#0b1f33", overflow: "hidden" }}>
          <View style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(148,115,61,0.15)" }} />
          <View style={{ position: "absolute", bottom: -30, left: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(148,115,61,0.1)" }} />
          <View style={{ position: "absolute", top: 10, left: "40%", width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.04)" }} />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: -40, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Image 
              source={{ uri: resolveUrl(profile.avatarUrl) || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" }} 
              style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#ffffff" }} 
            />
            <TouchableOpacity 
              style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0" }}
              onPress={() => setEditVisible(true)}
            >
              <Text style={{ color: "#0b1f33", fontWeight: "600", fontSize: 13 }}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>{profile.fullName}</Text>
              {profile.idVerified && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
            </View>
            <Text style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>{profile.email}</Text>
            {profile.bio ? <Text style={{ fontSize: 14, color: "#334155", marginTop: 8 }}>{profile.bio}</Text> : null}
          </View>
        </View>

        {/* Verification Banner */}
        {!profile.idVerified && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setVerifyVisible(true)}
              style={{ backgroundColor: profile.status === "rejected" ? "#fef2f2" : "#f8fafc", borderWidth: 1, borderColor: profile.status === "rejected" ? "#fca5a5" : "#e2e8f0", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Ionicons name={profile.status === "rejected" ? "close-circle" : profile.idImageUrl ? "time" : "shield-checkmark"} size={22} color={profile.status === "rejected" ? "#dc2626" : "#64748b"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: profile.status === "rejected" ? "#dc2626" : "#334155" }}>
                  {profile.status === "rejected" ? "Verification Rejected" : profile.idImageUrl ? "Verification Pending" : "Verify Identity"}
                </Text>
                <Text style={{ fontSize: 12, color: profile.status === "rejected" ? "#b91c1c" : "#64748b" }}>
                  {profile.status === "rejected" ? "Tap to re-submit your ID." : profile.idImageUrl ? "Under review by admin." : "Unlock all features by verifying."}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}



        {/* Karma/Stats Bar */}
        <View style={{ flexDirection: "row", paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f1f5f9", marginHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>{profile.trustPoints}</Text>
            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Trust Points</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#f1f5f9" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>{myListings.length}</Text>
            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Listings</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>{activeLoans.length}</Text>
            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Loans</Text>
          </View>
        </View>

        {/* Trust Badge under stats */}
        <View style={{ alignItems: "center", marginHorizontal: 20, marginBottom: 8 }}>
          <TrustBadge score={profile.trustPoints} size="sm" />
        </View>

        {/* Lifetime Stats */}
        {lifetimeStats && (
          <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f1f5f9" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Ionicons name="arrow-down-circle-outline" size={18} color="#059669" style={{ marginBottom: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>{lifetimeStats.totalBorrowed ?? 0}</Text>
              <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Borrowed</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Ionicons name="arrow-up-circle-outline" size={18} color="#3b82f6" style={{ marginBottom: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>{lifetimeStats.totalLent ?? 0}</Text>
              <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Lent</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Ionicons name="star-outline" size={18} color="#94733d" style={{ marginBottom: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>{lifetimeStats.avgRating != null ? lifetimeStats.avgRating.toFixed(1) : "--"}</Text>
              <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 }}>Avg Rating</Text>
            </View>
          </View>
        )}

        {/* Action List */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <ActionRow icon="swap-vertical" title="My Borrowings" onPress={() => navigation.navigate("Borrowings")} badge={activeBorrowCount} />
          <ActionRow icon="wallet" title="Trust Wallet" onPress={() => navigation.navigate("TrustWallet")} />
          <ActionRow icon="time" title="Activity History" onPress={() => navigation.navigate("ActivityHistory")} />
          <ActionRow icon="construct" title="Maintenance Charges" onPress={() => navigation.navigate("MaintenanceCost")} />
          <ActionRow icon="notifications" title="Notifications" onPress={() => navigation.navigate("Notifications")} badge={pendingRequests} />
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: 20 }}>
          
          {/* My Listings */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Ionicons name="layers-outline" size={18} color="#0f172a" />
            <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>My Listings</Text>
          </View>
          
          {loading ? (
            <SkeletonLoader variant="listItem" count={2} containerStyle={{ marginBottom: 10 }} />
          ) : (
            <>
              {myListings.map((tool) => (
                <TouchableOpacity key={tool._id} style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9" }} onPress={() => navigation.navigate("ToolDetail", { tool })}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 4 }}>{tool.name}</Text>
                      <Text style={{ fontSize: 13, color: "#64748b" }}>{tool.category?.name || "Tool"} • {tool.depositPoints} pts escrow</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10 }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                      onPress={(e) => { e.stopPropagation && e.stopPropagation(); navigation.navigate("AddTool", { tool }); }}
                    >
                      <Ionicons name="pencil-outline" size={14} color="#334155" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef2f2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                      onPress={(e) => { e.stopPropagation && e.stopPropagation(); deleteTool(tool._id); }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              {!myListings.length && !loading && (
                <View style={{ padding: 24, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 16 }}>
                  <Ionicons name="cube-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 14, color: "#64748b", fontWeight: "500" }}>No tools listed yet</Text>
                </View>
              )}
            </>
          )}

          {/* Active Loans */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 12 }}>
            <Ionicons name="sync-outline" size={18} color="#0f172a" />
            <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Active Loans</Text>
          </View>

          {loading ? (
            <SkeletonLoader variant="listItem" count={2} containerStyle={{ marginBottom: 10 }} />
          ) : (
            <>
              {activeLoans.map((loan) => (
                <TouchableOpacity key={loan._id} style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9" }} onPress={() => navigation.navigate("Chat", { request: loan })}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>{loan.tool?.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: loan.status === "overdue" ? "#ef4444" : "#059669", textTransform: "uppercase" }}>{loan.status}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Borrower: {loan.borrower?.fullName || "Unknown"}</Text>
                  <Text style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>{loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "--"} to {loan.endDate ? new Date(loan.endDate).toLocaleDateString() : "--"}</Text>
                  
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={{ backgroundColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }} onPress={() => navigation.navigate("Chat", { request: loan })}>
                      <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>Message</Text>
                    </TouchableOpacity>
                    {loan.status === "returned" && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#059669", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                        onPress={async (e) => {
                          e.stopPropagation && e.stopPropagation();
                          try {
                            await api(`/borrow-requests/${loan._id}/verify-return`, { method: "PATCH" });
                            showToast({ type: "success", title: "Done", message: "Return verified! Escrow released." });
                            await load();
                          } catch (err) {
                            showToast({ type: "error", title: "Error", message: err.message });
                          }
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Verify Return</Text>
                      </TouchableOpacity>
                    )}
                    {loan.status === "completed" && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#94733d", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                        onPress={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          navigation.navigate("Rating", {
                            borrowRequestId: loan._id,
                            toolName: loan.tool?.name || "",
                            ownerName: loan.borrower?.fullName || "Borrower",
                            type: "lender_to_borrower"
                          });
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Rate Borrower</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {!activeLoans.length && !loading && (
                <View style={{ padding: 24, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 16 }}>
                  <Ionicons name="folder-open-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 14, color: "#64748b", fontWeight: "500" }}>No active loans</Text>
                </View>
              )}
            </>
          )}

          {/* Communities */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 12 }}>
            <Ionicons name="planet-outline" size={18} color="#0f172a" />
            <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Communities</Text>
          </View>
          
          {memberships.map((item) => (
            <View style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: item.isDefault ? 4 : 0, borderLeftColor: "#3b82f6" }} key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: "600" }}>{item.community?.name}</Text>
                  {item.community?.location && <Text style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{item.community.location}</Text>}
                </View>
                {item.isDefault && <Text style={{ fontSize: 11, color: "#3b82f6", fontWeight: "700" }}>DEFAULT</Text>}
              </View>
            </View>
          ))}

          {/* Sign Out */}
          <TouchableOpacity style={{ marginTop: 32, paddingVertical: 14, alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 12 }} onPress={logout}>
            <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ID Verification Modal */}
      <Modal visible={verifyVisible} transparent animationType="slide" onRequestClose={() => setVerifyVisible(false)}>
        <View style={styles.modalShade}>
          <View style={styles.modalPanelTall}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { fontSize: 18, color: "#0f172a" }]}>Verify Your Account</Text>
              <TouchableOpacity onPress={() => setVerifyVisible(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#64748b", marginBottom: 16, fontSize: 14, lineHeight: 20 }}>
              Upload a valid government-issued ID and confirm your details for admin approval.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>ID Photo *</Text>
            {verifyForm.idImageUrl ? (
              <Image source={{ uri: resolveUrl(verifyForm.idImageUrl) }} style={{ width: "100%", height: 140, borderRadius: 10, marginBottom: 10, backgroundColor: "#f1f5f9" }} resizeMode="cover" />
            ) : (
              <View style={{ width: "100%", height: 100, borderRadius: 10, marginBottom: 10, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "dashed" }}>
                <Ionicons name="id-card-outline" size={32} color="#94a3b8" />
              </View>
            )}
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: "#e2e8f0", borderWidth: 1, marginBottom: 14 }]} onPress={uploadVerifyID} disabled={verifySubmitting}>
              <Text style={styles.secondaryButtonText}>{verifyForm.idImageUrl ? "Change ID Photo" : "Upload ID Photo"}</Text>
            </TouchableOpacity>

            <TextInput style={styles.input} value={verifyForm.fullName} onChangeText={(v) => setVerifyForm({ ...verifyForm, fullName: v })} placeholder="Full Name (as on ID)" editable={!verifySubmitting} />
            <TextInput style={[styles.input, { marginTop: 12 }]} value={verifyForm.phone} onChangeText={(v) => setVerifyForm({ ...verifyForm, phone: v })} placeholder="Phone Number" keyboardType="phone-pad" editable={!verifySubmitting} />
            <TextInput style={[styles.input, { marginTop: 12 }]} value={verifyForm.address} onChangeText={(v) => setVerifyForm({ ...verifyForm, address: v })} placeholder="Home Address" editable={!verifySubmitting} />

            <View style={{ marginTop: 24, gap: 12 }}>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#0f172a", opacity: verifySubmitting ? 0.6 : 1 }]} onPress={submitVerification} disabled={verifySubmitting}>
                {verifySubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Submit Verification</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalShade}>
          <View style={styles.modalPanelTall}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { fontSize: 18, color: "#0f172a" }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {form.avatarUrl && <Image source={{ uri: resolveUrl(form.avatarUrl) }} style={{ width: 80, height: 80, borderRadius: 40, alignSelf: "center", marginBottom: 16 }} />}

            <TouchableOpacity style={[styles.secondaryButton, { borderColor: "#e2e8f0", borderWidth: 1, marginBottom: 20 }]} onPress={chooseAvatar}>
              <Text style={styles.secondaryButtonText}>{form.avatarUrl ? "Change avatar" : "Upload avatar"}</Text>
            </TouchableOpacity>

            <TextInput style={[styles.input, styles.textArea, { minHeight: 80, marginBottom: 12 }]} value={form.bio} onChangeText={(value) => setForm({ ...form, bio: value })} placeholder="Write a short bio..." multiline />
            <TextInput style={[styles.input, { marginBottom: 12 }]} value={form.phone} onChangeText={(value) => setForm({ ...form, phone: value })} placeholder="Phone number" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={form.address} onChangeText={(value) => setForm({ ...form, address: value })} placeholder="Address" />

            <View style={{ marginTop: 24, gap: 12 }}>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#0f172a" }]} onPress={save}>
                <Text style={styles.primaryButtonText}>Save Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}