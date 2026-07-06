import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { theme } from "../styles/theme";

export default function MaintenanceCostScreen({ navigation }) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api("/maintenance/my-charges");
      setCharges(data.charges || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load maintenance charges");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(chargeId) {
    setActionLoading(chargeId);
    try {
      await api(`/maintenance/${chargeId}/accept`, { method: "PATCH" });
      Alert.alert("Success", "You have accepted the maintenance charge allocation.");
      load();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to accept charge");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDispute(chargeId) {
    Alert.prompt(
      "Dispute Charge",
      "Explain why you are disputing this charge allocation:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Submit Dispute",
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert("Error", "You must provide a reason for the dispute.");
              return;
            }
            setActionLoading(chargeId);
            try {
              await api(`/maintenance/${chargeId}/dispute`, {
                method: "PATCH",
                body: JSON.stringify({ reason: reason.trim() })
              });
              Alert.alert("Success", "Dispute submitted to admin review.");
              load();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to submit dispute");
            } finally {
              setActionLoading(null);
            }
          }
        }
      ],
      "plain-text"
    );
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Maintenance Charges" subtitle="Accept or dispute points allocated for tool wear & tear splits." />

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : charges.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={styles.muted}>You have no pending maintenance cost allocations.</Text>
          </View>
        ) : (
          charges.map((c) => (
            <View style={[styles.listItem, { padding: 18 }]} key={c.maintenanceCase}>
              <Text style={styles.cardTitle}>{c.tool?.name || "Unknown Tool"}</Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginVertical: 4 }}>
                Issue Reported: {c.issue}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.primary, marginBottom: 8 }}>
                Your Share: -{c.allocation?.pointShare} Trust Points
              </Text>
              <Text style={styles.muted}>
                Method: {c.allocation?.reason || "Usage split"}
              </Text>
              <Text style={[styles.muted, { marginBottom: 12 }]}>
                Status: <Text style={{ fontWeight: "700", color: c.allocation?.status === "accepted" ? "#16a34a" : c.allocation?.status === "disputed" ? "#dc2626" : "#eab308" }}>
                  {c.allocation?.status?.toUpperCase()}
                </Text>
              </Text>

              {c.allocation?.status === "pending" && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: "#16a34a", flex: 1, height: 40, justifyContent: "center" }]}
                    onPress={() => handleAccept(c.maintenanceCase)}
                    disabled={actionLoading === c.maintenanceCase}
                  >
                    {actionLoading === c.maintenanceCase ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Accept</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: "#dc2626", flex: 1, height: 40, justifyContent: "center" }]}
                    onPress={() => handleDispute(c.maintenanceCase)}
                    disabled={actionLoading === c.maintenanceCase}
                  >
                    <Text style={styles.primaryButtonText}>Dispute</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
