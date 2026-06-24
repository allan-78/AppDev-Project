import React, { useState } from "react";
import { ImageBackground, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/styles";
import PrimaryButton from "../components/PrimaryButton";
import GlobalLoader from "../components/GlobalLoader";
import { useAuth } from "../store/AuthProvider";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("resident@neighborhood.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  async function submit() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground source={{ uri: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600" }} style={styles.authBg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.authOverlay}>
        <View style={styles.authPanel}>
          <Text style={styles.authTitle}>NeighborhoodShare</Text>
          <Text style={styles.authCopy}>Borrow trusted tools from verified neighbors.</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" keyboardType="email-address" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton onPress={submit} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</PrimaryButton>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}><Text style={styles.link}>Create resident account</Text></TouchableOpacity>
          {loading ? <GlobalLoader message={"Signing in..."} fullScreen /> : null}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
