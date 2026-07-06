import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";

export default function RegistrationPendingScreen({ route, navigation }) {
  const { joinCode } = route.params || {};

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <View style={styles.authBg}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Animated.View style={{ alignItems: "center", opacity: fade, transform: [{ scale }] }}>
          {/* Success icon */}
          <View style={[styles.pendingIcon, { backgroundColor: "rgba(255,250,241,0.15)" }]}>
            <Ionicons name="checkmark-circle" size={38} color="#16a34a" />
          </View>

          <Text style={[styles.authLogoTitle, { fontSize: 24, textAlign: "center" }]}>Registration submitted</Text>

          <Text style={[styles.authLogoSub, { textAlign: "center", marginTop: 12, lineHeight: 22, fontSize: 15, color: "rgba(255,250,241,0.7)" }]}>
            Your account has been created and submitted for community admin approval.
          </Text>

          {joinCode ? (
            <View style={{ marginTop: 20, backgroundColor: "rgba(255,250,241,0.1)", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,250,241,0.5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>Community join code</Text>
              <Text style={{ color: "#fffaf1", fontSize: 22, fontWeight: "800", marginTop: 4, letterSpacing: 2 }}>{joinCode}</Text>
            </View>
          ) : null}

          <Text style={[styles.authLogoSub, { textAlign: "center", marginTop: 20, lineHeight: 20, color: "rgba(255,250,241,0.5)" }]}>
            An admin will review your request. You can sign in once your account is approved.
          </Text>
        </Animated.View>

        <View style={{ position: "absolute", bottom: 40, left: 24, right: 24 }}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#fffaf1" }]}
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryButtonText, { color: "#0b1f33" }]}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
