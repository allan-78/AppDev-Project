import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ToolCard from "../components/ToolCard";

export default function HomeScreen({ user, setTab }) {
  const [tools, setTools] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    Promise.all([api("/tools?status=available"), api("/borrow-requests")])
      .then(([toolData, requestData]) => {
        setTools(toolData.tools.slice(0, 3));
        setRequests(requestData.requests.slice(0, 3));
      })
      .catch(console.error);
  }, []);

  return (
    <View>
      <ScreenHeader title={`Hi, ${user.fullName.split(" ")[0]}`} subtitle="Your borrowing dashboard and community trust snapshot." />
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statValue}>{user.trustPoints}</Text><Text style={styles.muted}>Trust points</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{user.lockedPoints}</Text><Text style={styles.muted}>Locked escrow</Text></View>
      </View>
      {user.trustPoints <= 50 ? <Text style={styles.error}>Borrowing is paused below 51 trust points. Return active items or rebuild trust first.</Text> : null}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Available tools</Text>
        <TouchableOpacity onPress={() => setTab("browse")}><Text style={styles.link}>View all</Text></TouchableOpacity>
      </View>
      {tools.map((tool) => <ToolCard key={tool._id} tool={tool} onPress={() => setTab("browse")} />)}
      <Text style={styles.sectionTitle}>Active activity</Text>
      {requests.length ? requests.map((request) => (
        <View style={styles.listItem} key={request._id}>
          <Text style={styles.cardTitle}>{request.tool?.name}</Text>
          <Text style={styles.muted}>{request.status} - priority {request.priorityScore}</Text>
        </View>
      )) : <Text style={styles.muted}>No borrow requests yet.</Text>}
    </View>
  );
}
