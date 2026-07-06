import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";

export default function OnboardingScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <View style={styles.authBg}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, opacity: fade, transform: [{ translateY: slide }] }}>
          {/* Logo mark */}
          <View style={[styles.authLogoMark, { width: 72, height: 72, borderRadius: 20, marginBottom: 20 }]}>
            <Ionicons name="home-outline" size={34} color="#0b1f33" />
          </View>

          <Text style={[styles.authLogoTitle, { fontSize: 28, textAlign: "center" }]}>NeighborhoodShare</Text>
          <Text style={[styles.authLogoSub, { textAlign: "center", marginTop: 10, lineHeight: 22, fontSize: 15 }]}>
            Borrow and lend with verified neighbors.{"\n"}Build trust. Share tools. Stay connected.
          </Text>

          {/* Feature highlights */}
          <View style={{ marginTop: 36, gap: 16, alignSelf: "stretch" }}>
            {[
              { icon: "shield-checkmark-outline", text: "Verified resident accounts" },
              { icon: "swap-horizontal-outline", text: "Trust-weighted borrowing" },
              { icon: "people-outline", text: "Community-driven sharing" }
            ].map((item) => (
              <View key={item.icon} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,250,241,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={20} color="#fffaf1" />
                </View>
                <Text style={{ color: "rgba(255,250,241,0.85)", fontSize: 15, fontWeight: "600" }}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Bottom buttons */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 28, gap: 12 }}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#fffaf1" }]}
            onPress={() => navigation.replace("Login")}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryButtonText, { color: "#0b1f33" }]}>Get started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
