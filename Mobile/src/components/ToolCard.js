import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/styles";
import { resolveUrl } from "../api/client";
import { useNavigation } from "@react-navigation/native";

export default function ToolCard({ tool, onPress }) {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.toolCard}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${tool.name}. Status ${tool.status}. ${tool.depositPoints} points.`}
    >
      <Image source={{ uri: resolveUrl(tool.images?.[0]?.url) || "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=900" }} style={styles.toolImage} />
      <View style={styles.toolBody}>
        <Text style={styles.cardTitle}>{tool.name}</Text>
        <Text style={styles.muted}>{tool.category?.name || "Utility"} • {tool.condition}</Text>
        <Text style={styles.muted} numberOfLines={2}>{tool.description}</Text>
        {tool.owner ? (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: tool.owner._id })}>
            <Text style={{ marginTop: 8, fontWeight: '800', color: '#0f172a' }}>{tool.owner.fullName} • Trust {tool.owner.trustPoints || 0}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Text style={[styles.badge, tool.status !== "available" && styles.badgeMuted]}>{tool.status}</Text>
          </View>
          <Text style={styles.points}>{tool.depositPoints} pts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
