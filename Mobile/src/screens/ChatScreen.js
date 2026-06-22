import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, api, getAccessToken } from "../api/client";
import { styles } from "../styles/styles";

export default function ChatScreen({ request, onClose }) {
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api(`/messages/borrow-requests/${request._id}`);
    setThread(data.thread);
  }

  async function send() {
    if (!body.trim()) return;
    try {
      await api(`/messages/borrow-requests/${request._id}`, { method: "POST", body: JSON.stringify({ body }) });
      setBody("");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => { load().catch((err) => setMessage(err.message)); }, [request._id]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;
    const wsBase = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");
    const socket = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}&borrowRequest=${request._id}`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== "message") return;
      setThread((current) => current ? { ...current, messages: [...(current.messages || []), data.payload] } : current);
    };
    socket.onerror = () => setMessage("Live chat is reconnecting. Messages still send normally.");
    return () => socket.close();
  }, [request._id]);

  return (
    <View style={styles.modalPanel}>
      <Text style={styles.title}>Contact</Text>
      <Text style={styles.muted}>{request.tool?.name}</Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <View style={styles.chatBox}>
        {thread?.messages?.map((item) => (
          <View style={styles.chatBubble} key={item._id}>
            <Text style={styles.metaText}>{item.sender?.fullName || "Neighbor"}</Text>
            <Text style={styles.cardTitle}>{item.body}</Text>
          </View>
        ))}
        {!thread?.messages?.length ? <Text style={styles.muted}>No messages yet.</Text> : null}
      </View>
      <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Write a message" />
      <TouchableOpacity style={styles.primaryButton} onPress={send}><Text style={styles.primaryButtonText}>Send message</Text></TouchableOpacity>
      <TouchableOpacity onPress={onClose}><Text style={styles.link}>Close</Text></TouchableOpacity>
    </View>
  );
}
