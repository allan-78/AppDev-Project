import React, { useEffect, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthProvider";

export default function AdminVerificationScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const { user } = useAuth();

  async function load() {
    setLoading(true);
    try {
      const data = await api("/admin/id-verifications");
      setUsers(data.users || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, decision) {
    setActionId(id);
    try {
      await api(`/admin/users/${id}/verify-id`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      Alert.alert("Success", `User ${decision}d successfully.`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setActionId(null);
    }
  }

  const renderItem = ({ item }) => (
    <View style={[listStyles.item, { backgroundColor: "#ffffff", padding: 14, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: item.status === "rejected" ? "#dc2626" : "#d97706" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Image source={{ uri: resolveUrl(item.idImageUrl) || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#f1f5f9" }} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: "#0b1f33", fontSize: 15 }]}>{item.fullName}</Text>
          <Text style={[styles.muted, { fontSize: 12 }]}>{item.email}</Text>
          <Text style={[styles.muted, { fontSize: 12 }]}>{item.phone} • {item.address}</Text>
          <Text style={{ fontSize: 11, color: item.status === "rejected" ? "#dc2626" : "#d97706", fontWeight: "700", marginTop: 2 }}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, backgroundColor: "#059669", opacity: actionId === item._id ? 0.5 : 1 }]}
          onPress={() => review(item._id, "approve")}
          disabled={actionId === item._id}
        >
          {actionId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Approve</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1, backgroundColor: "#fef2f2", borderColor: "#fca5a5", borderWidth: 1 }]}
          onPress={() => review(item._id, "reject")}
          disabled={actionId === item._id}
        >
          <Text style={[styles.secondaryButtonText, { color: "#dc2626" }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#0b1f33" />
          </TouchableOpacity>
          <Text style={[styles.title, { marginLeft: 14, marginTop: 0, fontSize: 20 }]}>ID Verifications</Text>
        </View>
        <TouchableOpacity onPress={load} style={{ padding: 4 }}>
          <Ionicons name="refresh" size={20} color="#0b1f33" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0b1f33" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 24 }}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#94a3b8" />
              <Text style={[styles.muted, { textAlign: "center", marginTop: 12, fontSize: 15 }]}>
                No pending ID verifications.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const listStyles = StyleSheet.create({
  item: {
    shadowColor: "#0b1f33",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});