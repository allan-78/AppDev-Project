import React, { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { resolveUrl, api } from "../api/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { pickAndUploadImage } from "../utils/imagePicker";
import { useAuth } from "../store/AuthProvider";
import { useNavigation } from "@react-navigation/native";

const communityTypes = ["Education", "Home", "Garden", "Sports", "Faith", "Business", "Safety", "Other"];

export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [post, setPost] = useState({ title: "", body: "", imageUrl: "" });
  const [request, setRequest] = useState({ name: "", type: "Education", location: "", description: "" });
  const [join, setJoin] = useState({ joinCode: "", idImageUrl: "", answers: { tenureDays: "" } });
  const [message, setMessage] = useState("");

  async function load() {
    const [postData, requestData, joinReqData] = await Promise.all([
      api("/communities/posts"),
      api("/communities/requests"),
      api("/communities/join-requests")
    ]);
    setPosts(postData.posts);
    setRequests(requestData.requests);
    setJoinRequests(joinReqData.requests || []);
  }

  async function createPost() {
    try {
      await api("/communities/posts", { method: "POST", body: JSON.stringify(post) });
      setPost({ title: "", body: "", imageUrl: "" });
      setMessage("Posted to your community.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function choosePostImage() {
    try {
      setMessage("Uploading image...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setPost({ ...post, imageUrl: uploaded.url });
      setMessage(uploaded ? "Image attached." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function requestCommunity() {
    try {
      await api("/communities/requests", { method: "POST", body: JSON.stringify(request) });
      setRequest({ name: "", type: "Education", location: "", description: "" });
      setMessage("Community request sent for admin review. Approval costs 50 trust points.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitJoin() {
    try {
      if (!join.joinCode) return setMessage("Enter a join code.");
      if (!join.idImageUrl) return setMessage("Attach an ID photo before joining.");
      await api("/communities/join-requests", { method: "POST", body: JSON.stringify({ joinCode: join.joinCode, idImageUrl: join.idImageUrl, answers: join.answers }) });
      setJoin({ joinCode: "", idImageUrl: "", answers: { tenureDays: "" } });
      setMessage("Join request submitted for admin review.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function uploadJoinID() {
    try {
      setMessage("Uploading ID...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setJoin({ ...join, idImageUrl: uploaded.url });
      setMessage(uploaded ? "ID attached." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  const { user } = useAuth();
  const navigation = useNavigation();

  async function startDM(userId) {
    try {
      const d = await api(`/messages/dm/thread/${userId}`, { method: 'POST' });
      const thread = d.thread;
      const other = (thread.participants || []).find((p) => p._id !== user._id);
      navigation.navigate('Chat', { dm: { threadId: thread._id, otherUser: other } });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function reviewJoinRequest(id, decision) {
    try {
      await api(`/communities/join-requests/${id}/review`, { method: "PATCH", body: JSON.stringify({ decision }) });
      setMessage(`Join request ${decision}`);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title="Community" subtitle="Your community feed, photos, and new community requests." />
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Share an update</Text>
        <TextInput style={styles.input} value={post.title} onChangeText={(value) => setPost({ ...post, title: value })} placeholder="Post title" />
        <TextInput style={[styles.input, styles.textArea]} value={post.body} onChangeText={(value) => setPost({ ...post, body: value })} placeholder="What is happening?" multiline />
        {post.imageUrl ? <Image source={{ uri: resolveUrl(post.imageUrl) }} style={styles.previewImage} /> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={choosePostImage}><Text style={styles.secondaryButtonText}>{post.imageUrl ? "Change post photo" : "Choose post photo"}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={createPost}><Text style={styles.primaryButtonText}>Post update</Text></TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Create a new community</Text>
        <Text style={styles.muted}>Requires admin approval and 50 trust points after approval.</Text>
        <TextInput style={styles.input} value={request.name} onChangeText={(value) => setRequest({ ...request, name: value })} placeholder="Community name" />
        <View style={styles.chipWrap}>
          {communityTypes.map((type) => (
            <TouchableOpacity key={type} style={[styles.chip, request.type === type && styles.chipActive]} onPress={() => setRequest({ ...request, type })}>
              <Text style={[styles.chipText, request.type === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} value={request.location} onChangeText={(value) => setRequest({ ...request, location: value })} placeholder="Location" />
        <TextInput style={[styles.input, styles.textArea]} value={request.description} onChangeText={(value) => setRequest({ ...request, description: value })} placeholder="Purpose and rules" multiline />
        <TouchableOpacity style={styles.secondaryButton} onPress={requestCommunity}><Text style={styles.secondaryButtonText}>Request admin approval</Text></TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Join a community</Text>
        <Text style={styles.muted}>Enter the community join code and provide a valid ID for admin review.</Text>
        <TextInput style={styles.input} value={join.joinCode} onChangeText={(value) => setJoin({ ...join, joinCode: value })} placeholder="Join code (e.g. GREEN123)" />
        {join.idImageUrl ? <Image source={{ uri: resolveUrl(join.idImageUrl) }} style={styles.previewImage} /> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={uploadJoinID}><Text style={styles.secondaryButtonText}>{join.idImageUrl ? "Change ID photo" : "Upload ID photo"}</Text></TouchableOpacity>
        <Text style={{ marginTop: 8, fontWeight: "800" }}>How many days have you been in this community?</Text>
        <TextInput style={styles.input} value={join.answers.tenureDays} onChangeText={(value) => setJoin({ ...join, answers: { ...join.answers, tenureDays: value } })} placeholder="e.g. 365" keyboardType="numeric" />
        <TouchableOpacity style={styles.primaryButton} onPress={submitJoin}><Text style={styles.primaryButtonText}>Submit join request</Text></TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>My community requests</Text>
      {requests.map((item) => (
        <View style={styles.listItem} key={item._id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.muted}>{item.type} - {item.status} - {item.trustPointCost} points</Text>
          {item.approvedCommunity ? <Text style={styles.points}>Join code: {item.approvedCommunity.joinCode}</Text> : null}
        </View>
      ))}

      {user && ["admin","superAdmin"].includes(user.role) ? (
        <>
          <Text style={styles.sectionTitle}>Pending join requests</Text>
          {joinRequests.map((r) => (
            <View style={styles.listItem} key={r._id}>
              <Text style={styles.cardTitle}>{r.community?.name}</Text>
              <Text style={styles.muted}>Applicant: {r.applicant?.fullName} ({r.applicant?.email})</Text>
              {r.idImageUrl ? <Image source={{ uri: resolveUrl(r.idImageUrl) }} style={styles.previewImage} /> : null}
              <Text style={styles.muted}>Answers:</Text>
              {r.answers && Object.entries(r.answers).map(([k,v]) => (<Text key={k} style={styles.muted}>{k}: {v}</Text>))}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.ghostButton} onPress={() => reviewJoinRequest(r._id, "approved")}><Text style={styles.secondaryButtonText}>Approve</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => reviewJoinRequest(r._id, "rejected")}><Text style={styles.primaryButtonText}>Reject</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Community feed</Text>
      {posts.map((item) => (
        <View style={styles.feedCard} key={item._id}>
          {item.imageUrl ? <Image source={{ uri: resolveUrl(item.imageUrl) }} style={styles.feedImage} /> : null}
          <View style={styles.feedBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.muted}>{item.body}</Text>
            <Text style={styles.metaText}>By {item.author?.fullName || "Neighbor"}</Text>
            {item.author && user && item.author._id !== user._id ? (
              <TouchableOpacity style={styles.ghostButton} onPress={() => startDM(item.author._id)}><Text style={styles.secondaryButtonText}>Message</Text></TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}
        {!posts.length ? <Text style={styles.muted}>No community posts yet.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
