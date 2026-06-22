import React, { useEffect, useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ToolCard from "../components/ToolCard";

export default function BrowseToolsScreen() {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [filters, setFilters] = useState({ search: "", category: "", condition: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const params = new URLSearchParams({ status: "available" });
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.condition) params.set("condition", filters.condition);
    const data = await api(`/tools?${params.toString()}`);
    setTools(data.tools);
  }

  async function requestTool() {
    const start = new Date();
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await api("/borrow-requests", {
      method: "POST",
      body: JSON.stringify({ tool: selected._id, startDate: start, endDate: end, requestNote })
    });
    setMessage("Borrow request sent.");
    setSelected(null);
  }

  useEffect(() => {
    Promise.all([load(), api("/tools/categories").then((data) => setCategories(data.categories))]).catch(console.error);
  }, []);

  return (
    <View>
      <ScreenHeader title="Browse Tools" subtitle="Search and filter available tools in your verified community." />
      <View style={styles.panel}>
        <TextInput style={styles.input} value={filters.search} onChangeText={(value) => setFilters({ ...filters, search: value })} placeholder="Search tools or descriptions" />
        <View style={styles.chipWrap}>
          <TouchableOpacity style={[styles.chip, !filters.category && styles.chipActive]} onPress={() => setFilters({ ...filters, category: "" })}><Text style={[styles.chipText, !filters.category && styles.chipTextActive]}>All</Text></TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity key={category._id} style={[styles.chip, filters.category === category._id && styles.chipActive]} onPress={() => setFilters({ ...filters, category: category._id })}>
              <Text style={[styles.chipText, filters.category === category._id && styles.chipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chipWrap}>
          {["", "excellent", "good", "fair"].map((condition) => (
            <TouchableOpacity key={condition || "any"} style={[styles.chip, filters.condition === condition && styles.chipActive]} onPress={() => setFilters({ ...filters, condition })}>
              <Text style={[styles.chipText, filters.condition === condition && styles.chipTextActive]}>{condition || "Any condition"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={load}><Text style={styles.secondaryButtonText}>Apply filters</Text></TouchableOpacity>
      </View>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {tools.map((tool) => <ToolCard key={tool._id} tool={tool} onPress={() => setSelected(tool)} />)}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalShade}>
          <View style={styles.modalPanel}>
            <Text style={styles.title}>{selected?.name}</Text>
            <Text style={styles.muted}>{selected?.description}</Text>
            <Text style={styles.points}>Escrow: {selected?.depositPoints} trust points</Text>
            <Text style={styles.muted}>Max days: {selected?.maxBorrowDays || 7} - ID check {selected?.requiresIdCheck ? "required" : "optional"}</Text>
            <Text style={styles.muted}>{selected?.rules}</Text>
            <TextInput style={styles.input} value={requestNote} onChangeText={setRequestNote} placeholder="Request note" />
            <TouchableOpacity style={styles.primaryButton} onPress={requestTool}><Text style={styles.primaryButtonText}>Request tomorrow</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.link}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
