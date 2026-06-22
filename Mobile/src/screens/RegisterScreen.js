import React, { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";

export default function RegisterScreen({ onSubmit, onLogin }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    joinCode: "GREEN123"
  });
  const [message, setMessage] = useState("");

  async function submit() {
    try {
      await onSubmit(form);
      setMessage("Registration submitted. Sign in after admin approval.");
    } catch (err) {
      setMessage(err.message);
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
          <TouchableOpacity style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>Submit registration</Text></TouchableOpacity>
          <TouchableOpacity onPress={onLogin}><Text style={styles.link}>Back to login</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
