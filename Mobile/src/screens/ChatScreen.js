import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, FlatList, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, api, getAccessToken, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";
import { pickAndUploadImage } from "../utils/imagePicker";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function ChatScreen(props) {
  const request = props.request;
  const route = props.route;
  const navigation = props.navigation;
  const dmParam = route?.params?.dm || props.dm;
  const userParam = route?.params?.user || props.user;
  const onClose = props.onClose;

  const flatListRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [thread, setThread] = useState(null);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const isDM = !!dmParam;
  const threadId = dmParam?.threadId;

  // Determine other user's name
  const otherUser = dmParam?.otherUser || userParam;
  const titleText = isDM ? (otherUser?.fullName || "Chat") : "Borrow Discussion";

  async function loadBorrowThread() {
    try {
      const data = await api(`/messages/borrow-requests/${request._id}`);
      setThread(data.thread);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDMThread() {
    try {
      const data = await api(`/messages/dm/${threadId}`);
      setThread(data.thread);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendBorrow() {
    if (!body.trim()) return;
    try {
      await api(`/messages/borrow-requests/${request._id}`, { method: "POST", body: JSON.stringify({ body }) });
      setBody("");
      loadBorrowThread();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function sendDM() {
    if (!body.trim()) return;
    try {
      await api(`/messages/dm/${threadId}`, { method: "POST", body: JSON.stringify({ body }) });
      setBody("");
      loadDMThread();
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    if (isDM && threadId) {
      loadDMThread().catch((err) => setMessage(err.message));
    }
    if (!isDM && request) {
      loadBorrowThread().catch((err) => setMessage(err.message));
    }
  }, [request?._id, threadId]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;
    
    let socket;
    let retryCount = 0;
    const maxRetries = 5;
    let isMounted = true;
    let reconnectTimer;

    function connect() {
      if (!isMounted) return;
      try {
        const wsBase = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");
        const socketUrl = isDM && threadId 
          ? `${wsBase}/ws?token=${encodeURIComponent(token)}` 
          : `${wsBase}/ws?token=${encodeURIComponent(token)}&borrowRequest=${request?._id}`;
        socket = new WebSocket(socketUrl);

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (isDM) {
            if (data.type !== "dm") return;
            if (data.payload.threadId !== threadId) return;
            setThread((current) => current ? { ...current, messages: [...(current.messages || []), data.payload] } : current);
          } else {
            if (data.type !== "message") return;
            setThread((current) => current ? { ...current, messages: [...(current.messages || []), data.payload] } : current);
          }
        };

        socket.onclose = () => {
          if (isMounted && retryCount < maxRetries) {
            retryCount++;
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (e) => {
          console.warn("WebSocket error:", e.message);
        };
      } catch (e) {
        console.warn("WS connect exception:", e.message);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (socket) socket.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [request?._id, threadId]);

  const send = isDM ? sendDM : sendBorrow;

  const currentUserId = getAccessToken() ? JSON.parse(atob(getAccessToken().split(".")[1])).userId : "";

  function renderMessageItem({ item }) {
    const sender = item.sender || {};
    const isMe = sender._id === currentUserId || sender === currentUserId;
    return (
      <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 12, paddingHorizontal: 16 }}>
        {!isMe ? (
          <Image
            source={{ uri: resolveUrl(sender.avatarUrl) || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80" }}
            style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: "#ccc" }}
          />
        ) : null}
        <View style={{
          backgroundColor: isMe ? "#0b1f33" : "#ffffff",
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 16,
          borderBottomRightRadius: isMe ? 2 : 16,
          borderBottomLeftRadius: isMe ? 16 : 2,
          maxWidth: "75%",
          shadowColor: "#0b1f33",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1
        }}>
          {!isMe ? (
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94733d", marginBottom: 2 }}>{sender.fullName || "Neighbor"}</Text>
          ) : null}
          {item.imageUrl ? (
            <Image source={{ uri: resolveUrl(item.imageUrl) }} style={{ width: 180, height: 120, borderRadius: 8, marginBottom: 6 }} />
          ) : null}
          <Text style={{ fontSize: 14, color: isMe ? "#ffffff" : "#0b1f33", lineHeight: 18 }}>{item.body}</Text>
          <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.55)" : "#94a3b8", marginTop: 4, alignSelf: isMe ? "flex-end" : "flex-start" }}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#f7f4ed" }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Custom Bar Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#ded8cc", backgroundColor: "#f7f4ed" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <TouchableOpacity onPress={() => (onClose ? onClose() : navigation.goBack())} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color="#0b1f33" />
            </TouchableOpacity>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0b1f33" }}>{titleText}</Text>
              {!isDM && request?.tool ? (
                <Text style={{ fontSize: 11, color: "#64748b" }} numberOfLines={1}>Regarding: {request.tool.name}</Text>
              ) : null}
              {!isDM && request?.status ? (
                <View style={{ backgroundColor: request.status === "approved" ? "#d1fae5" : request.status === "picked_up" ? "#dbeafe" : request.status === "returned" ? "#f0fdf4" : request.status === "rejected" ? "#fee2e2" : "#f1f5f9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 3, alignSelf: "flex-start" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: request.status === "approved" ? "#059669" : request.status === "picked_up" ? "#2563eb" : request.status === "returned" ? "#16a34a" : request.status === "rejected" ? "#ef4444" : "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{request.status.replace(/_/g, " ")}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {!isDM && ["completed", "returned"].includes(request?.status) && (request.borrower?._id === currentUserId || request.borrower === currentUserId) ? (
            <TouchableOpacity
              style={{ backgroundColor: "#94733d", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}
              onPress={() => {
                if (onClose) onClose();
                navigation.navigate("Rating", {
                  borrowRequestId: request._id,
                  toolName: request.tool?.name,
                  ownerName: request.owner?.fullName
                });
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Rate Tool</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {message ? (
          <View style={{ backgroundColor: "#fef2f2", padding: 10, alignSelf: "center", borderRadius: 8, marginVertical: 6, marginHorizontal: 16 }}>
            <Text style={{ color: "#b91c1c", fontSize: 12, textAlign: "center" }}>{message}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0b1f33" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1, marginTop: 12 }}
            data={thread?.messages || []}
            keyExtractor={(item, index) => item._id || `msg-${index}`}
            renderItem={renderMessageItem}
            ListEmptyComponent={
              <Text style={[styles.muted, { textAlign: "center", marginTop: 40 }]}>No messages yet. Say hello!</Text>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input area */}
        <View style={{ flexDirection: "row", padding: 12, borderTopWidth: 1, borderTopColor: "#ded8cc", backgroundColor: "#ffffff", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: "#f7f4ed", height: 40, paddingHorizontal: 14, borderRadius: 20 }]}
            value={body}
            onChangeText={setBody}
            placeholder="Write a message..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={{ width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", backgroundColor: "#f7f4ed" }}
            onPress={async () => {
              try {
                const result = await pickAndUploadImage();
                if (!result) return;
                const imageUrl = result.url || result;
                const endpoint = isDM ? `/messages/dm/${threadId}` : `/messages/borrow-requests/${request._id}`;
                await api(endpoint, { method: "POST", body: JSON.stringify({ body: "📷 Image", imageUrl }) });
                isDM ? loadDMThread() : loadBorrowThread();
              } catch (err) {
                setMessage(err.message);
              }
            }}
          >
            <Ionicons name="camera" size={20} color="#0b1f33" />
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: "#0b1f33", width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" }} onPress={send}>
            <Ionicons name="send" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
