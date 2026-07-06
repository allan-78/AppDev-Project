import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = "information-circle-outline",
  variant = "default",
  containerStyle
}) {
  const iconName = icon;
  const accent = variant === "danger" ? "#ef4444" : variant === "success" ? "#059669" : "#0b1f33";

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.iconWrap, { borderColor: "rgba(11,31,51,0.15)" }]}>
        <Ionicons name={iconName} size={56} color={accent} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.button, { backgroundColor: accent }]}> 
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 38,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,132,199,0.04)"
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b1f33",
    textAlign: "center"
  },
  message: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 380
  },
  button: {
    marginTop: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#fffaf1",
    fontWeight: "900",
    fontSize: 14
  }
});

