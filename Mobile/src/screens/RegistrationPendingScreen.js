import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/styles";

export default function RegistrationPendingScreen({ route, navigation }) {
  const { joinCode } = route.params || {};

  return (
    <View style={styles.screen}>
      <View style={styles.pending}>
        <Text style={styles.title}>Registration submitted</Text>
        <Text style={styles.muted}>Your account was created and submitted for community admin approval.</Text>
        {joinCode ? <Text style={{ marginTop: 8 }}>Community join code: <Text style={styles.cardTitle}>{joinCode}</Text></Text> : null}
        <Text style={styles.muted}>An admin will review your request. You can sign in again after approval.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Login")}><Text style={styles.primaryButtonText}>Back to sign in</Text></TouchableOpacity>
      </View>
    </View>
  );
}
