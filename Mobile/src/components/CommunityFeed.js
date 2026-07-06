import React from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { resolveUrl } from "../api/client";

export default function CommunityFeed({
  posts,
  loading,
  user,
  onUpvote,
  onDownvote,
  onDiscuss,
  onStartDM,
  onCommunityPress,
}) {
  if (loading && posts.length === 0) {
    return (
      <View style={{ paddingVertical: 32, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0b1f33" />
        <Text style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>Loading feed...</Text>
      </View>
    );
  }

  if (!posts.length) {
    return (
      <View style={{ paddingVertical: 32, alignItems: "center" }}>
        <Ionicons name="newspaper-outline" size={48} color="#cbd5e1" />
        <Text style={{ color: "#64748b", fontSize: 14, fontWeight: "600", marginTop: 8 }}>No posts yet</Text>
        <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Be the first to share something!</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 18 }}>
      {posts.map((item) => {
        const upvoted = item.upvotes?.some((id) => id && id.toString() === user?._id?.toString());
        const downvoted = item.downvotes?.some((id) => id && id.toString() === user?._id?.toString());
        const score = (item.upvotes?.length || 0) - (item.downvotes?.length || 0);
        const commentCount = item.comments?.length || 0;
        const hasImage = item.media?.[0]?.resourceType === "image" || item.imageUrl;

        return (
          <View style={localStyles.postCard} key={item._id}>
            <View style={{ flexDirection: "row" }}>
              {/* Vote Column */}
              <View style={localStyles.voteColumn}>
                <TouchableOpacity onPress={() => onUpvote(item._id)} style={localStyles.voteBtn}>
                  <Ionicons name="caret-up" size={22} color={upvoted ? "#ea580c" : "#94a3b8"} />
                </TouchableOpacity>
                <Text style={[localStyles.voteScore, { color: score > 0 ? "#ea580c" : score < 0 ? "#2563eb" : "#0b1f33" }]}>
                  {score}
                </Text>
                <TouchableOpacity onPress={() => onDownvote(item._id)} style={localStyles.voteBtn}>
                  <Ionicons name="caret-down" size={22} color={downvoted ? "#2563eb" : "#94a3b8"} />
                </TouchableOpacity>
              </View>

              {/* Main Content */}
              <TouchableOpacity style={{ flex: 1 }} onPress={() => onDiscuss(item)} activeOpacity={0.9}>
                {/* Meta */}
                <View style={localStyles.metaRow}>
                  <TouchableOpacity onPress={() => onCommunityPress(item.community)}>
                    <View style={localStyles.communityBadge}>
                      <Text style={localStyles.communityBadgeText}>{item.community?.name || "Community"}</Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={localStyles.dotSeparator}>·</Text>
                  <Text style={localStyles.authorText}>u/{item.author?.fullName || "neighbor"}</Text>
                  {item.createdAt && (
                    <>
                      <Text style={localStyles.dotSeparator}>·</Text>
                      <Text style={localStyles.timeText}>{getTimeAgo(item.createdAt)}</Text>
                    </>
                  )}
                </View>

                {/* Title */}
                <Text style={localStyles.postTitle}>{item.title}</Text>

                {/* Body */}
                {item.body ? (
                  <Text style={localStyles.postBody} numberOfLines={4}>{item.body}</Text>
                ) : null}

                {/* Image */}
                {hasImage ? (
                  <Image source={{ uri: resolveUrl(item.media?.[0]?.url || item.imageUrl) }} style={localStyles.mediaImage} resizeMode="cover" />
                ) : null}

                {/* Video placeholder */}
                {item.media?.[0]?.resourceType === "video" ? (
                  <View style={localStyles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={48} color="#ffffff" />
                    <Text style={localStyles.videoText}>Play Video</Text>
                  </View>
                ) : null}

                {/* Action Row */}
                <View style={localStyles.actionRow}>
                  <TouchableOpacity style={localStyles.actionButton} onPress={() => onDiscuss(item)}>
                    <Ionicons name="chatbubble-outline" size={16} color="#64748b" />
                    <Text style={localStyles.actionText}>{commentCount} Comments</Text>
                  </TouchableOpacity>

                  {item.author && user && item.author._id !== user._id ? (
                    <TouchableOpacity style={localStyles.actionButton} onPress={() => onStartDM(item.author._id)}>
                      <Ionicons name="mail-outline" size={16} color="#94733d" />
                      <Text style={[localStyles.actionText, { color: "#94733d" }]}>Message</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity style={localStyles.actionButton} onPress={() => onDiscuss(item)}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

const localStyles = StyleSheet.create({
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  voteColumn: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: "#faf9f7",
    width: 40,
  },
  voteBtn: { padding: 2, borderRadius: 4 },
  voteScore: { fontSize: 13, fontWeight: "800", marginVertical: 4 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  communityBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  communityBadgeText: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  dotSeparator: { fontSize: 10, color: "#cbd5e1" },
  authorText: { fontSize: 11, color: "#64748b" },
  timeText: { fontSize: 11, color: "#94a3b8" },
  postTitle: { fontSize: 15, fontWeight: "700", color: "#0b1f33", marginBottom: 4, paddingHorizontal: 12 },
  postBody: { fontSize: 13, lineHeight: 18, color: "#475569", marginBottom: 8, paddingHorizontal: 12 },
  mediaImage: { width: "100%", height: 200, marginBottom: 8, backgroundColor: "#f1f5f9" },
  videoPlaceholder: { width: "100%", height: 200, marginBottom: 8, backgroundColor: "#0b1f33", justifyContent: "center", alignItems: "center" },
  videoText: { color: "#fffaf1", marginTop: 6, fontSize: 12, fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  actionText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
});
