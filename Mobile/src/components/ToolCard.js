import React, { useRef, useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View, Animated, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../styles/styles";
import { resolveUrl } from "../api/client";
import TrustBadge from "./TrustBadge";
import StarRating from "./StarRating";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function getAvailabilityColor(status) {
  switch (status) {
    case "available": return "#059669";
    case "borrowed": return "#ef4444";
    case "maintenance": return "#f59e0b";
    default: return "#94a3b8";
  }
}

function getAvailabilityLabel(status) {
  switch (status) {
    case "available": return "Available";
    case "borrowed": return "Borrowed";
    case "maintenance": return "In Maintenance";
    default: return status || "Unknown";
  }
}

export default function ToolCard({ tool, onPress }) {
  const navigation = useNavigation();
  const [profileVisible, setProfileVisible] = useState(false);
  const [avgRating] = useState(tool.avgRating || tool.averageRating || 0);
  const [reviewCount] = useState(tool.ratingCount || tool.reviewCount || 0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const owner = tool.owner;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <>
      <AnimatedTouchable
        style={[localStyles.card, { transform: [{ scale: scaleAnim }] }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${tool.name}. Status ${tool.status}. ${tool.depositPoints} points.`}
      >
        <Image
          source={{
            uri: resolveUrl(tool.images?.[0]?.url) ||
              "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=900",
          }}
          style={localStyles.toolImage}
        />

        {/* Availability Badge */}
        <View
          style={[
            localStyles.availabilityBadge,
            { backgroundColor: getAvailabilityColor(tool.status) },
          ]}
        >
          <View style={localStyles.availabilityDot} />
          <Text style={localStyles.availabilityText}>
            {getAvailabilityLabel(tool.status)}
          </Text>
        </View>

        {owner ? (
          <TouchableOpacity
            style={localStyles.avatarFloat}
            onPress={() => setProfileVisible(true)}
          >
            <Image
              source={{
                uri: resolveUrl(owner.avatarUrl) ||
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
              }}
              style={localStyles.avatarSmall}
            />
          </TouchableOpacity>
        ) : null}

        <View style={[localStyles.toolBody, owner && { paddingTop: 28 }]}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {tool.name}
          </Text>

          <View style={localStyles.metaRow}>
            <Text style={styles.muted}>
              {tool.category?.name || "Utility"} — {tool.condition}
            </Text>
          </View>

          {/* Owner TrustBadge */}
          {owner && (
            <TouchableOpacity
              style={localStyles.ownerRow}
              onPress={() => setProfileVisible(true)}
            >
              <TrustBadge score={owner.trustPoints} mini />
              <Text style={localStyles.ownerName} numberOfLines={1}>
                {owner.fullName}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.muted} numberOfLines={2}>
            {tool.description}
          </Text>

          {/* Rating Stars */}
          {avgRating > 0 && (
            <View style={localStyles.ratingRow}>
              <StarRating rating={Math.round(avgRating)} size={14} readonly />
              <Text style={localStyles.ratingText}>
                {avgRating.toFixed(1)} ({reviewCount})
              </Text>
            </View>
          )}

          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Text
                style={[
                  styles.badge,
                  tool.status !== "available" && styles.badgeMuted,
                ]}
              >
                {tool.status}
              </Text>
            </View>
            <Text style={styles.points}>{tool.depositPoints} pts</Text>
          </View>
        </View>
      </AnimatedTouchable>

      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileVisible(false)}
      >
        <View style={styles.modalShade}>
          <View style={styles.modalPanel}>
            <View style={styles.profileCard}>
              <Image
                source={{
                  uri: resolveUrl(owner?.avatarUrl) ||
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
                }}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.cardTitle}>{owner?.fullName}</Text>
                {owner && <TrustBadge score={owner.trustPoints} />}
                <Text style={styles.muted}>{owner?.bio || "No bio yet."}</Text>
                <Text style={styles.points}>
                  Trust {owner?.trustPoints || 0}
                </Text>
              </View>
            </View>
            <Text style={styles.muted}>
              Location: {owner?.address || "Not shared"}
            </Text>
            <Text style={styles.muted}>
              Contact: {owner?.phone || owner?.email || "Not shared"}
            </Text>
            <Text style={styles.muted}>
              Followers: {owner?.followers?.length || 0} — Following:{" "}
              {owner?.following?.length || 0}
            </Text>
            <Text style={styles.badge}>
              {owner?.idVerified
                ? "Verified resident"
                : "Verification pending"}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setProfileVisible(false);
                  navigation.navigate("UserProfile", { userId: owner?._id });
                }}
              >
                <Text style={styles.primaryButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => setProfileVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0b1f33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  toolImage: {
    width: "100%",
    height: 170,
    backgroundColor: "#f1f5f9",
  },
  availabilityBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  availabilityText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  avatarFloat: {
    position: "absolute",
    top: 124,
    left: 16,
    zIndex: 2,
  },
  avatarSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e2e8f0",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  toolBody: {
    padding: 14,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  ownerName: {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 13,
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
});