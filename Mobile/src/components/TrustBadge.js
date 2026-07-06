import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

function getTier(score) {
  const s = Number(score ?? 0);
  if (s >= 76) return "Platinum";
  if (s >= 51) return "Gold";
  if (s >= 26) return "Silver";
  return "Bronze";
}

export default function TrustBadge({ score, size = "md" }) {
  const tier = useMemo(() => getTier(score), [score]);
  const cfg = useMemo(() => {
    switch (tier) {
      case "Platinum":
        return { bg: "rgba(147,197,253,0.15)", border: "rgba(59,130,246,0.35)", text: "#1d4ed8" };
      case "Gold":
        return { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.35)", text: "#b45309" };
      case "Silver":
        return { bg: "rgba(148,163,184,0.18)", border: "rgba(148,163,184,0.38)", text: "#334155" };
      case "Bronze":
      default:
        return { bg: "rgba(180,83,9,0.12)", border: "rgba(180,83,9,0.28)", text: "#9a3412" };
    }
  }, [tier]);

  const dims = size === "sm" ? { w: 82, h: 28, font: 11 } : { w: 110, h: 32, font: 12 };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border, width: dims.w, height: dims.h }]}>
      <Text style={[styles.text, { color: cfg.text, fontSize: dims.font }]}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  text: {
    fontWeight: "900"
  }
});

