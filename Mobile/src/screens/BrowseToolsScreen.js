import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Text, TextInput, TouchableOpacity, View, FlatList, RefreshControl, ActivityIndicator, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlobalLoader from "../components/GlobalLoader";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ToolCard from "../components/ToolCard";
import { Ionicons } from "@expo/vector-icons";
import SkeletonLoader from "../components/SkeletonLoader";
import ProfileCardModal from "../components/ProfileCardModal";

export default function BrowseToolsScreen({ navigation, route }) {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", condition: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState(null);

  const advancedFilters = route?.params?.advancedFilters;

  const buildParams = useMemo(() => {
    const params = new URLSearchParams({ status: "available" });
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.condition) params.set("condition", filters.condition);
    if (advancedFilters?.searchText) params.set("search", advancedFilters.searchText);
    if (Array.isArray(advancedFilters?.categories) && advancedFilters.categories.length) {
      params.set("category", advancedFilters.categories.join(","));
    }
    if (advancedFilters?.condition) params.set("condition", advancedFilters.condition);
    if (typeof advancedFilters?.trustMin === "number") params.set("ownerTrustMin", String(advancedFilters.trustMin));
    if (typeof advancedFilters?.trustMax === "number") params.set("ownerTrustMax", String(advancedFilters.trustMax));
    if (advancedFilters?.availabilityWindow) params.set("availabilityWindow", advancedFilters.availabilityWindow);
    if (advancedFilters?.sort) params.set("sort", advancedFilters.sort);
    params.set("page", String(page));
    params.set("limit", "20");
    return params;
  }, [filters, page, advancedFilters]);

  async function load({ reset = false, isRefresh = false } = {}) {
    const effectiveSearch = advancedFilters?.searchText ?? filters.search;
    if (effectiveSearch && effectiveSearch.length > 0 && effectiveSearch.length < 2) {
      setMessage("Search must be at least 2 characters");
      return;
    }
    setMessage("");
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = buildParams;
      const data = await api(`/tools?${params.toString()}`);
      const nextTools = data.tools || [];
      if (reset) {
        setTools(nextTools);
      } else {
        setTools((prev) => [...prev, ...nextTools]);
      }
      setHasMore(nextTools.length >= 20);
    } catch (err) {
      setMessage(err?.message || "Failed to load tools");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api("/tools/categories").then((data) => setCategories(data.categories))
    ]).catch((e) => setMessage(e?.message || "Load failed"));
    load({ reset: true }).catch((e) => setMessage(e?.message || "Load failed"));
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const t = setTimeout(() => {
      setPage(1);
      load({ reset: true }).catch(() => {});
    }, 450);
    setSearchDebounceTimer(t);
    return () => clearTimeout(t);
  }, [filters.search]);

  const renderToolCard = ({ item }) => {
    const owner = item.owner;
    return (
      <TouchableOpacity
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          marginBottom: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#e2e8f0",
          shadowColor: "#0b1f33",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2
        }}
        onPress={() => navigation.navigate("ToolDetail", { tool: item })}
        activeOpacity={0.95}
      >
        {/* Tool Image */}
        {item.images && item.images[0] ? (
          <Image source={{ uri: resolveUrl(item.images[0].url) }} style={{ width: "100%", height: 160, backgroundColor: "#f1f5f9" }} />
        ) : (
          <View style={{ width: "100%", height: 120, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="construct" size={40} color="#cbd5e1" />
          </View>
        )}

        {/* Availability Badge */}
        <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: item.status === "available" ? "#059669" : "#ef4444", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{item.status}</Text>
        </View>

        {/* Owner Avatar Float */}
        {owner && (
          <TouchableOpacity
            style={{ position: "absolute", top: 114, left: 16, zIndex: 10 }}
            onPress={() => { setProfileModalUserId(owner._id); setProfileModalVisible(true); }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 3, borderColor: "#fff", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}>
              {owner.avatarUrl || owner.profilePicture ? (
                <Image source={{ uri: resolveUrl(owner.avatarUrl || owner.profilePicture) }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{(owner.fullName || "U").charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Content */}
        <View style={{ padding: 14, paddingTop: owner ? 16 : 14 }}>
          {/* Title & Category */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#0b1f33", flex: 1 }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ fontSize: 11, color: "#64748b", backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden" }}>
              {item.category?.name || "Tool"}
            </Text>
          </View>

          {/* Owner Name - Clickable */}
          {owner && (
            <TouchableOpacity onPress={() => { setProfileModalUserId(owner._id); setProfileModalVisible(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Ionicons name="person-outline" size={12} color="#3b82f6" />
              <Text style={{ fontSize: 11, color: "#3b82f6", fontWeight: "600" }}>{owner.fullName}</Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: owner.trustPoints > 100 ? "#059669" : "#f59e0b" }} />
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{owner.trustPoints || 0} pts</Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 16, marginBottom: 8 }} numberOfLines={2}>{item.description}</Text>

          {/* Bottom Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ backgroundColor: "#e8f7ef", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, color: "#059669", fontWeight: "700" }}>{item.depositPoints} pts</Text>
              </View>
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>{item.condition}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{item.maxBorrowDays || 7}d</Text>
            </View>
          </View>

          {/* Ratings */}
          {(item.avgRating || item.averageRating) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600" }}>
                {(item.avgRating || item.averageRating).toFixed(1)}
              </Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>({item.ratingCount || item.reviewCount || 0})</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryPills = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 2 }}>
        <TouchableOpacity
          style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: !filters.category ? "#0b1f33" : "#f1f5f9" }}
          onPress={() => setFilters({ ...filters, category: "" })}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: !filters.category ? "#fff" : "#64748b" }}>All</Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category._id}
            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filters.category === category._id ? "#0b1f33" : "#f1f5f9" }}
            onPress={() => setFilters({ ...filters, category: category._id })}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: filters.category === category._id ? "#fff" : "#64748b" }}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={tools}
        keyExtractor={(t) => t._id}
        renderItem={renderToolCard}
        contentContainerStyle={[styles.contentInner, { paddingBottom: 110 }]}
        onEndReachedThreshold={0.2}
        onEndReached={() => {
          if (!loading && hasMore) {
            setPage((p) => p + 1);
          }
        }}
        ListFooterComponent={
          loading && tools.length > 0 ? (
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0b1f33" />
              <Text style={[styles.muted, { marginTop: 6 }]}>Loading more...</Text>
            </View>
          ) : !hasMore && tools.length > 0 ? (
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={[styles.muted, { fontSize: 12 }]}>All tools loaded</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ reset: true, isRefresh: true })} colors={["#0b1f33"]} />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33" }}>Browse Tools</Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{tools.length} available in your community</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: viewMode === "grid" ? "#0b1f33" : "#f1f5f9", borderRadius: 8 }}
                  onPress={() => setViewMode("grid")}
                >
                  <Ionicons name="grid" size={18} color={viewMode === "grid" ? "#fff" : "#64748b"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: viewMode === "list" ? "#0b1f33" : "#f1f5f9", borderRadius: 8 }}
                  onPress={() => navigation.navigate("AdvancedSearch", { initial: {} })}
                >
                  <Ionicons name="options" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
                <Ionicons name="search" size={18} color="#94a3b8" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 14, color: "#0b1f33" }}
                  value={filters.search}
                  onChangeText={(value) => setFilters({ ...filters, search: value })}
                  placeholder="Search tools by name..."
                  placeholderTextColor="#94a3b8"
                />
                {filters.search ? (
                  <TouchableOpacity onPress={() => setFilters({ ...filters, search: "" })}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={{ backgroundColor: "#0b1f33", padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                onPress={() => load({ reset: true })}
              >
                <Ionicons name="filter" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Category Pills */}
            {renderCategoryPills()}

            {/* Condition Filter */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {["", "new", "like_new", "good", "fair"].map((condition) => (
                <TouchableOpacity
                  key={condition || "any"}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: filters.condition === condition ? "#0b1f33" : "#f1f5f9" }}
                  onPress={() => setFilters({ ...filters, condition })}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: filters.condition === condition ? "#fff" : "#64748b" }}>
                    {condition ? condition.replace("_", " ") : "Any"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {message ? (
              <View style={{ backgroundColor: "#fef2f2", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ color: "#ef4444", fontSize: 12 }}>{message}</Text>
              </View>
            ) : null}

            {loading && tools.length === 0 ? (
              <View style={{ paddingVertical: 20 }}>
                <SkeletonLoader variant="card" count={4} containerStyle={{ marginBottom: 12 }} />
              </View>
            ) : tools.length === 0 && !loading ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#0b1f33", marginTop: 12 }}>No tools found</Text>
                <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4 }}>Try adjusting your filters or search terms.</Text>
              </View>
            ) : null}
          </>
        }
      />

      {/* FAB Add Tool Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate("AddTool")}
        style={{ position: "absolute", right: 20, bottom: 100, backgroundColor: "#059669", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Profile Card Modal */}
      <ProfileCardModal
        visible={profileModalVisible}
        userId={profileModalUserId}
        onClose={() => { setProfileModalVisible(false); setProfileModalUserId(null); }}
        onMessage={(profile) => navigation.navigate("Chat", { user: profile })}
        onViewFullProfile={(profile) => { navigation.navigate("Profile", { userId: profile._id }); }}
      />
    </SafeAreaView>
  );
}