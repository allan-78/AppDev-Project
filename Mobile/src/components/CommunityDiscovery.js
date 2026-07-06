import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";

export default function CommunityDiscovery({
  communities,
  search,
  onSearchChange,
  onSearch,
  onJoin,
}) {
  return (
    <View style={localStyles.container}>
      <Text style={{ fontSize: 16, fontWeight: "800", color: "#0b1f33", marginBottom: 4 }}>
        🏘️ Discover Communities
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 16 }}>
        Browse neighborhood sharing hubs and request to join
      </Text>

      <View style={localStyles.searchRow}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f7f4ed", borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#ded8cc" }}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={{ flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 13, color: "#0b1f33" }}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by name or zip code..."
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity
          style={{ backgroundColor: "#0b1f33", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}
          onPress={onSearch}
        >
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {communities.length > 0 ? (
        communities.map((community) => (
          <View style={localStyles.communityItem} key={community._id}>
            <View style={localStyles.communityInfo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="people" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{community.name}</Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>{community.location || community.type || "Community"}</Text>
                </View>
              </View>
              {community.description && (
                <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 16, marginTop: 2 }} numberOfLines={2}>{community.description}</Text>
              )}
            </View>
            {!community.membershipStatus ? (
              <TouchableOpacity
                style={localStyles.joinButton}
                onPress={() => onJoin(community._id)}
              >
                <Text style={localStyles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            ) : (
              <View style={[localStyles.joinButton, { backgroundColor: "#f1f5f9" }]}>
                <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 11, textTransform: "uppercase" }}>{community.membershipStatus}</Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Ionicons name="search-outline" size={32} color="#cbd5e1" />
          <Text style={{ fontSize: 13, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>
            No communities found{search ? ` for "${search}"` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  communityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  communityInfo: {
    flex: 1,
  },
  joinButton: {
    backgroundColor: "#0b1f33",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});