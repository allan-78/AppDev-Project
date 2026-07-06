import React, { useEffect, useState } from "react";
import { Image, Modal, Text, TextInput, TouchableOpacity, View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ChatScreen from "./ChatScreen";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useAuth } from "../store/AuthProvider";
import { useToast } from "../store/ToastProvider";
import { Ionicons } from "@expo/vector-icons";
import SkeletonLoader from "../components/SkeletonLoader";
import ProfileCardModal from "../components/ProfileCardModal";

function getStatusColor(status) {
  switch (status) {
    case "overdue": return "#ef4444";
    case "pending_maintenance": return "#f59e0b";
    case "completed": return "#059669";
    case "approved": return "#3b82f6";
    case "picked_up": return "#8b5cf6";
    case "returned": return "#059669";
    case "admin_review": return "#f59e0b";
    case "verified": return "#3b82f6";
    case "rejected": return "#ef4444";
    case "disputed": return "#ef4444";
    case "pending": return "#f59e0b";
    default: return "#64748b";
  }
}

function getDaysRemaining(endDate) {
  if (!endDate) return null;
  const now = new Date();
  const due = new Date(endDate);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function isCurrentUserBorrower(row, currentUserId) {
  if (!row.borrower) return false;
  const borrowerId = row.borrower._id || row.borrower;
  return String(borrowerId) === String(currentUserId);
}

function isCurrentUserLender(row, currentUserId) {
  if (!row.owner) return false;
  const ownerId = row.owner._id || row.owner;
  return String(ownerId) === String(currentUserId);
}

function getStatusDescription(row, isLender) {
  const otherName = isLender ? (row.borrower?.fullName || "Borrower") : (row.owner?.fullName || "Lender");
  switch (row.status) {
    case "admin_review":
    case "requested":
    case "pending":
      return isLender
        ? "Waiting for admin verification. (Admins can approve directly)"
        : "Your request is currently being verified by an admin.";
    case "verified":
      return isLender
        ? "Verification passed! Please review and approve or reject this request."
        : "Admin verified! Waiting for the lender to approve the request.";
    case "approved":
      return isLender
        ? `Approved! Waiting for ${otherName} to confirm pickup.`
        : "Lender approved! Please collect the item and Confirm Pickup.";
    case "picked_up":
      return isLender
        ? `${otherName} is currently using the item.`
        : "Item in use. Remember to return it on time and Confirm Return.";
    case "returned":
      return isLender
        ? `${otherName} returned the item. Please inspect and Verify Return.`
        : "Return submitted. Waiting for the lender to verify item condition.";
    case "overdue":
      return isLender
        ? `OVERDUE! ${otherName} has not returned the item on time.`
        : "OVERDUE! Return the item immediately to avoid trust point penalties.";
    case "completed":
      return "Transaction completed! Escrow settled. Don't forget to Rate!";
    case "rejected":
      return "Request was rejected. Any locked points were returned.";
    case "disputed":
      return "Dispute raised. Admin is currently reviewing details.";
    case "cancelled":
      return "Request cancelled.";
    default:
      return "Status update pending.";
  }
}

export default function BorrowingsScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [chatRequest, setChatRequest] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ type: "late_return", description: "", evidenceUrl: "" });
  const [returnModal, setReturnModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState(null);

  async function load(isRefresh) {
    if (isRefresh) setRefreshing(true);
    setLoading(true);
    try {
      let url = "/borrow-requests";
      if (filter === "borrowed") url += "?filter=borrowed";
      else if (filter === "lent") url += "?filter=lent";
      const data = await api(url);
      setRequests(data.requests || []);
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  useEffect(() => { load().catch(console.error); }, [filter]);

  async function pickup(row) {
    try {
      await api(`/borrow-requests/${row._id}/pickup`, {
        method: "PATCH",
        body: JSON.stringify({ pickupChecklist: { safetyConfirmed: true, cleanConfirmed: true, notes: "Confirmed at pickup." } })
      });
      showToast({ type: "success", title: "Done", message: "Pickup confirmed!" });
      if (detailModal?._id === row._id) setDetailModal(null);
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function returnTool(row) {
    setReturnModal(row);
  }

  async function submitReturn(row, photoUrl) {
    try {
      const result = await api(`/borrow-requests/${row._id}/return`, {
        method: "PATCH",
        body: JSON.stringify({ returnChecklist: { safetyConfirmed: true, cleanConfirmed: true, notes: "Returned with photo.", photoEvidenceUrl: photoUrl } })
      });
      showToast({ type: "success", title: "Done", message: result.message || "Return submitted — awaiting owner verification." });
      setReturnModal(null);
      if (detailModal?._id === row._id) setDetailModal(null);
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function verifyReturn(row) {
    try {
      await api(`/borrow-requests/${row._id}/verify-return`, { method: "PATCH" });
      showToast({ type: "success", title: "Done", message: "Return verified! Escrow released." });
      if (detailModal?._id === row._id) setDetailModal(null);
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function decideRequest(row, decision) {
    try {
      await api(`/borrow-requests/${row._id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision })
      });
      showToast({ type: "success", title: "Done", message: `Request has been ${decision}!` });
      if (detailModal?._id === row._id) setDetailModal(null);
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function fileComplaint() {
    try {
      await api(`/borrow-requests/${complaint._id}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          type: complaintForm.type,
          description: complaintForm.description,
          evidenceUrls: complaintForm.evidenceUrl ? [complaintForm.evidenceUrl] : []
        })
      });
      showToast({ type: "success", title: "Done", message: "Complaint filed for admin review." });
      setComplaint(null);
      setComplaintForm({ type: "late_return", description: "", evidenceUrl: "" });
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function chooseEvidence() {
    try {
      setMessage("Uploading evidence...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setComplaintForm({ ...complaintForm, evidenceUrl: uploaded.url });
      if (uploaded) showToast({ type: "success", title: "Done", message: "Evidence attached." });
      setMessage("");
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  }

  // Stats
  const activeCount = requests.filter(r => ["approved", "picked_up"].includes(r.status)).length;
  const overdueCount = requests.filter(r => r.status === "overdue").length;
  const completedCount = requests.filter(r => r.status === "completed").length;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.contentInner, { paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#0b1f33"]} />
        }
      >
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33" }}>Borrowing</Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Track, return, and rate your borrowings</Text>
        </View>

        {/* Summary Cards */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons name="swap-horizontal" size={14} color="#3b82f6" />
              <Text style={{ fontSize: 9, color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Active</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0b1f33" }}>{activeCount}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons name="alert-circle" size={14} color="#ef4444" />
              <Text style={{ fontSize: 9, color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Overdue</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: overdueCount > 0 ? "#ef4444" : "#0b1f33" }}>{overdueCount}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={{ fontSize: 9, color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Completed</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0b1f33" }}>{completedCount}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { key: "all", label: `All (${requests.length})`, icon: "list" },
            { key: "borrowed", label: "Borrowed", icon: "arrow-down" },
            { key: "lent", label: "Lent Out", icon: "arrow-up" }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1,
                backgroundColor: filter === tab.key ? "#0b1f33" : "#ffffff",
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: filter === tab.key ? "#0b1f33" : "#e2e8f0",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
              onPress={() => setFilter(tab.key)}
            >
              <Ionicons name={tab.icon} size={14} color={filter === tab.key ? "#fff" : "#64748b"} />
              <Text style={{ color: filter === tab.key ? "#fff" : "#64748b", fontSize: 12, fontWeight: "700" }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {message ? (
          <View style={{ backgroundColor: message.includes("error") || message.includes("Failed") ? "#fef2f2" : "#e8f7ef", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: message.includes("error") ? "#fecaca" : "#a7f3d0" }}>
            <Text style={{ color: message.includes("error") ? "#ef4444" : "#059669", fontWeight: "600", fontSize: 13 }}>{message}</Text>
          </View>
        ) : null}

        {loading && requests.length === 0 ? (
          <SkeletonLoader variant="card" count={4} containerStyle={{ marginBottom: 12 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 50, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f7f4ed", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name={filter === "borrowed" ? "arrow-down-circle-outline" : filter === "lent" ? "arrow-up-circle-outline" : "cube-outline"} size={36} color="#94733d" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#0b1f33", marginBottom: 6 }}>No borrowings yet</Text>
            <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginHorizontal: 24, lineHeight: 18 }}>
              {filter === "borrowed" ? "Browse tools and make your first request!" : filter === "lent" ? "List tools to start lending!" : "Your borrowing history will appear here"}
            </Text>
          </View>
        ) : (
          requests.map((row) => {
            const currentUserId = user?.id || user?._id;
            const borrower = isCurrentUserBorrower(row, currentUserId);
            const lender = isCurrentUserLender(row, currentUserId);
            const statusColor = getStatusColor(row.status);
            const daysLeft = getDaysRemaining(row.endDate);
            const isOverdue = daysLeft !== null && daysLeft < 0;
            const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
            const otherUser = borrower ? row.owner : row.borrower;

            return (
              <TouchableOpacity
                key={row._id}
                activeOpacity={0.95}
                onPress={() => setDetailModal(row)}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  marginBottom: 14,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#e2e8f0",
                  shadowColor: "#0b1f33",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3
                }}
              >
                {/* Tool Image */}
                {row.tool && row.tool.images && row.tool.images[0] ? (
                  <Image
                    source={{ uri: resolveUrl(row.tool.images[0].url) }}
                    style={{ width: "100%", height: 140, backgroundColor: "#f1f5f9" }}
                  />
                ) : (
                  <View style={{ width: "100%", height: 100, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="construct-outline" size={40} color="#cbd5e1" />
                  </View>
                )}

                {/* Status Badge Overlay */}
                <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: statusColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{row.status}</Text>
                </View>

                {/* Days Remaining Badge */}
                {daysLeft !== null && borrower && (
                  <View style={{
                    position: "absolute", top: 10, right: 10,
                    backgroundColor: isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#0b1f33",
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20
                  }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                      {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                    </Text>
                  </View>
                )}

                {/* Content */}
                <View style={{ padding: 16 }}>
                  {/* Tool Name & Person */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#0b1f33", marginBottom: 2 }}>{row.tool ? row.tool.name : "Unknown Tool"}</Text>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={() => {
                          if (otherUser?._id) {
                            setProfileModalUserId(otherUser._id);
                            setProfileModalVisible(true);
                          }
                        }}
                      >
                        <Ionicons name="person-outline" size={12} color="#3b82f6" />
                        <Text style={{ fontSize: 12, color: "#3b82f6", fontWeight: "600" }}>
                          {lender ? (row.borrower ? row.borrower.fullName : "Unknown") : (row.owner ? row.owner.fullName : "Unknown")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Status Instructions */}
                  <View style={{ backgroundColor: "#eff6ff", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#bfdbfe" }}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Ionicons name="information-circle" size={16} color="#3b82f6" />
                      <Text style={{ fontSize: 12, color: "#1e3a8a", flex: 1, lineHeight: 18 }}>
                        {getStatusDescription(row, lender)}
                      </Text>
                    </View>
                  </View>

                  {/* Date Info */}
                  <View style={{ backgroundColor: "#f7f4ed", padding: 12, borderRadius: 10, marginBottom: 10 }}>
                    {row.startDate ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={{ fontSize: 12, color: "#475569" }}>Started: {new Date(row.startDate).toLocaleDateString()}</Text>
                      </View>
                    ) : null}
                    {row.endDate ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="calendar-outline" size={14} color={isOverdue ? "#ef4444" : "#475569"} />
                        <Text style={{ fontSize: 12, color: isOverdue ? "#ef4444" : "#475569", fontWeight: isOverdue ? "700" : "400" }}>
                          Due: {new Date(row.endDate).toLocaleDateString()}
                        </Text>
                      </View>
                    ) : null}
                    {row.returnedAt ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={{ fontSize: 12, color: "#059669" }}>Returned: {new Date(row.returnedAt).toLocaleDateString()}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Escrow & Priority */}
                  <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e8f7ef", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Ionicons name="wallet-outline" size={12} color="#059669" />
                      <Text style={{ fontSize: 11, color: "#059669", fontWeight: "700" }}>{row.escrowPoints} pts</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Ionicons name="trending-up" size={12} color="#64748b" />
                      <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700" }}>Priority: {row.priorityScore}</Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <TouchableOpacity
                      style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                      onPress={() => setDetailModal(row)}
                    >
                      <Ionicons name="eye-outline" size={12} color="#0b1f33" />
                      <Text style={{ color: "#0b1f33", fontSize: 11, fontWeight: "700" }}>Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: "#3b82f6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                      onPress={() => setChatRequest(row)}
                    >
                      <Ionicons name="chatbubble-outline" size={12} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Message</Text>
                    </TouchableOpacity>

                    {lender && (row.status === "verified" || (["admin_review", "requested", "pending"].includes(row.status) && ["admin", "superAdmin"].includes(user?.role))) && (
                      <>
                        <TouchableOpacity
                          style={{ backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                          onPress={(e) => { e.stopPropagation && e.stopPropagation(); decideRequest(row, "approved"); }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={12} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: "#ef4444", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                          onPress={(e) => { e.stopPropagation && e.stopPropagation(); decideRequest(row, "rejected"); }}
                        >
                          <Ionicons name="close-circle-outline" size={12} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {borrower && row.status === "approved" && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={(e) => { e.stopPropagation && e.stopPropagation(); pickup(row); }}
                      >
                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Pickup</Text>
                      </TouchableOpacity>
                    )}

                    {borrower && (row.status === "picked_up" || row.status === "overdue") && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#f59e0b", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={(e) => { e.stopPropagation && e.stopPropagation(); returnTool(row); }}
                      >
                        <Ionicons name="return-up-back" size={12} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Return</Text>
                      </TouchableOpacity>
                    )}

                    {lender && row.status === "returned" && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={(e) => { e.stopPropagation && e.stopPropagation(); verifyReturn(row); }}
                      >
                        <Ionicons name="shield-checkmark" size={12} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Verify Return</Text>
                      </TouchableOpacity>
                    )}

                    {row.status === "completed" && (
                      <TouchableOpacity
                        style={{ backgroundColor: "#94733d", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          navigation.navigate("Rating", {
                            borrowRequestId: row._id,
                            toolName: row.tool?.name || "",
                            ownerName: borrower ? (row.owner?.fullName || "Lender") : (row.borrower?.fullName || "Borrower"),
                            type: borrower ? "borrower_to_lender" : "lender_to_borrower"
                          });
                        }}
                      >
                        <Ionicons name="star" size={12} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Rate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Detail Modal */}
        <Modal visible={!!detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(null)}>
          <View style={styles.modalShade}>
            <ScrollView style={{ maxHeight: "90%", width: "100%" }} contentContainerStyle={{ padding: 12 }}>
              <View style={[styles.modalPanel, { padding: 0, overflow: "hidden", borderRadius: 20 }]}>
                {detailModal && (() => {
                  const row = detailModal;
                  const currentUserId = user?.id || user?._id;
                  const borrower = isCurrentUserBorrower(row, currentUserId);
                  const lender = isCurrentUserLender(row, currentUserId);
                  const statusColor = getStatusColor(row.status);
                  const daysLeft = getDaysRemaining(row.endDate);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
                  const otherUser = borrower ? row.owner : row.borrower;

                  return (
                    <>
                      {/* Hero */}
                      {row.tool?.images?.[0] ? (
                        <Image source={{ uri: resolveUrl(row.tool.images[0].url) }} style={{ width: "100%", height: 180, backgroundColor: "#f1f5f9" }} />
                      ) : (
                        <View style={{ width: "100%", height: 120, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="construct-outline" size={48} color="#cbd5e1" />
                        </View>
                      )}

                      <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", gap: 6 }}>
                        <View style={{ backgroundColor: statusColor, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>{row.status}</Text>
                        </View>
                        {daysLeft !== null && (
                          <View style={{ backgroundColor: isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#0b1f33", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                              {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ padding: 16 }}>
                        {/* Tool Name */}
                        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0b1f33", marginBottom: 4 }}>{row.tool?.name || "Unknown Tool"}</Text>
                        <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{row.tool?.category?.name}</Text>

                        {/* Other User Card */}
                        {otherUser && (
                          <TouchableOpacity
                            style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f7f4ed", padding: 12, borderRadius: 12, marginBottom: 16 }}
                            onPress={() => { setDetailModal(null); setProfileModalUserId(otherUser._id); setProfileModalVisible(true); }}
                          >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{(otherUser.fullName || "U").charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{otherUser.fullName}</Text>
                              <Text style={{ fontSize: 11, color: "#64748b" }}>{borrower ? "Lender" : "Borrower"} · {otherUser.trustPoints || 0} pts</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                          </TouchableOpacity>
                        )}

                        {/* Status Instructions */}
                        <View style={{ backgroundColor: "#eff6ff", padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "#bfdbfe" }}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <Ionicons name="information-circle" size={18} color="#3b82f6" />
                            <Text style={{ fontSize: 13, color: "#1e3a8a", flex: 1, lineHeight: 18, fontWeight: "500" }}>
                              {getStatusDescription(row, lender)}
                            </Text>
                          </View>
                        </View>

                        {/* Dates Info */}
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                          <View style={{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 10, padding: 12 }}>
                            <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", marginBottom: 2 }}>Start</Text>
                            <Text style={{ fontSize: 13, color: "#0b1f33", fontWeight: "600" }}>{row.startDate ? new Date(row.startDate).toLocaleDateString() : "N/A"}</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 10, padding: 12 }}>
                            <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", marginBottom: 2 }}>End</Text>
                            <Text style={{ fontSize: 13, color: isOverdue ? "#ef4444" : "#0b1f33", fontWeight: "600" }}>{row.endDate ? new Date(row.endDate).toLocaleDateString() : "N/A"}</Text>
                          </View>
                        </View>

                        {/* Escrow & Priority Row */}
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e8f7ef", padding: 10, borderRadius: 10, flex: 1 }}>
                            <Ionicons name="wallet-outline" size={18} color="#059669" />
                            <View>
                              <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Escrow</Text>
                              <Text style={{ fontSize: 14, color: "#059669", fontWeight: "800" }}>{row.escrowPoints} pts</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f1f5f9", padding: 10, borderRadius: 10, flex: 1 }}>
                            <Ionicons name="trending-up" size={18} color="#64748b" />
                            <View>
                              <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Priority</Text>
                              <Text style={{ fontSize: 14, color: "#0b1f33", fontWeight: "800" }}>{row.priorityScore}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Request Note */}
                        {row.requestNote ? (
                          <View style={{ backgroundColor: "#f7f4ed", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                            <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>Request Note</Text>
                            <Text style={{ fontSize: 12, color: "#475569", lineHeight: 16 }}>{row.requestNote}</Text>
                          </View>
                        ) : null}

                        {/* Evidence */}
                        {(row.initialEvidenceUrl || row.initialEvidenceMedia?.url) && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>Evidence Photo</Text>
                            <Image source={{ uri: resolveUrl(row.initialEvidenceUrl || row.initialEvidenceMedia?.url) }} style={{ width: "100%", height: 160, borderRadius: 10, backgroundColor: "#f1f5f9" }} />
                          </View>
                        )}

                        {/* Action Buttons */}
                        <View style={{ gap: 8, marginTop: 4 }}>
                          {lender && (row.status === "verified" || (["admin_review", "requested", "pending"].includes(row.status) && ["admin", "superAdmin"].includes(user?.role))) && (
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: "#059669", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                                onPress={() => { decideRequest(row, "approved"); }}
                              >
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: "#ef4444", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                                onPress={() => { decideRequest(row, "rejected"); }}
                              >
                                <Ionicons name="close-circle" size={20} color="#fff" />
                                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          {borrower && row.status === "approved" && (
                            <TouchableOpacity
                              style={{ backgroundColor: "#059669", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                              onPress={() => { pickup(row); }}
                            >
                              <Ionicons name="checkmark-circle" size={20} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Confirm Pickup</Text>
                            </TouchableOpacity>
                          )}
                          {borrower && (row.status === "picked_up" || row.status === "overdue") && (
                            <TouchableOpacity
                              style={{ backgroundColor: "#f59e0b", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                              onPress={() => { setDetailModal(null); returnTool(row); }}
                            >
                              <Ionicons name="return-up-back" size={20} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Return Item</Text>
                            </TouchableOpacity>
                          )}
                          {lender && row.status === "returned" && (
                            <TouchableOpacity
                              style={{ backgroundColor: "#059669", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                              onPress={() => { verifyReturn(row); }}
                            >
                              <Ionicons name="shield-checkmark" size={20} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Verify Return</Text>
                            </TouchableOpacity>
                          )}
                          {borrower && row.status === "returned" && (
                            <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" }}>
                              <Text style={{ color: "#1e40af", fontSize: 13, fontWeight: "600" }}>Awaiting Lender Return Verification</Text>
                            </View>
                          )}
                          {row.status === "completed" && (
                            <TouchableOpacity
                              style={{ backgroundColor: "#94733d", paddingVertical: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                              onPress={() => {
                                setDetailModal(null);
                                navigation.navigate("Rating", {
                                  borrowRequestId: row._id,
                                  toolName: row.tool?.name || "",
                                  ownerName: borrower ? (row.owner?.fullName || "Lender") : (row.borrower?.fullName || "Borrower"),
                                  type: borrower ? "borrower_to_lender" : "lender_to_borrower"
                                });
                              }}
                            >
                              <Ionicons name="star" size={20} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Rate & Review</Text>
                            </TouchableOpacity>
                          )}
                         {(row.status === "picked_up" || row.status === "overdue" || row.status === "completed" || row.status === "returned") && (
                            <TouchableOpacity
                              style={{ backgroundColor: "#ef4444", paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                              onPress={() => { setDetailModal(null); setComplaint(row); }}
                            >
                              <Ionicons name="alert-circle" size={18} color="#fff" />
                              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Report Issue</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={{ alignItems: "center", paddingVertical: 10 }} onPress={() => setDetailModal(null)}>
                            <Text style={{ color: "#64748b", fontWeight: "600", fontSize: 13 }}>Close</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Chat Modal */}
        <Modal visible={!!chatRequest} transparent animationType="slide">
          <View style={styles.modalShade}>
            {chatRequest ? <ChatScreen request={chatRequest} onClose={() => setChatRequest(null)} /> : null}
          </View>
        </Modal>

        {/* Complaint Modal */}
        <Modal visible={!!complaint} transparent animationType="slide">
          <View style={styles.modalShade}>
            <View style={styles.modalPanel}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0b1f33" }}>Report Issue</Text>
                <TouchableOpacity onPress={() => setComplaint(null)}>
                  <Ionicons name="close" size={24} color="#0b1f33" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>{complaint?.tool?.name || ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {["late_return", "damage", "missing_item", "other"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: complaintForm.type === type ? "#ef4444" : "#f1f5f9" }}
                    onPress={() => setComplaintForm({ ...complaintForm, type })}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: complaintForm.type === type ? "#fff" : "#64748b", textTransform: "capitalize" }}>
                      {type.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, fontSize: 13, minHeight: 100, textAlignVertical: "top", marginBottom: 12 }}
                value={complaintForm.description}
                onChangeText={(value) => setComplaintForm({ ...complaintForm, description: value })}
                placeholder="Describe what happened..."
                multiline
              />
              {complaintForm.evidenceUrl ? (
                <Image source={{ uri: complaintForm.evidenceUrl }} style={{ width: "100%", height: 120, borderRadius: 8, marginBottom: 8 }} />
              ) : null}
              <TouchableOpacity style={{ padding: 10, backgroundColor: "#f1f5f9", borderRadius: 8, alignItems: "center", marginBottom: 12 }} onPress={chooseEvidence}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>
                  {complaintForm.evidenceUrl ? "Change Photo" : "Add Photo Evidence"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: "#ef4444", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 8 }} onPress={fileComplaint}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Submit Report</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setComplaint(null)} style={{ alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Return Modal */}
        <Modal visible={!!returnModal} transparent animationType="slide">
          <View style={styles.modalShade}>
            <View style={styles.modalPanel}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0b1f33" }}>Return Item</Text>
                <TouchableOpacity onPress={() => setReturnModal(null)}>
                  <Ionicons name="close" size={24} color="#0b1f33" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Returning: {returnModal?.tool?.name || ""}</Text>
              <View style={{ backgroundColor: "#f7f4ed", padding: 12, borderRadius: 10, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Take a photo of the item as proof of return</Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>The owner will verify the condition before releasing escrow.</Text>
              </View>
              {returnModal?.returnChecklist?.photoEvidenceUrl ? (
                <Image source={{ uri: returnModal.returnChecklist.photoEvidenceUrl }} style={{ width: "100%", height: 160, borderRadius: 10, marginBottom: 12 }} />
              ) : null}
              <TouchableOpacity
                style={{ backgroundColor: "#0b1f33", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 8 }}
                onPress={async () => {
                  try {
                    const uploaded = await pickAndUploadImage();
                    if (uploaded) await submitReturn(returnModal, uploaded.url);
                  } catch (err) { showToast({ type: "error", title: "Error", message: err.message }); }
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Take Photo & Submit Return</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReturnModal(null)} style={{ alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Profile Card Modal */}
        <ProfileCardModal
          visible={profileModalVisible}
          userId={profileModalUserId}
          onClose={() => { setProfileModalVisible(false); setProfileModalUserId(null); }}
          onMessage={(profile) => navigation.navigate("Chat", { user: profile })}
          onViewFullProfile={(profile) => { navigation.navigate("Profile", { userId: profile._id }); }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}