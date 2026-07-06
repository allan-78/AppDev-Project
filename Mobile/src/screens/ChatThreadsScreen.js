import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthProvider";
import SkeletonLoader from "../components/SkeletonLoader";

export default function ChatThreadsScreen({ navigation }) {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { user } = useAuth();

    async function loadThreads() {
        setLoading(true);
        setError("");
        try {
            const data = await api("/messages/dm");
            setThreads(data.threads || []);
        } catch (err) {
            setError(err?.message || "Failed to load chats.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadThreads();
    }, []);

    function getOtherParticipant(thread) {
        if (!thread || !user || !user._id) return null;
        const userId = user._id.toString();
        return (thread.participants || []).find((p) => p._id && p._id.toString() !== userId);
    }

    function getTimeLabel(dateStr) {
        if (!dateStr) return "";
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return "now";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    // Filter threads to only those with valid other participants
    const validThreads = threads.filter((t) => getOtherParticipant(t) !== null);

    function renderThread({ item }) {
        const other = getOtherParticipant(item);

        const lastMsg = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
        const timeLabel = getTimeLabel(item.lastMessageAt || item.updatedAt);
        const isUnread = item.unreadCount > 0;

        return (
            <TouchableOpacity
                style={{
                    backgroundColor: "#ffffff",
                    padding: 14,
                    borderRadius: 16,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 2
                }}
                onPress={() => navigation.navigate("Chat", { dm: { threadId: item._id, otherUser: other } })}
            >
                {/* Avatar */}
                <View style={{ position: "relative" }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#f1f5f9", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                        {other.avatarUrl || other.profilePicture ? (
                            <Image source={{ uri: resolveUrl(other.avatarUrl || other.profilePicture) }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                        ) : (
                            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#0b1f33", alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{(other.fullName || "U").charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    {isUnread && (
                        <View style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3b82f6", borderWidth: 2, borderColor: "#fff" }} />
                    )}
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: isUnread ? "800" : "600", color: "#0b1f33" }}>
                            {other.fullName}
                        </Text>
                        {timeLabel ? (
                            <Text style={{ fontSize: 11, color: isUnread ? "#3b82f6" : "#94a3b8", fontWeight: isUnread ? "700" : "400" }}>
                                {timeLabel}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: isUnread ? "#0b1f33" : "#64748b", marginTop: 2 }} numberOfLines={1}>
                        {lastMsg
                            ? `${lastMsg.sender === user._id || lastMsg.sender?._id === user._id ? "You: " : ""}${lastMsg.body}`
                            : "Start a conversation"}
                    </Text>
                    {isUnread && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <View style={{ backgroundColor: "#3b82f6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{item.unreadCount} new</Text>
                            </View>
                        </View>
                    )}
                </View>

                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
        );
    }

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#fff" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#0b1f33" />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 14 }}>
                        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0b1f33" }}>Messages</Text>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>{validThreads.length} conversation{validThreads.length !== 1 ? "s" : ""}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={loadThreads} style={{ padding: 8, backgroundColor: "#f1f5f9", borderRadius: 8 }}>
                    <Ionicons name="refresh" size={18} color="#0b1f33" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ padding: 18 }}>
                    <SkeletonLoader variant="listItem" count={4} containerStyle={{ marginBottom: 10 }} />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
                    <Text style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginTop: 8 }}>{error}</Text>
                    <TouchableOpacity style={{ marginTop: 12, backgroundColor: "#0b1f33", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} onPress={loadThreads}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
                    data={validThreads}
                    keyExtractor={(item) => item._id}
                    renderItem={renderThread}
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 24 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#94a3b8" />
                            </View>
                            <Text style={{ textAlign: "center", marginTop: 12, fontSize: 16, fontWeight: "700", color: "#0b1f33" }}>
                                No messages yet
                            </Text>
                            <Text style={{ textAlign: "center", marginTop: 4, fontSize: 13, color: "#94a3b8", lineHeight: 18 }}>
                                Tap the message icon on a neighbor's post or profile to start chatting.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}