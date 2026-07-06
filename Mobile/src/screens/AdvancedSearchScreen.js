import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";

export default function AdvancedSearchScreen({ navigation, route }) {
  const initial = route.params?.initial || {};
  const [searchText, setSearchText] = useState(initial.searchText || "");
  const [categories, setCategories] = useState(initial.categories || []);
  const [condition, setCondition] = useState(initial.condition || "");
  const [trustMin, setTrustMin] = useState(initial.trustMin?.toString?.() || "");
  const [trustMax, setTrustMax] = useState(initial.trustMax?.toString?.() || "");
  const [availabilityWindow, setAvailabilityWindow] = useState(initial.availabilityWindow || "");
  const [sort, setSort] = useState(initial.sort || "newest");

  const [categoryOptions, setCategoryOptions] = useState([]);

  React.useEffect(() => {
    api("/tools/categories")
      .then((d) => setCategoryOptions(d.categories || []))
      .catch(() => {});
  }, []);

  const toggleCategory = (id) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const apply = () => {
    const payload = {
      searchText: searchText || undefined,
      categories: categories.length ? categories : undefined,
      condition: condition || undefined,
      trustMin: trustMin ? Number(trustMin) : undefined,
      trustMax: trustMax ? Number(trustMax) : undefined,
      availabilityWindow: availabilityWindow || undefined,
      sort
    };

    navigation.navigate("BrowseTools", { advancedFilters: payload });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Advanced search" subtitle="Refine by category, availability, trust, and sorting." />

        <View style={styles.panel}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            style={styles.input}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Keyword"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Categories (multi-select)</Text>
          <View style={styles.chipWrap}>
            {categoryOptions.map((c) => {
              const active = categories.includes(c._id);
              return (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleCategory(c._id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Condition</Text>
          <View style={styles.chipWrap}>
            {["", "excellent", "good", "fair"].map((c) => {
              const active = condition === c;
              return (
                <TouchableOpacity
                  key={c || "any"}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCondition(c)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c || "Any"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Owner trust score range</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>Min</Text>
              <TextInput style={styles.input} value={trustMin} onChangeText={setTrustMin} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>Max</Text>
              <TextInput style={styles.input} value={trustMax} onChangeText={setTrustMax} placeholder="100" keyboardType="numeric" />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Availability window</Text>
          <View style={styles.chipWrap}>
            {[
              { v: "", label: "Any" },
              { v: "today", label: "Today" },
              { v: "7", label: "Next 7 days" },
              { v: "30", label: "Next 30 days" }
            ].map((x) => {
              const active = availabilityWindow === x.v;
              return (
                <TouchableOpacity key={x.label} style={[styles.chip, active && styles.chipActive]} onPress={() => setAvailabilityWindow(x.v)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{x.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Sort</Text>
          <View style={styles.chipWrap}>
            {[
              { v: "newest", label: "Newest" },
              { v: "popular", label: "Most popular" },
              { v: "rated", label: "Highest rated" }
            ].map((x) => {
              const active = sort === x.v;
              return (
                <TouchableOpacity key={x.v} style={[styles.chip, active && styles.chipActive]} onPress={() => setSort(x.v)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{x.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={apply}>
          <Text style={styles.primaryButtonText}>Apply filters</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.ghostButton, { marginTop: 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

