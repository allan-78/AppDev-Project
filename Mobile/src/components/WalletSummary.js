import React from "react";
import { View, Text } from "react-native";
import { styles } from "../styles/styles";

export default function WalletSummary({ user = {} }) {
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
      <Text style={styles.muted}>Trust points are now reserved for escrow, rewards, penalties, and admin adjustments.</Text>
    </View>
  );
}
