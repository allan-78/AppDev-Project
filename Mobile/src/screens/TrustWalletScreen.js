import React, { useEffect, useState } from "react";
import { Text, View, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../store/AuthProvider";
import WalletSummary from "../components/WalletSummary";
import TransactionDetailModal from "../components/TransactionDetailModal";

export default function TrustWalletScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const lowTrust = Number(user?.trustPoints || 0) <= 50;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  async function load() {
    try {
      const data = await api("/trust-points");
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Trust Wallet" subtitle="Escrow, rewards, penalties, and safer borrowing rules." />
        {lowTrust ? (
          <Text style={styles.error}>Your trust score is low. Borrowing is paused until you are above 50 points.</Text>
        ) : null}

        <WalletSummary user={user} />

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>How to raise trust</Text>
        <Text style={styles.muted}>Return borrowed items on time and clean.</Text>
        <Text style={styles.muted}>List useful tools and approve fair requests.</Text>
        <Text style={styles.muted}>Add pickup and return evidence when requested.</Text>
        <Text style={styles.muted}>Avoid late returns, disputes, and damage complaints.</Text>
      </View>

      <Text style={styles.sectionTitle}>Point history</Text>
      {transactions.length ? transactions.map((tx) => (
        <TouchableOpacity key={tx._id} style={styles.listItem} onPress={() => setSelectedTx(tx)} accessibilityRole="button" accessibilityLabel={`Transaction ${tx.type} ${tx.amount} points`}>
          <Text style={styles.cardTitle}>{tx.reason}</Text>
          <Text style={styles.muted}>{tx.type} - {tx.amount} points</Text>
        </TouchableOpacity>
      )) : <Text style={styles.muted}>No point history yet.</Text>}

      <TransactionDetailModal visible={!!selectedTx} tx={selectedTx} onClose={() => setSelectedTx(null)} />
      </ScrollView>
    </SafeAreaView>
  );
}
