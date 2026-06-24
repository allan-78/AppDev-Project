import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../store/AuthProvider";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", address: "", joinCode: "GREEN123" });
  const [message, setMessage] = useState("");
  const { register } = useAuth();

  async function submit() {
    try {
      await register(form);
      setMessage("Registration submitted. Sign in after admin approval.");
      navigation.navigate("Pending", { joinCode: form.joinCode });
    } catch (err) {
      setMessage(err?.message || "Registration failed");
    }
  }

  function field(key, placeholder, secure = false) {
    return <TextInput style={styles.input} value={form[key]} onChangeText={(value) => setForm({ ...form, [key]: value })} placeholder={placeholder} secureTextEntry={secure} autoCapitalize="none" />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Resident Registration" subtitle="Use your community join code and wait for admin approval." />
        <View style={styles.panel}>
          {field("fullName", "Full name")}
          {field("email", "Email")}
          {field("password", "Password", true)}
          {field("phone", "Phone")}
          {field("address", "Address")}
          {field("joinCode", "Community join code")}
          {message ? <Text style={styles.muted}>{message}</Text> : null}
          <PrimaryButton onPress={submit}>Submit registration</PrimaryButton>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Back to login</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
