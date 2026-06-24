import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text, Animated, StyleSheet } from "react-native";
import { styles } from "../styles/styles";

export default function GlobalLoader({ message = "Loading…", fullScreen = false }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const containerStyle = [
    styles.center,
    fullScreen ? localStyles.fullscreenOverlay : null,
    { opacity, transform: [{ scale }] },
  ];

  return (
    <Animated.View style={containerStyle} accessible accessibilityRole="alert">
      <ActivityIndicator size="large" color={styles.primaryColor || "#176b58"} />
      <Text style={localStyles.message}>{message}</Text>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    zIndex: 2000,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    color: "#374151",
  },
});
