import React, { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { pickAndUploadImage } from "../utils/imagePicker";

export default function ProfileScreen({ user, onLogout }) {
  const [profile, setProfile] = useState(user);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ avatarUrl: user.avatarUrl || "", bio: user.bio || "", phone: user.phone || "", address: user.address || "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [profileData, requestData] = await Promise.all([
      api("/users/profile"),
      api("/communities/requests")
    ]);
    setProfile(profileData.user);
    setRequests(requestData.requests);
    setForm({
      avatarUrl: profileData.user.avatarUrl || "",
      bio: profileData.user.bio || "",
      phone: profileData.user.phone || "",
      address: profileData.user.address || ""
    });
  }

  async function save() {
    try {
      const data = await api("/users/profile", { method: "PATCH", body: JSON.stringify(form) });
      setProfile(data.user);
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function chooseAvatar() {
    try {
      setMessage("Uploading profile picture...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setForm({ ...form, avatarUrl: uploaded.url });
      setMessage(uploaded ? "Profile picture attached. Save to apply it." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  const approved = requests.filter((item) => item.status === "approved");

  return (
    <View>
      <ScreenHeader title="Profile" subtitle="Identity, communities, trust signals, and social proof." />
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.profileCard}>
        <Image source={{ uri: profile.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" }} style={styles.avatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.cardTitle}>{profile.fullName}</Text>
          <Text style={styles.muted}>{profile.email}</Text>
          <Text style={styles.badge}>{profile.status}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statValue}>{profile.trustPoints}</Text><Text style={styles.muted}>Trust</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{profile.followers?.length || 0}</Text><Text style={styles.muted}>Followers</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{profile.following?.length || 0}</Text><Text style={styles.muted}>Following</Text></View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Edit profile</Text>
        {form.avatarUrl ? <Image source={{ uri: form.avatarUrl }} style={styles.previewImage} /> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={chooseAvatar}><Text style={styles.secondaryButtonText}>{form.avatarUrl ? "Change profile picture" : "Choose profile picture"}</Text></TouchableOpacity>
        <TextInput style={[styles.input, styles.textArea]} value={form.bio} onChangeText={(value) => setForm({ ...form, bio: value })} placeholder="Short bio" multiline />
        <TextInput style={styles.input} value={form.phone} onChangeText={(value) => setForm({ ...form, phone: value })} placeholder="Phone" />
        <TextInput style={styles.input} value={form.address} onChangeText={(value) => setForm({ ...form, address: value })} placeholder="Address" />
        <TouchableOpacity style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Save profile</Text></TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Current community</Text>
        <Text style={styles.muted}>{profile.community?.name || "No community"}</Text>
        <Text style={styles.muted}>{profile.community?.location || ""}</Text>
      </View>

      <Text style={styles.sectionTitle}>Approved communities</Text>
      {approved.map((item) => (
        <View style={styles.listItem} key={item._id}>
          <Text style={styles.cardTitle}>{item.approvedCommunity?.name || item.name}</Text>
          <Text style={styles.muted}>{item.type} - join code {item.approvedCommunity?.joinCode || "pending"}</Text>
        </View>
      ))}
      {!approved.length ? <Text style={styles.muted}>No approved created communities yet.</Text> : null}

      <Text style={styles.sectionTitle}>Badges</Text>
      <View style={styles.chipWrap}>
        {(profile.badges?.length ? profile.badges : ["Verified resident", profile.trustPoints >= 100 ? "Trusted lender" : "Building trust"]).map((badge) => (
          <Text style={styles.chipActive} key={badge}>{badge}</Text>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onLogout}><Text style={styles.primaryButtonText}>Sign out</Text></TouchableOpacity>
    </View>
  );
}
