import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/store/AuthProvider";
import AuthStack from "./src/navigation/AuthStack";
import RootStack from "./src/navigation/RootStack";
import { Text, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { styles } from "./src/styles/styles";
import ErrorBoundary from "./src/components/ErrorBoundary";
import GlobalLoader from "./src/components/GlobalLoader";
import { ToastProvider } from "./src/store/ToastProvider";

function RootNavigation() {
  const { user, booting } = useAuth();

  if (booting) return <GlobalLoader message={"Initializing app…"} />;

  if (!user) return <AuthStack />;

  if (user.status !== "approved") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.pending}>
          <Text style={styles.title}>Approval pending</Text>
          <Text style={styles.muted}>Your registration was received. A community leader must approve your account before you can borrow tools.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <RootStack />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigation />
            </ToastProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
