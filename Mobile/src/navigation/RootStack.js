import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import ToolDetailScreen from "../screens/ToolDetailScreen.js";
import NotificationsScreen from "../screens/NotificationsScreen";
import AddToolScreen from "../screens/AddToolScreen";
import BorrowingsScreen from "../screens/BorrowingsScreen";
import TrustWalletScreen from "../screens/TrustWalletScreen";
import ChatScreen from "../screens/ChatScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import ActivityHistoryScreen from "../screens/ActivityHistoryScreen";
import ChatThreadsScreen from "../screens/ChatThreadsScreen";

import RatingScreen from "../screens/RatingScreen";
import MaintenanceCostScreen from "../screens/MaintenanceCostScreen";
import ToolCalendarScreen from "../screens/ToolCalendarScreen";
import AdvancedSearchScreen from "../screens/AdvancedSearchScreen";
import AdminVerificationScreen from "../screens/AdminVerificationScreen";

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="ToolDetail" component={ToolDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AddTool" component={AddToolScreen} />
      <Stack.Screen name="Borrowings" component={BorrowingsScreen} />
      <Stack.Screen name="TrustWallet" component={TrustWalletScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      <Stack.Screen name="ChatThreads" component={ChatThreadsScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="MaintenanceCost" component={MaintenanceCostScreen} />

      {/* Phase 3: Professional Mobile Upgrade */}
      <Stack.Screen name="ToolCalendar" component={ToolCalendarScreen} />
      <Stack.Screen name="AdvancedSearch" component={AdvancedSearchScreen} />

      {/* Admin screens */}
      <Stack.Screen name="AdminVerifications" component={AdminVerificationScreen} />
    </Stack.Navigator>
  );
}



