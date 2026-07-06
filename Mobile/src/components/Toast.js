import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Toast({
  visible,
  type = "info", // success | error | warning | info
  title,
  message,
  onDismiss,
  duration = 3500
}) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const cfg = useMemo(() => {
    switch (type) {
      case "success":
        return { bg: "#e8f7ef", border: "rgba(5,150,105,0.35)", text: "#059669", icon: "checkmark-circle" };
      case "error":
        return { bg: "#fff1f2", border: "rgba(239,68,68,0.35)", text: "#ef4444", icon: "alert-circle" };
      case "warning":
        return { bg: "#fffbeb", border: "rgba(245,158,11,0.35)", text: "#f59e0b", icon: "warning" };
      case "info":
      default:
        return { bg: "#eff6ff", border: "rgba(37,99,235,0.35)", text: "#2563eb", icon: "information-circle" };
    }
  }, [type]);

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(24);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true })
    ]).start();

    const t = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => clearTimeout(t);
  }, [visible, duration, onDismiss, opacity, translateY]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: cfg.bg,
            borderColor: cfg.border,
            transform: [{ translateY }],
            opacity
          }
        ]}
      >
        <View style={styles.row}>
          <Ionicons name={cfg.icon} size={20} color={cfg.text} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            {title ? <Text style={[styles.title, { color: cfg.text }]}>{title}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={onDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={cfg.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 22,
    left: 14,
    right: 14,
    zIndex: 9999
  },
  toast: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#0b1f33",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  title: {
    fontWeight: "900",
    fontSize: 13
  },
  message: {
    marginTop: 2,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18
  },
  closeBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)"
  }
});

