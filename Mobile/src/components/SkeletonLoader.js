import React, { useMemo } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

const SkeletonBlock = ({ style, shimmer }) => {
  const shimmerTranslateX = useMemo(() => new Animated.Value(-1), []);

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerTranslateX, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ).start();
  }, [shimmerTranslateX]);

  if (!shimmer) {
    return <View style={[styles.block, style]} />;
  }

  return (
    <View style={[styles.block, style, { overflow: "hidden" }]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [
            {
              translateX: shimmerTranslateX.interpolate({
                inputRange: [-1, 1],
                outputRange: [-120, 120]
              })
            }
          ],
          backgroundColor: "rgba(255,255,255,0.55)"
        }}
      />
    </View>
  );
};

export default function SkeletonLoader({
  variant = "card",
  count = 3,
  shimmer = true,
  containerStyle,
  itemStyle
}) {
  const renderItem = (idx) => {
    if (variant === "profile") {
      return (
        <View key={idx} style={[styles.row, itemStyle]}>
          <SkeletonBlock style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12 }} shimmer={shimmer} />
          <View style={{ flex: 1, gap: 10 }}>
            <SkeletonBlock style={{ width: "65%", height: 16, borderRadius: 8 }} shimmer={shimmer} />
            <SkeletonBlock style={{ width: "45%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
            <SkeletonBlock style={{ width: "70%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
          </View>
        </View>
      );
    }

    if (variant === "listItem") {
      return (
        <View key={idx} style={[styles.listItem, itemStyle]}>
          <SkeletonBlock style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }} shimmer={shimmer} />
          <View style={{ flex: 1, gap: 10 }}>
            <SkeletonBlock style={{ width: "78%", height: 16, borderRadius: 8 }} shimmer={shimmer} />
            <SkeletonBlock style={{ width: "58%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
            <SkeletonBlock style={{ width: "90%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
          </View>
        </View>
      );
    }

    if (variant === "stat") {
      return (
        <View key={idx} style={[styles.stat, itemStyle]}>
          <SkeletonBlock style={{ width: "55%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
          <SkeletonBlock style={{ width: "85%", height: 22, borderRadius: 12, marginTop: 12 }} shimmer={shimmer} />
        </View>
      );
    }

    // default card
    return (
      <View key={idx} style={[styles.card, itemStyle]}>
        <SkeletonBlock style={{ width: "100%", height: 160, borderRadius: 12 }} shimmer={shimmer} />
        <View style={{ padding: 12, gap: 10 }}>
          <SkeletonBlock style={{ width: "70%", height: 16, borderRadius: 8 }} shimmer={shimmer} />
          <SkeletonBlock style={{ width: "92%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
          <SkeletonBlock style={{ width: "55%", height: 14, borderRadius: 8 }} shimmer={shimmer} />
        </View>
      </View>
    );
  };

  return <View style={[styles.container, containerStyle]}>{Array.from({ length: count }).map((_, i) => renderItem(i))}</View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  block: {
    backgroundColor: "#e5e7eb"
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  row: {
    flexDirection: "row",
    alignItems: "center"
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc"
  },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc"
  }
});

