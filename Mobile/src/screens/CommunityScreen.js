import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Text, TextInput, TouchableOpacity, View, ScrollView, Alert } from "react-native";
import { resolveUrl, api } from "../api/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/styles";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useAuth } from "../store/AuthProvider";
import { useToast } from "../store/ToastProvider";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CommunityFeed from "../components/CommunityFeed";
import PostComposer from "../components/PostComposer";
import CommunityDiscovery from "../components/CommunityDiscovery";
import JoinCommunityModal from "../components/JoinCommunityModal";
import PostDiscussionModal from "../components/community/PostDiscussionModal";
import SkeletonLoader from "../components/SkeletonLoader";

const communityTypes = ["Education", "Home", "Garden", "Sports", "Faith", "Business", "Safety", "Other"];
const sortOptions = [
  { key: "new", label: "New", icon: "time-outline" },
  { key: "top", label: "Top", icon: "trending-up-outline" },
  { key: "hot", label: "Hot", icon: "flame-outline" },
];

export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedCommunityFilter, setSelectedCommunityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("new");

  const [request, setRequest] = useState({
    name: "",
    type: "Education",
    location: "",
    description: "",
    residentIdMedia: null,
  });

  const [selectedPost, setSelectedPost] = useState(null);
  const [discussModalVisible, setDiscussModalVisible] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation();

  async function load() {
    setLoading(true);
    try {
      const [postData, requestData, joinReqData, discoverData] = await Promise.all([
        api("/communities/feed"),
        api("/communities/requests"),
        api("/communities/join-requests"),
        api(`/communities/discover${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      ]);
      setPosts(postData.posts || []);
      setRequests(requestData.requests || []);
      setJoinRequests(joinReqData.requests || []);
      setCommunities(discoverData.communities || []);
    } catch (err) {
      setMessage(err?.message || "Failed to load community feed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const myCommunities = useMemo(() => {
    return communities.filter((c) => c.membershipStatus === "active" || c.isDefault);
  }, [communities]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (selectedCommunityFilter !== "all") {
      result = result.filter((p) => p.community?._id === selectedCommunityFilter);
    }
    if (sortBy === "new") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "top") {
      result.sort((a, b) => ((b.upvotes?.length || 0) - (b.downvotes?.length || 0)) - ((a.upvotes?.length || 0) - (a.downvotes?.length || 0)));
    } else if (sortBy === "hot") {
      result.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }
    return result;
  }, [posts, selectedCommunityFilter, sortBy]);

  const startDM = async (userId) => {
    try {
      const d = await api(`/messages/dm/thread/${userId}`, { method: "POST" });
      const thread = d.thread;
      const other = (thread.participants || []).find((p) => p._id !== user._id);
      navigation.navigate("Chat", { dm: { threadId: thread._id, otherUser: other } });
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleJoin = (communityId) => {
    setJoinModalVisible(true);
  };

  const handleUpvote = async (postId) => {
    try {
      const data = await api(`/communities/posts/${postId}/upvote`, { method: "POST" });
      setPosts(posts.map((p) => p._id === postId ? { ...p, upvotes: data.hasUpvoted ? [...(p.upvotes || []), user._id] : (p.upvotes || []).filter((id) => id !== user._id), downvotes: (p.downvotes || []).filter((id) => id !== user._id) } : p));
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleDownvote = async (postId) => {
    try {
      const data = await api(`/communities/posts/${postId}/downvote`, { method: "POST" });
      setPosts(posts.map((p) => p._id === postId ? { ...p, downvotes: data.hasDownvoted ? [...(p.downvotes || []), user._id] : (p.downvotes || []).filter((id) => id !== user._id), upvotes: (p.upvotes || []).filter((id) => id !== user._id) } : p));
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  };

  const requestCommunity = async () => {
    if (!request.name.trim()) return Alert.alert("Required", "Community name is required.");
    if (!request.location.trim()) return Alert.alert("Required", "Location is required.");
    if (!request.residentIdMedia?.url) return Alert.alert("Required ID", "Please upload a valid Resident ID photo to verify address.");
    if ((user.trustPoints || 0) < 50) return Alert.alert("Insufficient Trust", "You need at least 50 trust points to request a new community.");

    try {
      await api("/communities/requests", { method: "POST", body: JSON.stringify(request) });
      setRequest({ name: "", type: "Education", location: "", description: "", residentIdMedia: null });
      showToast({ type: "success", title: "Submitted", message: "Community request sent for admin review." });
      setShowCreate(false);
      load();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    }
  };

  const uploadResidentCommunityID = async () => {
    try {
      const uploaded = await pickAndUploadImage();
      if (uploaded) setRequest({ ...request, residentIdMedia: uploaded });
    } catch (err) {
      showToast({ type: "error", title: "Upload Failed", message: err.message });
    }
  };

  const approved = requests.filter((item) => item.status === "approved");

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0b1f33", lineHeight: 26 }}>Community</Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Neighborhood sharing & discussions</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={{ backgroundColor: "#f1f5f9", padding: 10, borderRadius: 10 }} onPress={() => navigation.navigate("ChatThreads")}>
              <Ionicons name="chatbubbles-outline" size={20} color="#0b1f33" />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: "#0b1f33", padding: 10, borderRadius: 10 }} onPress={() => setJoinModalVisible(true)}>
              <Ionicons name="people-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: "#f1f5f9", padding: 10, borderRadius: 10 }} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={20} color="#0b1f33" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#f7f4ed", padding: 4, borderRadius: 12 }}>
          {[
            { key: "feed", label: "Feed", icon: "newspaper-outline" },
            { key: "discover", label: "Discover", icon: "compass-outline" },
            { key: "requests", label: "My Requests", icon: "clipboard-outline" },
          ].map((tab) => (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: activeTab === tab.key ? "#fff" : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, shadowColor: activeTab === tab.key ? "#000" : "transparent", shadowOpacity: activeTab === tab.key ? 0.06 : 0, shadowRadius: activeTab === tab.key ? 4 : 0, elevation: activeTab === tab.key ? 2 : 0 }}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? "#0b1f33" : "#94a3b8"} />
              <Text style={{ fontSize: 12, fontWeight: activeTab === tab.key ? "800" : "600", color: activeTab === tab.key ? "#0b1f33" : "#94a3b8" }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {message ? (
          <View style={{ backgroundColor: "#fef2f2", padding: 10, borderRadius: 8, margin: 12, borderWidth: 1, borderColor: "#fecaca" }}>
            <Text style={{ color: "#ef4444", fontSize: 12 }}>{message}</Text>
          </View>
        ) : null}

        {/* Feed Tab */}
        {activeTab === "feed" && (
          <>
            {/* Post Composer Bar */}
            <TouchableOpacity style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", gap: 10 }} onPress={() => setComposerVisible(true)} activeOpacity={0.7}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="create-outline" size={20} color="#fff" />
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 14, flex: 1 }}>Share updates, repairs, or lending tips...</Text>
              <View style={{ backgroundColor: "#0b1f33", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Post</Text>
              </View>
            </TouchableOpacity>

            {/* Community Filter */}
            <View style={{ marginHorizontal: 18, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Filter by Community</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }}>
                <TouchableOpacity onPress={() => setSelectedCommunityFilter("all")} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedCommunityFilter === "all" ? "#0b1f33" : "#fff", borderWidth: 1, borderColor: selectedCommunityFilter === "all" ? "#0b1f33" : "#e2e8f0" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: selectedCommunityFilter === "all" ? "#fff" : "#64748b" }}>All</Text>
                </TouchableOpacity>
                {myCommunities.map((c) => (
                  <TouchableOpacity key={c._id} onPress={() => setSelectedCommunityFilter(c._id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedCommunityFilter === c._id ? "#0b1f33" : "#fff", borderWidth: 1, borderColor: selectedCommunityFilter === c._id ? "#0b1f33" : "#e2e8f0" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: selectedCommunityFilter === c._id ? "#fff" : "#64748b" }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sort Options */}
            <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 18, marginBottom: 12 }}>
              {sortOptions.map((opt) => (
                <TouchableOpacity key={opt.key} onPress={() => setSortBy(opt.key)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: sortBy === opt.key ? "#0b1f33" : "#fff", borderWidth: 1, borderColor: sortBy === opt.key ? "#0b1f33" : "#e2e8f0" }}>
                  <Ionicons name={opt.icon} size={14} color={sortBy === opt.key ? "#fff" : "#64748b"} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: sortBy === opt.key ? "#fff" : "#64748b" }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Feed */}
            {loading && posts.length === 0 ? (
              <SkeletonLoader variant="card" count={4} containerStyle={{ marginHorizontal: 18, marginBottom: 12 }} />
            ) : (
              <CommunityFeed posts={filteredPosts} loading={loading} user={user} onUpvote={handleUpvote} onDownvote={handleDownvote} onDiscuss={(post) => { setSelectedPost(post); setDiscussModalVisible(true); }} onStartDM={startDM} onCommunityPress={(community) => { setSelectedCommunityFilter(community?._id || "all"); }} />
            )}

            {!loading && filteredPosts.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", marginHorizontal: 18 }}>
                <Ionicons name="newspaper-outline" size={48} color="#cbd5e1" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#0b1f33", marginTop: 8 }}>No posts found</Text>
                <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4, marginHorizontal: 20 }}>Try a different community filter or sort option.</Text>
              </View>
            )}
          </>
        )}

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <CommunityDiscovery communities={communities} search={search} onSearchChange={setSearch} onSearch={load} onJoin={handleJoin} />
        )}

        {/* My Requests Tab */}
        {activeTab === "requests" && (
          <View style={{ paddingHorizontal: 18, marginTop: 12, gap: 12 }}>
            {joinRequests.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0b1f33", marginBottom: 4 }}>Join Requests</Text>
                {joinRequests.map((item) => (
                  <View key={item._id} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{item.community?.name}</Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Submitted {new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ backgroundColor: item.status === "pending" ? "#fffbeb" : item.status === "approved" ? "#e8f7ef" : "#fef2f2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: item.status === "pending" ? "#d97706" : item.status === "approved" ? "#059669" : "#ef4444", textTransform: "uppercase" }}>{item.status}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {approved.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0b1f33", marginTop: 8, marginBottom: 4 }}>Approved Communities</Text>
                {approved.map((item) => (
                  <View key={item._id} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{item.approvedCommunity?.name || item.name}</Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>{item.type} — Join code: <Text style={{ fontWeight: "700", color: "#0b1f33" }}>{item.approvedCommunity?.joinCode || "pending"}</Text></Text>
                  </View>
                ))}
              </>
            )}

            {joinRequests.length === 0 && approved.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" }}>
                <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#0b1f33", marginTop: 8 }}>No requests yet</Text>
                <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4, paddingHorizontal: 20 }}>Join communities or request to create one</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <PostComposer visible={composerVisible} onClose={() => setComposerVisible(false)} onPostCreated={load} communities={myCommunities} defaultCommunity={myCommunities[0]?._id} />
      <JoinCommunityModal visible={joinModalVisible} onClose={() => setJoinModalVisible(false)} onJoined={load} />
      <PostDiscussionModal visible={discussModalVisible} post={selectedPost} onClose={() => setDiscussModalVisible(false)} onCommentPosted={(updatedPost) => { setSelectedPost(updatedPost); setPosts(posts.map((p) => (p._id === updatedPost._id ? updatedPost : p))); }} />

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalShade}>
          <ScrollView style={{ maxHeight: "90%", width: "100%" }} contentContainerStyle={{ padding: 12 }}>
            <View style={[styles.modalPanel, { padding: 20, borderRadius: 20 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0b1f33" }}>Request New Community</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Ionicons name="close" size={24} color="#0b1f33" />
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fcd34d", marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#d97706", marginBottom: 6 }}>Requirements</Text>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={user.trustPoints >= 50 ? "checkmark-circle" : "close-circle"} size={16} color={user.trustPoints >= 50 ? "#059669" : "#ef4444"} />
                    <Text style={{ fontSize: 12, color: "#92400e" }}>At least 50 trust points</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={user.idVerified ? "checkmark-circle" : "close-circle"} size={16} color={user.idVerified ? "#059669" : "#ef4444"} />
                    <Text style={{ fontSize: 12, color: "#92400e" }}>Validated ID</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="document-text-outline" size={16} color="#d97706" />
                    <Text style={{ fontSize: 12, color: "#92400e" }}>Resident ID photo upload</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="location-outline" size={16} color="#d97706" />
                    <Text style={{ fontSize: 12, color: "#92400e" }}>Community name & location</Text>
                  </View>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Community Name</Text>
              <TextInput style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, borderWidth: 1, borderColor: "#ded8cc" }} value={request.name} onChangeText={(v) => setRequest({ ...request, name: v })} placeholder="e.g. Maple Heights Toolshare" placeholderTextColor="#94a3b8" />

              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {communityTypes.map((t) => (
                  <TouchableOpacity key={t} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: request.type === t ? "#0b1f33" : "#f1f5f9", borderWidth: 1, borderColor: request.type === t ? "#0b1f33" : "#e2e8f0" }} onPress={() => setRequest({ ...request, type: t })}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: request.type === t ? "#fff" : "#64748b" }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Location</Text>
              <TextInput style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, borderWidth: 1, borderColor: "#ded8cc" }} value={request.location} onChangeText={(v) => setRequest({ ...request, location: v })} placeholder="Zip code or neighborhood" placeholderTextColor="#94a3b8" />

              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Description (optional)</Text>
              <TextInput style={{ backgroundColor: "#f7f4ed", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 14, color: "#0b1f33", marginBottom: 12, minHeight: 60, textAlignVertical: "top", borderWidth: 1, borderColor: "#ded8cc" }} value={request.description} onChangeText={(v) => setRequest({ ...request, description: v })} placeholder="Describe the community..." placeholderTextColor="#94a3b8" multiline />

              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Resident ID (required)</Text>
              {request.residentIdMedia?.url ? (
                <View style={{ position: "relative", marginBottom: 8 }}>
                  <Image source={{ uri: resolveUrl(request.residentIdMedia.url) }} style={{ width: "100%", height: 120, borderRadius: 10, backgroundColor: "#f1f5f9" }} />
                  <TouchableOpacity onPress={() => setRequest({ ...request, residentIdMedia: null })} style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.6)", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity style={{ backgroundColor: "#f1f5f9", padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#ded8cc", borderStyle: "dashed" }} onPress={uploadResidentCommunityID}>
                <Ionicons name="camera-outline" size={20} color="#64748b" />
                <Text style={{ color: "#64748b", fontWeight: "600", fontSize: 13, marginTop: 4 }}>{request.residentIdMedia?.url ? "Change ID photo" : "Upload Resident ID"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ backgroundColor: "#0b1f33", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 8 }} onPress={requestCommunity}>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Submit Request</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: "center", paddingVertical: 8 }} onPress={() => setShowCreate(false)}>
                <Text style={{ color: "#64748b", fontWeight: "600", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
