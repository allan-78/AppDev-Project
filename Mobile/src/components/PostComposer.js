import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, resolveUrl } from "../api/client";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useToast } from "../store/ToastProvider";
import { styles } from "../styles/styles";

const POST_TABS = [
  { key: "text", label: "Post", icon: "document-text-outline" },
  { key: "image", label: "Images & Video", icon: "image-outline" },
  { key: "link", label: "Link", icon: "link-outline" },
];

export default function PostComposer({ visible, onClose, onPostCreated, communities = [], defaultCommunity }) {
  const { showToast } = useToast();
  const [postTab, setPostTab] = useState("text");
  const [post, setPost] = useState({
    title: "",
    body: "",
    imageUrl: "",
    linkUrl: "",
    media: [],
    community: defaultCommunity || (communities[0]?._id || ""),
  });
  const [submitting, setSubmitting] = useState(false);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const titleRef = useRef(null);

  const selectedCommunity = communities.find((c) => c._id === post.community);

  useEffect(() => {
    if (visible) {
      setTimeout(() => titleRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!post.title.trim()) {
      Alert.alert("Error", "Post title is required.");
      return;
    }
    if (!post.community) {
      Alert.alert("Error", "Please select a community to post in.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        community: post.community,
        title: post.title,
        body: post.body,
      };
      if (postTab === "image" && post.imageUrl) {
        body.imageUrl = post.imageUrl;
        body.media = [{ url: post.imageUrl, resourceType: "image" }];
      }
      if (postTab === "link" && post.linkUrl) {
        body.body = (post.body ? post.body + "\n\n" : "") + post.linkUrl;
      }
      await api("/communities/posts", { method: "POST", body: JSON.stringify(body) });
      setPost({ title: "", body: "", imageUrl: "", linkUrl: "", media: [], community: defaultCommunity || (communities[0]?._id || "") });
      setPostTab("text");
      showToast({ type: "success", title: "Success", message: "Your post is live in the community." });
      onClose();
      if (onPostCreated) onPostCreated();
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const chooseImage = async () => {
    try {
      const uploaded = await pickAndUploadImage({ allowVideo: false });
      if (uploaded) {
        setPost({ ...post, imageUrl: uploaded.url, media: [uploaded] });
      }
    } catch (err) {
      showToast({ type: "error", title: "Upload Failed", message: err.message });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <View style={styles.modalShade}>
          <View style={localStyles.container}>
            {/* Header */}
            <View style={localStyles.header}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#0b1f33" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0b1f33" }}>Create a post</Text>
              <TouchableOpacity style={localStyles.postButton} onPress={handleSubmit} disabled={submitting}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
                  {submitting ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Community Picker */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                onPress={() => setShowCommunityPicker(!showCommunityPicker)}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="people" size={14} color="#fff" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>
                  {selectedCommunity ? selectedCommunity.name : "Select a community"}
                </Text>
                <Ionicons name={showCommunityPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
              </TouchableOpacity>

              {showCommunityPicker && (
                <View style={{ marginTop: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {communities.length === 0 && (
                      <Text style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>No communities available</Text>
                    )}
                    {communities.map((community, index) => (
                      <TouchableOpacity
                        key={community._id}
                        style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: index < communities.length - 1 ? 1 : 0, borderBottomColor: "#f1f5f9", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: post.community === community._id ? "#eff6ff" : "#fff" }}
                        onPress={() => { setPost({ ...post, community: community._id }); setShowCommunityPicker(false); }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="people" size={16} color="#fff" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: post.community === community._id ? "700" : "500", color: post.community === community._id ? "#3b82f6" : "#0b1f33" }}>
                          {community.name}
                        </Text>
                        {post.community === community._id && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Tab Switcher */}
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
              {POST_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setPostTab(tab.key)}
                  style={{ flex: 1, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, borderBottomWidth: 2, borderBottomColor: postTab === tab.key ? "#0b1f33" : "transparent" }}
                >
                  <Ionicons name={tab.icon} size={16} color={postTab === tab.key ? "#0b1f33" : "#94a3b8"} />
                  <Text style={{ fontSize: 12, fontWeight: postTab === tab.key ? "800" : "600", color: postTab === tab.key ? "#0b1f33" : "#94a3b8" }}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="always" contentContainerStyle={{ padding: 16, gap: 12 }}>
              {/* Text Tab */}
              {postTab === "text" && (
                <>
                  <TextInput
                    ref={titleRef}
                    style={localStyles.titleInput}
                    value={post.title}
                    onChangeText={(value) => setPost({ ...post, title: value })}
                    placeholder="Title"
                    placeholderTextColor="#94a3b8"
                    editable={!submitting}
                  />
                  <TextInput
                    style={localStyles.bodyInput}
                    value={post.body}
                    onChangeText={(value) => setPost({ ...post, body: value })}
                    placeholder="Text (optional)"
                    placeholderTextColor="#94a3b8"
                    multiline
                    editable={!submitting}
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Image Tab */}
              {postTab === "image" && (
                <>
                  <TextInput
                    style={localStyles.titleInput}
                    value={post.title}
                    onChangeText={(value) => setPost({ ...post, title: value })}
                    placeholder="Title"
                    placeholderTextColor="#94a3b8"
                    editable={!submitting}
                  />
                  {post.imageUrl ? (
                    <View style={{ position: "relative", borderRadius: 12, overflow: "hidden", backgroundColor: "#f1f5f9" }}>
                      <Image source={{ uri: resolveUrl(post.imageUrl) }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => setPost({ ...post, imageUrl: "", media: [] })} style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={chooseImage} style={localStyles.imageUploadBox}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="image-outline" size={24} color="#64748b" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0b1f33", marginTop: 8 }}>Add an image</Text>
                      <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Or drag and drop a file</Text>
                      <View style={{ marginTop: 12, backgroundColor: "#0b1f33", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Upload from device</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={localStyles.bodyInput}
                    value={post.body}
                    onChangeText={(value) => setPost({ ...post, body: value })}
                    placeholder="Caption (optional)"
                    placeholderTextColor="#94a3b8"
                    multiline
                    editable={!submitting}
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Link Tab */}
              {postTab === "link" && (
                <>
                  <TextInput
                    style={localStyles.titleInput}
                    value={post.title}
                    onChangeText={(value) => setPost({ ...post, title: value })}
                    placeholder="Title"
                    placeholderTextColor="#94a3b8"
                    editable={!submitting}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: "#e2e8f0" }}>
                    <Ionicons name="link" size={18} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
                      value={post.linkUrl}
                      onChangeText={(value) => setPost({ ...post, linkUrl: value })}
                      placeholder="URL"
                      placeholderTextColor="#94a3b8"
                      editable={!submitting}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                  <TextInput
                    style={localStyles.bodyInput}
                    value={post.body}
                    onChangeText={(value) => setPost({ ...post, body: value })}
                    placeholder="Text (optional)"
                    placeholderTextColor="#94a3b8"
                    multiline
                    editable={!submitting}
                    textAlignVertical="top"
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    minHeight: "60%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  postButton: {
    backgroundColor: "#0b1f33",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b1f33",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  bodyInput: {
    fontSize: 14,
    color: "#0b1f33",
    minHeight: 120,
    lineHeight: 20,
    paddingTop: 12,
  },
  imageUploadBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: "#faf9f7",
  },
});