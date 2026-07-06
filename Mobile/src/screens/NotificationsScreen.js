import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import theme from "../styles/theme";
import ScreenHeader from "../components/ScreenHeader";
import { useNavigation } from "@react-navigation/native";
import { groupNotificationsByDate } from "../utils/notificationHelpers";

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api("/notifications");
      setItems(data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const grouped = groupNotificationsByDate(items);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (item) => {
    if (item.isRead) {
      // If already read, navigate if applicable
      navigateToRelated(item);
      return;
    }
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
      await api(`/notifications/${item._id}/read`, { method: "PATCH" });
      navigateToRelated(item);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await api("/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const navigateToRelated = (item) => {
    if (!item.data) return;
    try {
      const data = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      if (data.borrowRequestId) {
        navigation.navigate("Borrowings", { screen: "BorrowingDetail", params: { id: data.borrowRequestId } });
      }
    } catch (e) {
      console.warn("Could not parse notification navigation data", e);
    }
  };

  const getIconName = (type) => {
    switch (type) {
      case "borrow":
      case "borrow_request":
        return "calendar-outline";
      case "dispute":
        return "alert-circle-outline";
      case "announcement":
        return "megaphone-outline";
      case "community":
        return "people-outline";
      default:
        return "notifications-outline";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "dispute":
        return theme.colors.red;
      case "borrow":
      case "borrow_request":
        return theme.colors.gold;
      case "announcement":
        return theme.colors.info;
      case "community":
        return theme.colors.success;
      default:
        return theme.colors.muted;
    }
  };

  const renderItem = ({ item }) => {
    const iconName = getIconName(item.type);
    const iconColor = getIconColor(item.type);

    return (
      <TouchableOpacity
        style={[
          localStyles.notificationCard,
          !item.isRead && localStyles.unreadCard
        ]}
        onPress={() => handleMarkAsRead(item)}
      >
        <View style={localStyles.iconContainer}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          {!item.isRead && <View style={localStyles.unreadDot} />}
        </View>
        <View style={localStyles.contentContainer}>
          <Text style={[localStyles.titleText, !item.isRead && localStyles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.muted}>{item.message}</Text>
          <Text style={localStyles.timeText}>
            {new Date(item.createdAt).toLocaleDateString()} at{" "}
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={localStyles.sectionHeader}>
      <Text style={localStyles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={localStyles.headerRow}>
        <ScreenHeader
          title="Notifications"
          subtitle="Borrowing, dispute, maintenance, and community updates."
        />
        {items.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={localStyles.markAllButton}>
            <Text style={localStyles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.green} />
        </View>
      ) : (
        <FlatList
          data={grouped.sections}
          keyExtractor={(section) => section.title}
          renderItem={({ item }) => (
            <View>
              {renderSectionHeader({ section: item })}
              {item.data.map((notification) => renderItem({ item: notification }))}
            </View>
          )}
          contentContainerStyle={styles.contentInner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={[theme.colors.green]}
            />
          }
          ListEmptyComponent={
            <View style={localStyles.emptyContainer}>
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={theme.colors.line}
              />
              <Text style={localStyles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  markAllButton: {
    marginTop: 24,
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.chip
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: "center"
  },
  unreadCard: {
    borderColor: theme.colors.green,
    backgroundColor: theme.colors.cream
  },
  iconContainer: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.red,
    borderWidth: 1.5,
    borderColor: theme.colors.surface
  },
  contentContainer: {
    flex: 1,
    gap: 2
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.ink
  },
  unreadText: {
    fontWeight: "800",
    color: theme.colors.green
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: theme.colors.bg
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.muted
  }
});
