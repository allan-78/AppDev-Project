import React, { useEffect, useState } from "react";
import { Image, Modal, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import ChatScreen from "./ChatScreen";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useAuth } from "../store/AuthProvider";

export default function BorrowingsScreen() {
  const [requests, setRequests] = useState([]);
  const [chatRequest, setChatRequest] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ type: "late_return", description: "", evidenceUrl: "" });
  const [returnModal, setReturnModal] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [message, setMessage] = useState("");
  const { user } = useAuth();

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
    // open modal to attach photo and submit return
    setReturnModal(row);
  }

  async function submitReturn(row, photoUrl) {
    try {
      await api(`/borrow-requests/${row._id}/return`, {
        method: "PATCH",
        body: JSON.stringify({ returnChecklist: { safetyConfirmed: true, cleanConfirmed: true, notes: "Returned with photo evidence pending.", photoEvidenceUrl: photoUrl } })
      });
      setMessage("Return submitted — awaiting owner verification.");
      setReturnModal(null);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function verifyReturn(row) {
    try {
      await api(`/borrow-requests/${row._id}/verify-return`, { method: "PATCH" });
      setMessage("Return verified. Escrow released.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
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
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Borrowing Tracker" subtitle="Track requests, contact users, return items, and file complaints." />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {requests.map((row) => (
        <View style={styles.listItem} key={row._id}>
          <Text style={styles.cardTitle}>{row.tool?.name}</Text>
          <Text style={styles.muted}>{row.status} - escrow {row.escrowPoints} - priority {row.priorityScore}</Text>
            {row.initialEvidenceUrl ? <Image source={{ uri: resolveUrl(row.initialEvidenceUrl) }} style={styles.previewImage} /> : null}
            {row.returnChecklist?.photoEvidenceUrl ? <Image source={{ uri: resolveUrl(row.returnChecklist.photoEvidenceUrl) }} style={styles.previewImage} /> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setChatRequest(row)}><Text style={styles.secondaryButtonText}>Contact</Text></TouchableOpacity>
            {["picked_up", "overdue", "completed", "returned"].includes(row.status) ? (
              <TouchableOpacity style={styles.dangerButton} onPress={() => setComplaint(row)}><Text style={styles.primaryButtonText}>Complaint</Text></TouchableOpacity>
            ) : null}
          </View>
          {row.status === "approved" ? <TouchableOpacity style={styles.smallButton} onPress={() => pickup(row)}><Text style={styles.primaryButtonText}>Confirm pickup</Text></TouchableOpacity> : null}
          {row.status === "picked_up" && row.borrower && row.borrower._id ? (
            <TouchableOpacity style={styles.smallButton} onPress={() => returnTool(row)}><Text style={styles.primaryButtonText}>Confirm return</Text></TouchableOpacity>
          ) : null}
          {row.status === "returned" && (String(row.owner?._id) === String(user?._id) || user?.role === "admin") ? (
            <TouchableOpacity style={styles.smallButton} onPress={() => verifyReturn(row)}><Text style={styles.primaryButtonText}>Verify return</Text></TouchableOpacity>
          ) : null}
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
      <Modal visible={!!returnModal} transparent animationType="slide">
        <View style={styles.modalShade}>
          <View style={styles.modalPanel}>
            <Text style={styles.cardTitle}>Submit return evidence</Text>
            <Text style={styles.muted}>{returnModal?.tool?.name}</Text>
            {returnModal?.returnChecklist?.photoEvidenceUrl ? <Image source={{ uri: returnModal.returnChecklist.photoEvidenceUrl }} style={styles.previewImage} /> : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={async () => {
              try {
                const uploaded = await pickAndUploadImage();
                if (uploaded) {
                  // attach and submit
                  await submitReturn(returnModal, uploaded.url);
                }
              } catch (err) { setMessage(err.message); }
            }}><Text style={styles.secondaryButtonText}>Attach photo and submit</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setReturnModal(null)}><Text style={styles.link}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
