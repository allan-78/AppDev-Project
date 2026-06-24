import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Image } from "react-native";
import { API_URL, api, getAccessToken, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";

// ChatScreen supports two modes:
// - borrow request mode: pass `request` prop (old usage/modal)
// - DM mode: navigate to screen with route.params.dm = { threadId }
export default function ChatScreen(props) {
  const request = props.request;
  const route = props.route;
  const navigation = props.navigation;
  const dmParam = route?.params?.dm;

  const [thread, setThread] = useState(null);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  const isDM = !!(dmParam || props.dm);
  const threadId = dmParam?.threadId || props.dm?.threadId;

  async function loadBorrowThread() {
    const data = await api(`/messages/borrow-requests/${request._id}`);
    setThread(data.thread);
  }

  async function loadDMThread() {
    const data = await api(`/messages/dm/${threadId}`);
    setThread(data.thread);
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
    if (isDM && threadId) loadDMThread().catch((err) => setMessage(err.message));
    if (!isDM && request) loadBorrowThread().catch((err) => setMessage(err.message));
  }, [request?._id, threadId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;
    const wsBase = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");
    const socketUrl = isDM && threadId ? `${wsBase}/ws?token=${encodeURIComponent(token)}` : `${wsBase}/ws?token=${encodeURIComponent(token)}&borrowRequest=${request?._id}`;
    const socket = new WebSocket(socketUrl);
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
    socket.onerror = () => setMessage("Live chat is reconnecting. Messages still send normally.");
    return () => socket.close();
  }, [request?._id, threadId]);

  const send = isDM ? sendDM : sendBorrow;

  return (
    <View style={styles.modalPanel}>
      <Text style={styles.title}>{isDM ? 'Direct message' : 'Contact'}</Text>
      {!isDM ? <Text style={styles.muted}>{request.tool?.name}</Text> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <View style={styles.chatBox}>
        {thread?.messages?.map((item) => (
          <View style={styles.chatBubble} key={item._id}>
            <Text style={styles.metaText}>{item.sender?.fullName || "Neighbor"}</Text>
            {item.imageUrl ? <Image source={{ uri: resolveUrl(item.imageUrl) }} style={styles.previewImage} /> : null}
            <Text style={styles.cardTitle}>{item.body}</Text>
          </View>
        ))}
        {!thread?.messages?.length ? <Text style={styles.muted}>No messages yet.</Text> : null}
      </View>
      <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Write a message" />
      <TouchableOpacity style={styles.primaryButton} onPress={send}><Text style={styles.primaryButtonText}>Send message</Text></TouchableOpacity>
      {props.onClose ? <TouchableOpacity onPress={props.onClose}><Text style={styles.link}>Close</Text></TouchableOpacity> : null}
      {!props.onClose && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Back</Text></TouchableOpacity>}
    </View>
  );
}
