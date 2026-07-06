import React, { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api/client";
import { useAuth } from "../../store/AuthProvider";
import { useToast } from "../../store/ToastProvider";
import { styles } from "../../styles/styles";

export default function PostDiscussionModal({ visible, post, onClose, onCommentPosted }) {
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const { showToast } = useToast();

  async function submitComment() {
    if (!comment.trim() || !post) return;
    try {
      const data = await api(`/communities/posts/${post._id}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: comment }),
      });
      const updatedPost = {
        ...post,
        comments: [...(post.comments || []), data.comment],
      };
      onCommentPosted(updatedPost);
      setComment("");
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err.message || "Failed to post comment" });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.modalPanel}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Discussion</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#0b1f33" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardTitle, { fontSize: 14 }]}>{post?.title}</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {(post?.comments || []).map((comment) => (
              <View key={comment._id} style={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 8 }}>
                <Text style={{ fontWeight: "700", fontSize: 12, color: "#0b1f33" }}>
                  {comment.author?.fullName || "Neighbor"}
                </Text>
                <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{comment.body}</Text>
              </View>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Write a comment..."
          />
          <TouchableOpacity style={styles.primaryButton} onPress={submitComment}>
            <Text style={styles.primaryButtonText}>Post Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}