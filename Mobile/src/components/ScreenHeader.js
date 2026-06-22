import React from "react";
import { Text, View } from "react-native";
import { styles } from "../styles/styles";

export default function ScreenHeader({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>NeighborhoodShare</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}
