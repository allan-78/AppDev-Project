import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { styles } from "../styles/styles";
import { api } from "../api/client";

export default function TransferModal({ visible, onClose, onSuccess }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!to.trim() || !amount) {
      Alert.alert("Validation", "Please enter recipient and amount");
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Validation", "Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/trust-points/transfer", { method: "POST", body: JSON.stringify({ toUser: to.trim(), amount: amt }) });
      setLoading(false);
      Alert.alert("Success", "Transfer submitted");
      onClose();
      onSuccess && onSuccess(data);
    } catch (err) {
      setLoading(false);
      Alert.alert("Transfer failed", err.message || "Server error. Transfer endpoint may not be available.");
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.modalPanel}>
          <Text style={styles.cardTitle}>Transfer Trust Points</Text>
          <Text style={styles.muted}>Send points to another resident by email or username.</Text>

          <Text style={styles.label}>Recipient (email or username)</Text>
          <TextInput value={to} onChangeText={setTo} style={styles.input} placeholder="recipient@example.com" autoCapitalize="none" />

          <Text style={styles.label}>Amount</Text>
          <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="10" keyboardType="numeric" />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={styles.ghostButton} onPress={onClose} accessibilityRole="button"><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={submit} accessibilityRole="button">
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Transfer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
