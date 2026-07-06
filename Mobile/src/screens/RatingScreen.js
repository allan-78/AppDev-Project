import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import theme from "../styles/theme";
import ScreenHeader from "../components/ScreenHeader";

export default function RatingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { borrowRequestId, toolName, ownerName, type } = route.params || {};

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRate = (stars) => {
    setRating(stars);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Please select a rating before submitting");
      return;
    }

    setLoading(true);
    try {
      await api("/ratings", {
        method: "POST",
        body: JSON.stringify({
          borrowRequestId,
          rating,
          review: reviewText.trim(),
          type: type || "borrower_to_lender"
        })
      });

      Alert.alert("Rating submitted", "Thank you for your feedback!", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 30 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRate(star)}
            style={{ marginHorizontal: 10 }}
            disabled={loading}
          >
            <Text
              style={{
                fontSize: 50,
                color: star <= rating ? theme.colors.gold : theme.colors.line
              }}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.ink }}>Rate Your Experience</Text>
      </View>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <View style={styles.authPanel}>

          {toolName && (
            <Text style={{ fontSize: 16, marginBottom: 10, color: theme.colors.slate }}>
              Tool: <Text style={{ fontWeight: "700", color: theme.colors.ink }}>
                {toolName}
              </Text>
            </Text>
          )}

          {ownerName && (
            <Text style={{ fontSize: 16, marginBottom: 20, color: theme.colors.slate }}>
              Lender: <Text style={{ fontWeight: "700", color: theme.colors.ink }}>
                {ownerName}
              </Text>
            </Text>
          )}

          <Text style={{ fontSize: 18, marginBottom: 10, textAlign: "center", fontWeight: "600", color: theme.colors.ink }}>
            Tap to rate
          </Text>

          {renderStars()}

          <Text
            style={{
              textAlign: "center",
              marginVertical: 10,
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.gold
            }}
          >
            {rating > 0 ? `${rating} star${rating !== 1 ? "s" : ""}` : "No rating yet"}
          </Text>

          <Text style={{ fontSize: 14, marginTop: 30, marginBottom: 8, fontWeight: "600", color: theme.colors.ink }}>
            Add a review (optional)
          </Text>
          <TextInput
            style={{
              ...styles.input,
              height: 120,
              textAlignVertical: "top"
            }}
            placeholder="Share your experience with this tool and lender..."
            placeholderTextColor={theme.colors.muted}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            editable={!loading}
            maxLength={500}
          />
          <Text style={{ fontSize: 12, marginTop: 4, color: theme.colors.muted, textAlign: "right" }}>
            {reviewText.length}/500 characters
          </Text>

          <TouchableOpacity
            style={{
              ...styles.primaryButton,
              marginTop: 30,
              opacity: loading ? 0.5 : 1
            }}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Rating</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              ...styles.ghostButton,
              marginTop: 10
            }}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
