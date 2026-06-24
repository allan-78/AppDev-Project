import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { styles } from "../styles/styles";

export default function TransactionDetailModal({ visible, onClose, tx }) {
  if (!tx) return null;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={localStyles.shade}>
        <View style={localStyles.panel}>
          <Text style={styles.title}>{tx.reason || 'Transaction'}</Text>
          <ScrollView>
            <Text style={styles.muted}>Type: {tx.type}</Text>
            <Text style={styles.muted}>Amount: {tx.amount} pts</Text>
            <Text style={styles.muted}>Date: {new Date(tx.createdAt).toLocaleString()}</Text>
            {tx.notes ? <Text style={{ marginTop: 8 }}>{tx.notes}</Text> : null}
          </ScrollView>
          <TouchableOpacity style={styles.linkRow} onPress={onClose}><Text style={styles.link}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  panel: { backgroundColor: 'white', borderRadius: 8, padding: 16, maxHeight: '80%' }
});
