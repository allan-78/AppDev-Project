import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthProvider";

export default function ActivityHistoryScreen({ navigation }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("tools"); // 'tools' or 'points'
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState({ trustTransactions: [], borrowRequests: [] });
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const data = await api("/users/activity");
            setActivity({
                trustTransactions: data.trustTransactions || [],
                borrowRequests: data.borrowRequests || []
            });
        } catch (err) {
            setError(err?.message || "Failed to load activity logs.");
        } finally {
            setLoading(false);
        }
    }

    async function onRefresh() {
        setRefreshing(true);
        try {
            const data = await api("/users/activity");
            setActivity({
                trustTransactions: data.trustTransactions || [],
                borrowRequests: data.borrowRequests || []
            });
        } catch (err) {
            setError(err?.message || "Failed to load activity logs.");
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function formatDateTime(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    function renderToolItem({ item }) {
        const currentUserId = user?._id?.toString() || user?.id?.toString();
        const borrowerId = (item.borrower?._id || item.borrower || "").toString();
        const isBorrower = borrowerId === currentUserId;
        const statusLabel = String(item.status || "").replace("_", " ").toUpperCase();
        const isRateable = item.status === "completed";
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Chat", { borrowRequestId: item._id })}
                style={[styles.listItem, { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, marginBottom: 10 }]}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: "#0b1f33" }]}>{item.tool?.name || "Tool Request"}</Text>
                        <Text style={styles.muted}>Status: {statusLabel}</Text>
                        <Text style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                    <Ionicons name="swap-horizontal-outline" size={20} color="#94733d" />
                </View>
                {isRateable && (
                    <TouchableOpacity
                        style={{ backgroundColor: "#94733d", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginTop: 10, alignSelf: "flex-start" }}
                        onPress={(e) => {
                            e.stopPropagation && e.stopPropagation();
                            navigation.navigate("Rating", {
                                borrowRequestId: item._id,
                                toolName: item.tool?.name,
                                ownerName: isBorrower ? item.owner?.fullName : item.borrower?.fullName,
                                type: isBorrower ? "borrower_to_lender" : "lender_to_borrower"
                            });
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Rate Experience</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    }

    function renderPointsItem({ item }) {
        const isAddition = item.amount > 0;
        return (
            <View style={[styles.listItem, { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, marginBottom: 10 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={[styles.cardTitle, { color: "#0b1f33" }]}>{item.reason || "Trust Swap"}</Text>
                        <Text style={styles.muted}>Type: {String(item.type || "").replace("_", " ")}</Text>
                        <Text style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: isAddition ? "#16a34a" : "#a43131" }}>
                            {isAddition ? "+" : ""}{item.amount} pts
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={22} color="#0b1f33" />
                </TouchableOpacity>
                <Text style={[styles.title, { marginLeft: 14, marginTop: 0, fontSize: 20 }]}>Activity & Points</Text>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: "row", paddingHorizontal: 18, marginBottom: 16, gap: 10 }}>
                <TouchableOpacity
                    style={[styles.smallButton, { flex: 1, backgroundColor: activeTab === "tools" ? "#0b1f33" : "#e8e3d9" }]}
                    onPress={() => setActiveTab("tools")}
                >
                    <Text style={{ color: activeTab === "tools" ? "#fff" : "#0b1f33", fontWeight: "700", textAlign: "center" }}>Tool Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.smallButton, { flex: 1, backgroundColor: activeTab === "points" ? "#0b1f33" : "#e8e3d9" }]}
                    onPress={() => setActiveTab("points")}
                >
                    <Text style={{ color: activeTab === "points" ? "#fff" : "#0b1f33", fontWeight: "700", textAlign: "center" }}>Trust Points</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#0b1f33" />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text style={[styles.error, { textAlign: "center" }]}>{error}</Text>
                    <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={loadData}>
                        <Text style={styles.secondaryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
                    data={activeTab === "tools" ? activity.borrowRequests : activity.trustTransactions}
                    keyExtractor={(item) => item._id}
                    renderItem={activeTab === "tools" ? renderToolItem : renderPointsItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0b1f33"]} tintColor="#0b1f33" />
                    }
                    ListEmptyComponent={
                        <Text style={[styles.muted, { textAlign: "center", marginTop: 40 }]}>
                            No history found.
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}
