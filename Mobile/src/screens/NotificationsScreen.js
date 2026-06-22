import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api("/notifications").then((data) => setItems(data.notifications)).catch(console.error);
  }, []);

  return (
    <View>
      <ScreenHeader title="Notifications" subtitle="Borrowing, dispute, maintenance, and account updates." />
      {items.map((item) => (
        <View style={styles.listItem} key={item._id}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.muted}>{item.message}</Text>
        </View>
      ))}
      {!items.length ? <Text style={styles.muted}>No notifications yet.</Text> : null}
    </View>
  );
}
