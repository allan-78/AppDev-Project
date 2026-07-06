import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPicker({
  availability = [],
  rangeStart,
  rangeEnd,
  onPickDate,
  startDate = new Date(),
  daysToShow = 28,
}) {
  const statusColors = {
    available: "#059669",
    pending: "#f59e0b",
    borrowed: "#ef4444",
    blocked: "#94a3b8",
  };

  const dateMap = useMemo(() => {
    const m = new Map();
    (availability || []).forEach((a) => {
      if (a?.date) m.set(a.date, a.status);
    });
    return m;
  }, [availability]);

  const todayISO = useMemo(() => toISODate(startDate), [startDate]);
  const monthDays = useMemo(
    () => Array.from({ length: daysToShow }).map((_, i) => addDays(todayISO, i)),
    [todayISO, daysToShow]
  );

  // Group days into weeks for calendar grid
  const weeks = useMemo(() => {
    const result = [];
    let week = [];
    const firstDate = new Date(todayISO + "T00:00:00Z");
    const firstDayOfWeek = firstDate.getUTCDay();

    // Pad with empty cells for alignment
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    monthDays.forEach((date) => {
      week.push(date);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    });

    if (week.length > 0) {
      // Pad remaining cells
      while (week.length < 7) {
        week.push(null);
      }
      result.push(week);
    }

    return result;
  }, [monthDays, todayISO]);

  const getStatus = (date) => {
    const status = dateMap.get(date);
    if (!status) return "available";
    return status;
  };

  const isSelectable = (status) => status === "available" || status === "pending";

  const selectedSet = useMemo(() => {
    const set = new Set();
    if (!rangeStart) return set;
    if (!rangeEnd) {
      set.add(rangeStart);
      return set;
    }
    for (let i = 0; ; i++) {
      const cur = addDays(rangeStart, i);
      if (cur > rangeEnd) break;
      if (i > 366) break;
      set.add(cur);
    }
    return set;
  }, [rangeStart, rangeEnd]);

  const currentMonth = MONTHS[new Date(todayISO + "T00:00:00Z").getUTCMonth()];
  const currentYear = new Date(todayISO + "T00:00:00Z").getUTCFullYear();

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>
        {currentMonth} {currentYear}
      </Text>

      {/* Day of week headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.dayCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            if (!date) {
              return <View key={`empty-${di}`} style={styles.dayCell} />;
            }
            const status = getStatus(date);
            const bg = statusColors[status] || statusColors.available;
            const selected = selectedSet.has(date);
            const dayNum = Number(date.slice(-2));

            return (
              <TouchableOpacity
                key={date}
                onPress={() => onPickDate && onPickDate(date, status)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: selected ? "#0b1f33" : bg,
                    opacity: isSelectable(status) ? 1 : 0.5,
                  },
                ]}
                disabled={!isSelectable(status)}
              >
                <Text style={[styles.dayNum, selected && styles.dayNumSelected]}>
                  {dayNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries({
          available: "Available",
          pending: "Pending",
          borrowed: "Borrowed",
          blocked: "Blocked",
        }).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColors[key] }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Selected range display */}
      {rangeStart && (
        <View style={styles.selectedRange}>
          <Text style={styles.selectedRangeText}>
            Selected: {rangeStart}
            {rangeEnd ? ` → ${rangeEnd}` : " (select end date)"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ded8cc",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0b1f33",
    textAlign: "center",
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  dayCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  dayNum: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  dayNumSelected: {
    color: "#fffaf1",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
  },
  selectedRange: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(11,31,51,0.05)",
    borderRadius: 8,
  },
  selectedRangeText: {
    fontWeight: "700",
    color: "#0b1f33",
    textAlign: "center",
    fontSize: 13,
  },
});