import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Modal, ActivityIndicator, ScrollView } from "react-native";
import { api, resolveUrl } from "../api/client";
import { Ionicons } from "@expo/vector-icons";
import TrustBadge from "./TrustBadge";

export default function ProfileCardModal({ visible, userId, onClose, onMessage, onViewFullProfile }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    setProfile(null);
    setStats(null);
    Promise.all([
      api(`/users/${userId}`).catch(() => null),
      api(`/users/${userId}/stats`).catch(() => null)
    ])
      .then(([userData, statsData]) => {
        if (userData?.user) setProfile(userData.user);
        else if (userData) setProfile(userData);
        if (statsData?.stats) setStats(statsData.stats);
        else if (statsData) setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const avatarUrl = profile?.avatarUrl || profile?.profilePicture || null;
  const trustPoints = profile?.trustPoints ?? 0;
  const fullName = profile?.fullName || "Unknown User";
  const bio = profile?.bio || "";
  const communityName = profile?.community?.name || profile?.communityName || "";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={{ backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 340, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}
          activeOpacity={1}
          onPress={() => {}}
        >
          {loading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0b1f33" />
              <Text style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>Loading profile...</Text>
            </View>
          ) : profile ? (
            <>
              {/* Profile Header */}
              <View style={{ backgroundColor: "#0b1f33", padding: 24, alignItems: "center" }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: avatarUrl ? "transparent" : "#fff", overflow: "hidden", borderWidth: 3, borderColor: "#fff", marginBottom: 10, alignItems: "center", justifyContent: "center" }}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: resolveUrl(avatarUrl) }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                      resizeMode="cover"
                      onError={() => console.warn("Failed to load avatar:", avatarUrl)}
                    />
                  ) : (
                    <Text style={{ color: "#0b1f33", fontSize: 32, fontWeight: "800" }}>
                      {(fullName || "U").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 2 }}>{fullName}</Text>
                {communityName ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="people" size={14} color="#94a3b8" />
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>{communityName}</Text>
                  </View>
                ) : null}
              </View>

              {/* Trust Score */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Trust Score</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <TrustBadge score={trustPoints} />
                    <Text style={{ fontSize: 18, fontWeight: "900", color: "#0b1f33" }}>{trustPoints}</Text>
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, (trustPoints / 200) * 100)}%`, height: 6, backgroundColor: trustPoints > 100 ? "#059669" : trustPoints > 50 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                </View>
              </View>

              {/* Stats Row */}
              {stats && (
                <View style={{ flexDirection: "row", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 8 }}>
                  {[
                    { label: "Tools", value: stats.toolCount ?? profile.toolCount ?? 0, icon: "construct" },
                    { label: "Borrows", value: stats.borrowCount ?? profile.borrowCount ?? 0, icon: "swap-horizontal" },
                    { label: "Rating", value: stats.avgRating ?? profile.avgRating ?? "—", icon: "star" }
                  ].map((item, i) => (
                    <View key={i} style={{ flex: 1, alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, padding: 10 }}>
                      <Ionicons name={item.icon} size={16} color="#64748b" />
                      <Text style={{ fontSize: 16, fontWeight: "900", color: "#0b1f33", marginTop: 4 }}>{item.value}</Text>
                      <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Bio */}
              {bio ? (
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Bio</Text>
                  <Text style={{ fontSize: 13, color: "#475569", lineHeight: 18 }}>{bio}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={{ padding: 16, gap: 8 }}>
                <TouchableOpacity
                  style={{ backgroundColor: "#0b1f33", paddingVertical: 12, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                  onPress={() => { if (onMessage) { onClose(); onMessage(profile); } }}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Send Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: "#f1f5f9", paddingVertical: 10, borderRadius: 10, alignItems: "center" }}
                  onPress={() => { if (onViewFullProfile) { onClose(); onViewFullProfile(profile); } }}
                >
                  <Text style={{ color: "#0b1f33", fontWeight: "700", fontSize: 13 }}>View Full Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ alignItems: "center", paddingVertical: 6 }}
                  onPress={onClose}
                >
                  <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 12 }}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="person-outline" size={48} color="#cbd5e1" />
              <Text style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>User not found</Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
                <Text style={{ color: "#3b82f6", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}