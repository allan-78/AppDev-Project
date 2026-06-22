import React, { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { pickAndUploadImage } from "../utils/imagePicker";

const communityTypes = ["Education", "Home", "Garden", "Sports", "Faith", "Business", "Safety", "Other"];

export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [post, setPost] = useState({ title: "", body: "", imageUrl: "" });
  const [request, setRequest] = useState({ name: "", type: "Education", location: "", description: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [postData, requestData] = await Promise.all([
      api("/communities/posts"),
      api("/communities/requests")
    ]);
    setPosts(postData.posts);
    setRequests(requestData.requests);
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

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <View>
      <ScreenHeader title="Community" subtitle="Your community feed, photos, and new community requests." />
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Share an update</Text>
        <TextInput style={styles.input} value={post.title} onChangeText={(value) => setPost({ ...post, title: value })} placeholder="Post title" />
        <TextInput style={[styles.input, styles.textArea]} value={post.body} onChangeText={(value) => setPost({ ...post, body: value })} placeholder="What is happening?" multiline />
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.previewImage} /> : null}
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

      <Text style={styles.sectionTitle}>My community requests</Text>
      {requests.map((item) => (
        <View style={styles.listItem} key={item._id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.muted}>{item.type} - {item.status} - {item.trustPointCost} points</Text>
          {item.approvedCommunity ? <Text style={styles.points}>Join code: {item.approvedCommunity.joinCode}</Text> : null}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Community feed</Text>
      {posts.map((item) => (
        <View style={styles.feedCard} key={item._id}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.feedImage} /> : null}
          <View style={styles.feedBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.muted}>{item.body}</Text>
            <Text style={styles.metaText}>By {item.author?.fullName || "Neighbor"}</Text>
          </View>
        </View>
      ))}
      {!posts.length ? <Text style={styles.muted}>No community posts yet.</Text> : null}
    </View>
  );
}
