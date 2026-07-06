import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{String(this.state.error)}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: "#0b1f33" },
  message: { fontSize: 14, color: "#64748b", marginBottom: 24, textAlign: "center" },
  retryButton: { backgroundColor: "#0b1f33", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});