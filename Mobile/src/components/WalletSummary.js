import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/styles";

export default function WalletSummary({ user = {} , onTransfer, onWithdraw }) {
  return (
    <View style={styles.panel} accessible accessibilityRole="summary">
      <Text style={styles.cardTitle}>Trust Wallet</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{user.trustPoints ?? 0}</Text>
          <Text style={styles.muted}>Available</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{user.lockedPoints ?? 0}</Text>
          <Text style={styles.muted}>Locked</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.ghostButton} onPress={onTransfer} accessibilityRole="button" accessibilityLabel="Transfer trust points"><Text style={styles.secondaryButtonText}>Transfer</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onWithdraw} accessibilityRole="button" accessibilityLabel="Withdraw trust points"><Text style={styles.secondaryButtonText}>Withdraw</Text></TouchableOpacity>
      </View>
    </View>
  );
}
