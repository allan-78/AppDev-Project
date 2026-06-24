import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/styles";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // TODO: send to logging service
    console.warn("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.muted}>{String(this.state.error)}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
