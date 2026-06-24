import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/styles";

export default function PrimaryButton({ children, onPress, style, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, style, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}
