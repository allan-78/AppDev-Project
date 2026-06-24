import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlobalLoader from "../components/GlobalLoader";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ToolCard from "../components/ToolCard";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing } from "react-native";

export default function BrowseToolsScreen({ navigation }) {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", condition: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (filters.search && filters.search.length > 0 && filters.search.length < 2) {
      setMessage("Search must be at least 2 characters");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "available" });
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.condition) params.set("condition", filters.condition);
      const data = await api(`/tools?${params.toString()}`);
      setTools(data.tools || []);
    } catch (err) {
      setMessage(err?.message || "Failed to load tools");
    } finally {
      setLoading(false);
    }
  }

  // Borrow requests are handled in ToolDetail screen now.

  useEffect(() => {
    Promise.all([api("/tools/categories").then((data) => setCategories(data.categories)), load()]).catch((e) => setMessage(e?.message || "Load failed"));
  }, []);

  const scale = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Browse Tools" subtitle="Search and filter available tools in your verified community." />
      <View style={styles.panel}>
        <TextInput
          style={styles.input}
          value={filters.search}
          onChangeText={(value) => setFilters({ ...filters, search: value })}
          placeholder="Search tools or descriptions"
          accessibilityLabel="Search tools"
        />
        <View style={styles.chipWrap}>
          <TouchableOpacity style={[styles.chip, !filters.category && styles.chipActive]} onPress={() => setFilters({ ...filters, category: "" })}><Text style={[styles.chipText, !filters.category && styles.chipTextActive]}>All</Text></TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category._id}
              style={[styles.chip, filters.category === category._id && styles.chipActive]}
              onPress={() => setFilters({ ...filters, category: category._id })}
              accessibilityRole="button"
              accessibilityLabel={`Category ${category.name}`}
              accessibilityState={{ selected: filters.category === category._id }}
            >
              <Text style={[styles.chipText, filters.category === category._id && styles.chipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chipWrap}>
            {["", "excellent", "good", "fair"].map((condition) => (
              <TouchableOpacity
                key={condition || "any"}
                style={[styles.chip, filters.condition === condition && styles.chipActive]}
                onPress={() => setFilters({ ...filters, condition })}
                accessibilityRole="button"
                accessibilityLabel={`Condition ${condition || 'Any'}`}
                accessibilityState={{ selected: filters.condition === condition }}
              >
                <Text style={[styles.chipText, filters.condition === condition && styles.chipTextActive]}>{condition || "Any condition"}</Text>
              </TouchableOpacity>
            ))}
        </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={load} accessibilityRole="button" accessibilityLabel="Apply filters">
            <Text style={styles.secondaryButtonText}>Apply filters</Text>
          </TouchableOpacity>
      </View>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {loading ? <GlobalLoader message={"Loading tools..."} /> : null}
      {tools.map((tool) => <ToolCard key={tool._id} tool={tool} onPress={() => navigation?.navigate ? navigation.navigate("ToolDetail", { tool }) : null} />)}
        {/* Detail and request handled in ToolDetail screen */}
      <Animated.View style={{ transform: [{ scale }], position: "absolute", right: 20, bottom: 96 }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="List a new tool"
        onPress={() => navigation.navigate("AddTool")}
        style={{ backgroundColor: "#059669", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6 }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
