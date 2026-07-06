import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import BrowseToolsScreen from "../screens/BrowseToolsScreen";
import CommunityScreen from "../screens/CommunityScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useAuth } from "../store/AuthProvider";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { notificationsCount } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: { height: 70, paddingTop: 8, backgroundColor: "#ffffff", borderTopWidth: 1, borderColor: "#e6eef2" },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "home-outline",
            Browse: "search-outline",
            Community: "people-outline",
            Profile: "person-outline"
          };
          const name = icons[route.name] || "ellipse-outline";
          return <Ionicons name={name} size={24} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarBadge: notificationsCount > 0 ? (notificationsCount > 99 ? "99+" : notificationsCount) : undefined
        }}
      />
      <Tab.Screen name="Browse" component={BrowseToolsScreen} options={{ headerShown: false, tabBarLabel: "Browse" }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ headerShown: false, tabBarLabel: "Community" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false, tabBarLabel: "Profile" }} />
    </Tab.Navigator>
  );
}

function NotificationBell({ navigation }) {
  const { notificationsCount } = useAuth();
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginRight: 12 }} accessibilityRole="button" accessibilityLabel="Notifications">
      <View style={{ position: "relative" }}>
        <Ionicons name="notifications-outline" size={22} color="#111" />
        {notificationsCount > 0 ? (
          <View style={{ position: "absolute", right: -6, top: -6, backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{notificationsCount > 99 ? "99+" : notificationsCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
