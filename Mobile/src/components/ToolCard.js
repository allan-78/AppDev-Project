import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/styles";

export default function ToolCard({ tool, onPress }) {
  return (
    <TouchableOpacity style={styles.toolCard} onPress={onPress}>
      <Image source={{ uri: tool.images?.[0]?.url || "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=900" }} style={styles.toolImage} />
      <View style={styles.toolBody}>
        <Text style={styles.cardTitle}>{tool.name}</Text>
        <Text style={styles.muted}>{tool.category?.name || "Utility"} - {tool.condition}</Text>
        <Text style={styles.muted} numberOfLines={2}>{tool.description}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.badge}>{tool.status}</Text>
          <Text style={styles.points}>{tool.depositPoints} escrow</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
