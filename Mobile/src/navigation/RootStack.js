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
    </Stack.Navigator>
  );
}
