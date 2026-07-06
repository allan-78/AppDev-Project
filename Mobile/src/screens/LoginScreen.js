import React, { useState, useEffect, useRef } from "react";
import { Animated, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";
import PrimaryButton from "../components/PrimaryButton";
import GlobalLoader from "../components/GlobalLoader";
import { useAuth } from "../store/AuthProvider";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Entrance animation
  const logoFade = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(40)).current;
  const panelFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(panelFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(panelSlide, { toValue: 0, duration: 500, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  async function submit() {
    if (loading) return;
    setError("");
    if (!email.trim()) return setError("Enter your email address.");
    if (!password) return setError("Enter your password.");
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err?.message || "Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.authBg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.authOverlay}>
        {/* Logo area — dark navy background */}
        <Animated.View style={[styles.authLogo, { opacity: logoFade }]}>
          <View style={styles.authLogoMark}>
            <Ionicons name="home-outline" size={26} color="#0b1f33" />
          </View>
          <Text style={styles.authLogoTitle}>NeighborhoodShare</Text>
          <Text style={styles.authLogoSub}>Verified community lending</Text>
        </Animated.View>

        {/* Auth panel — cream card sliding from bottom */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View style={[styles.authPanel, { opacity: panelFade, transform: [{ translateY: panelSlide }] }]}>
            <Text style={styles.authTitle}>Sign in</Text>
            <Text style={styles.authCopy}>Access your borrowing dashboard and trusted community tools.</Text>

            <View style={styles.authDivider} />

            <Text style={styles.authInputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholder="your@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="Email address"
            />

            <Text style={styles.authInputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                autoComplete="password"
                accessibilityLabel="Password"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton onPress={submit} disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </PrimaryButton>

            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>Create a resident account</Text>
            </TouchableOpacity>

            {loading ? <GlobalLoader message="Signing in…" fullScreen /> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
