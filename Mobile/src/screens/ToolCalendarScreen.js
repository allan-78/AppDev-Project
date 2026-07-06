import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";

function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export default function ToolCalendarScreen({ route, navigation }) {
  const tool = route.params?.tool;
  const [loading, setLoading] = React.useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [availability, setAvailability] = useState([]); // expects { date, status }

  const statusColors = useMemo(
    () => ({
      available: "#059669",
      pending: "#f59e0b",
      borrowed: "#ef4444",
      blocked: "#94a3b8"
    }),
    []
  );

  const dateMap = useMemo(() => {
    const m = new Map();
    (availability || []).forEach((a) => {
      if (a?.date) m.set(a.date, a.status);
    });
    return m;
  }, [availability]);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const monthDays = useMemo(() => Array.from({ length: 28 }).map((_, i) => addDays(todayISO, i)), [todayISO]);

  React.useEffect(() => {
    if (!tool) return navigation.goBack();
    (async () => {
      setLoading(true);
      try {
        const data = await api(`/tools/${tool._id}/availability`);
        setAvailability(data?.availability || data?.dates || []);
      } catch (e) {
        // fallback: empty availability
        setAvailability([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tool, navigation]);

  function getStatus(date) {
    const status = dateMap.get(date);
    if (!status) return "available";
    return status;
  }

  function isSelectable(status) {
    return status === "available" || status === "pending";
  }

  function onPick(date) {
    const status = getStatus(date);
    if (!isSelectable(status)) {
      Alert.alert("Not available", "That date is reserved or blocked for this tool.");
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    if (date < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
    } else {
      setRangeEnd(date);
    }
  }

  const selectedSet = useMemo(() => {
    const set = new Set();
    if (!rangeStart) return set;
    if (!rangeEnd) {
      set.add(rangeStart);
      return set;
    }
    for (let i = 0; i < 366; i++) {
      // prevent infinite loops; at most 1 year slice
      const cur = addDays(rangeStart, i);
      if (cur > rangeEnd) break;
      set.add(cur);
    }
    return set;
  }, [rangeStart, rangeEnd]);

  async function goRequest() {
    if (!rangeStart || !rangeEnd) {
      Alert.alert("Select a date range", "Pick at least start and end dates from the calendar.");
      return;
    }

    // navigate back to ToolDetail with prefilled dates
    navigation.navigate("ToolDetail", { tool, presetRange: { startDate: rangeStart, endDate: rangeEnd } });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title={tool?.name || "Tool"} subtitle="Pick availability dates to pre-fill your borrow request." />

        <View style={{ marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.muted}>Color legend</Text>
          <TouchableOpacity onPress={() => Alert.alert("Tip", "Green = available. Yellow = reserved/pending. Red = borrowed. Gray = blocked.") }>
            <Ionicons name="help-circle-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {[
            { k: "available", label: "Available" },
            { k: "pending", label: "Pending" },
            { k: "borrowed", label: "Borrowed" },
            { k: "blocked", label: "Blocked" }
          ].map((x) => (
            <View key={x.k} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColors[x.k] }} />
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a" }}>{x.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {monthDays.map((date) => {
            const status = getStatus(date);
            const bg = statusColors[status] || statusColors.available;
            const selected = selectedSet.has(date);
            return (
              <TouchableOpacity
                key={date}
                onPress={() => onPick(date)}
                style={{ width: "13.5%", aspectRatio: 1, margin: 2, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "#0b1f33" : bg, opacity: isSelectable(status) ? 1 : 0.65 }}
                accessibilityRole="button"
                accessibilityLabel={`Date ${date} status ${status}`}
              >
                <Text style={{ color: "#fffaf1", fontSize: 12, fontWeight: "900" }}>{Number(date.slice(-2))}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ fontWeight: "900", color: "#0b1f33" }}>Selected range</Text>
          <Text style={styles.muted}>Start: {rangeStart || "—"} | End: {rangeEnd || "—"}</Text>

          <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} onPress={goRequest}>
            <Text style={styles.primaryButtonText}>Use selected dates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.ghostButton, { marginTop: 10 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

