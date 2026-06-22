import React, { useEffect, useState } from "react";
import { Image, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ChatScreen from "./ChatScreen";
import { pickAndUploadImage } from "../utils/imagePicker";

export default function BorrowingsScreen() {
  const [requests, setRequests] = useState([]);
  const [chatRequest, setChatRequest] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ type: "late_return", description: "", evidenceUrl: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api("/borrow-requests");
    setRequests(data.requests);
  }

  async function pickup(row) {
    await api(`/borrow-requests/${row._id}/pickup`, {
      method: "PATCH",
      body: JSON.stringify({ pickupChecklist: { safetyConfirmed: true, cleanConfirmed: true, notes: "Confirmed at pickup." } })
    });
    load();
  }

  async function returnTool(row) {
    await api(`/borrow-requests/${row._id}/return`, {
      method: "PATCH",
      body: JSON.stringify({ returnChecklist: { safetyConfirmed: true, cleanConfirmed: true, notes: "Returned with photo evidence pending." } })
    });
    load();
  }

  async function fileComplaint() {
    try {
      await api(`/borrow-requests/${complaint._id}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          type: complaintForm.type,
          description: complaintForm.description,
          evidenceUrls: complaintForm.evidenceUrl ? [complaintForm.evidenceUrl] : []
        })
      });
      setMessage("Complaint filed for admin review.");
      setComplaint(null);
      setComplaintForm({ type: "late_return", description: "", evidenceUrl: "" });
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function chooseEvidence() {
    try {
      setMessage("Uploading evidence...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setComplaintForm({ ...complaintForm, evidenceUrl: uploaded.url });
      setMessage(uploaded ? "Evidence attached." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <View>
      <ScreenHeader title="Borrowing Tracker" subtitle="Track requests, contact users, return items, and file complaints." />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {requests.map((row) => (
        <View style={styles.listItem} key={row._id}>
          <Text style={styles.cardTitle}>{row.tool?.name}</Text>
          <Text style={styles.muted}>{row.status} - escrow {row.escrowPoints} - priority {row.priorityScore}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setChatRequest(row)}><Text style={styles.secondaryButtonText}>Contact</Text></TouchableOpacity>
            {["picked_up", "overdue", "completed"].includes(row.status) ? (
              <TouchableOpacity style={styles.dangerButton} onPress={() => setComplaint(row)}><Text style={styles.primaryButtonText}>Complaint</Text></TouchableOpacity>
            ) : null}
          </View>
          {row.status === "approved" ? <TouchableOpacity style={styles.smallButton} onPress={() => pickup(row)}><Text style={styles.primaryButtonText}>Confirm pickup</Text></TouchableOpacity> : null}
          {row.status === "picked_up" ? <TouchableOpacity style={styles.smallButton} onPress={() => returnTool(row)}><Text style={styles.primaryButtonText}>Confirm return</Text></TouchableOpacity> : null}
        </View>
      ))}
      {!requests.length ? <Text style={styles.muted}>No borrowing activity yet.</Text> : null}

      <Modal visible={!!chatRequest} transparent animationType="slide">
        <View style={styles.modalShade}>
          {chatRequest ? <ChatScreen request={chatRequest} onClose={() => setChatRequest(null)} /> : null}
        </View>
      </Modal>

      <Modal visible={!!complaint} transparent animationType="slide">
        <View style={styles.modalShade}>
          <View style={styles.modalPanel}>
            <Text style={styles.title}>File complaint</Text>
            <Text style={styles.muted}>{complaint?.tool?.name}</Text>
            <View style={styles.chipWrap}>
              {["late_return", "damage", "missing_item", "other"].map((type) => (
                <TouchableOpacity key={type} style={[styles.chip, complaintForm.type === type && styles.chipActive]} onPress={() => setComplaintForm({ ...complaintForm, type })}>
                  <Text style={[styles.chipText, complaintForm.type === type && styles.chipTextActive]}>{type.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, styles.textArea]} value={complaintForm.description} onChangeText={(value) => setComplaintForm({ ...complaintForm, description: value })} placeholder="Describe what happened" multiline />
            {complaintForm.evidenceUrl ? <Image source={{ uri: complaintForm.evidenceUrl }} style={styles.previewImage} /> : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={chooseEvidence}><Text style={styles.secondaryButtonText}>{complaintForm.evidenceUrl ? "Change evidence photo" : "Choose evidence photo"}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dangerButtonWide} onPress={fileComplaint}><Text style={styles.primaryButtonText}>Submit complaint</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setComplaint(null)}><Text style={styles.link}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
