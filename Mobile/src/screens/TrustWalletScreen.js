import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";

export default function TrustWalletScreen({ user }) {
  const [transactions, setTransactions] = useState([]);
  const lowTrust = Number(user.trustPoints || 0) <= 50;

  useEffect(() => {
    api("/trust-points").then((data) => setTransactions(data.transactions)).catch(console.error);
  }, []);

  return (
    <View>
      <ScreenHeader title="Trust Wallet" subtitle="Escrow, rewards, penalties, and safer borrowing rules." />
      {lowTrust ? (
        <Text style={styles.error}>Your trust score is low. Borrowing is paused until you are above 50 points.</Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statValue}>{user.trustPoints}</Text><Text style={styles.muted}>Available</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{user.lockedPoints}</Text><Text style={styles.muted}>Locked</Text></View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>How to raise trust</Text>
        <Text style={styles.muted}>Return borrowed items on time and clean.</Text>
        <Text style={styles.muted}>List useful tools and approve fair requests.</Text>
        <Text style={styles.muted}>Add pickup and return evidence when requested.</Text>
        <Text style={styles.muted}>Avoid late returns, disputes, and damage complaints.</Text>
      </View>

      <Text style={styles.sectionTitle}>Point history</Text>
      {transactions.map((tx) => (
        <View style={styles.listItem} key={tx._id}>
          <Text style={styles.cardTitle}>{tx.reason}</Text>
          <Text style={styles.muted}>{tx.type} - {tx.amount} points</Text>
        </View>
      ))}
      {!transactions.length ? <Text style={styles.muted}>No point history yet.</Text> : null}
    </View>
  );
}
