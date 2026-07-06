import React, { useMemo } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function AnimatedButton({
  onPress,
  children,
  style,
  disabled,
  loading,
  variant = "primary", // primary | ghost | danger
  haptic = true,
  accessibilityLabel
}) {
  const pressAnim = useMemo(() => new Animated.Value(1), []);

  const cfg = useMemo(() => {
    switch (variant) {
      case "ghost":
        return { bg: "transparent", border: "rgba(11,31,51,0.25)", text: "#0b1f33" };
      case "danger":
        return { bg: "#ef4444", border: "#ef4444", text: "#fffaf1" };
      case "primary":
      default:
        return { bg: "#059669", border: "#059669", text: "#fffaf1" };
    }
  }, [variant]);

  function triggerHaptic() {
    if (!haptic) return;
    // Keep safe even if haptics not supported.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      onPress={() => {
        triggerHaptic();
        Animated.sequence([
          Animated.timing(pressAnim, { toValue: 0.97, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pressAnim, { toValue: 1, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ]).start();
        onPress?.();
      }}
      activeOpacity={1}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: cfg.bg,
            borderColor: cfg.border
          },
          style,
          { transform: [{ scale: pressAnim }] }
        ]}
      >
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
            <ActivityIndicator color={cfg.text} />
          </View>
        ) : (
          <Text style={[styles.text, { color: cfg.text }]}>{children}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  text: {
    fontWeight: "900",
    fontSize: 14
  }
});

