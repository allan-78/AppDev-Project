import React, { useState } from "react";
import { ImageBackground, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { styles } from "../styles/styles";

export default function LoginScreen({ onLogin, onRegister }) {
  const [email, setEmail] = useState("resident@neighborhood.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ImageBackground source={{ uri: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600" }} style={styles.authBg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.authOverlay}>
        <View style={styles.authPanel}>
          <Text style={styles.authTitle}>NeighborhoodShare</Text>
          <Text style={styles.authCopy}>Borrow trusted tools from verified neighbors.</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>Sign in</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRegister}><Text style={styles.link}>Create resident account</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
