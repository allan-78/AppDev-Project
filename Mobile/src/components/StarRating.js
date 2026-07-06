import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";

export default function StarRating({ rating = 0, onRate, size = 40, readonly = false, maxStars = 5 }) {
  const [animations] = useState(() =>
    Array.from({ length: maxStars }, () => new Animated.Value(1))
  );

  const handlePress = (star) => {
    if (readonly) return;
    onRate(star);
    // Animate the pressed star
    Animated.sequence([
      Animated.timing(animations[star - 1], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animations[star - 1], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => {
        const filled = star <= rating;
        return (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly}
            activeOpacity={readonly ? 1 : 0.7}
          >
            <Animated.Text
              style={[
                styles.star,
                {
                  fontSize: size,
                  color: filled ? "#f59e0b" : "#d1d5db",
                  transform: [{ scale: animations[star - 1] }],
                },
              ]}
            >
              ★
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  star: {
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});