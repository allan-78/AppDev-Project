import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../store/AuthProvider";

export default function UserProfileScreen({ route, navigation }) {
  const userId = route.params?.userId;
  const [profile, setProfile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!userId) return;
    api(`/users/${userId}`).then((d) => setProfile(d.user)).catch((e) => Alert.alert("Error", e.message || "Failed to load profile"));
  }, [userId]);

  function isFollowing() {
    if (!profile || !user) return false;
    return (profile.followers || []).some((id) => (typeof id === 'string' ? id === user._id : id._id === user._id));
  }

  async function toggleFollow() {
    if (!profile || !user) return;
    try {
      const action = isFollowing() ? 'unfollow' : 'follow';
      await api(`/users/${profile._id}/${action}`, { method: 'POST' });
      const d = await api(`/users/${profile._id}`);
      setProfile(d.user);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to follow/unfollow');
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}><ScreenHeader title="Profile" /><Text style={styles.muted}>Loading...</Text></SafeAreaView>
    );
  }

  const isMe = user && profile && (profile._id === user._id || profile._id === user._id?.toString());

  async function startDM(userId) {
    try {
      const d = await api(`/messages/dm/thread/${userId}`, { method: 'POST' });
      const thread = d.thread;
      const other = (thread.participants || []).find((p) => p._id !== user._id);
      navigation.navigate('Chat', { dm: { threadId: thread._id, otherUser: other } });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to start direct message');
    }
  }

  if (isMe) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: 'rgba(0,0,0,0.06)' }]}> 
        <View style={{ flex: 1 }} />
        <View style={{ height: '50%', backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 18 }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Image source={{ uri: resolveUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }} style={styles.avatar} />
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{profile.fullName}</Text>
            <Text style={styles.muted}>Trust: {profile.trustPoints}</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.muted}>{profile.bio || 'No bio yet.'}</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.muted}>{profile.phone || '—'}</Text>
            <Text style={styles.muted}>{profile.address || '—'}</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Community</Text>
            <Text style={styles.muted}>{profile.community?.name || 'None'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View>
              <Text style={styles.label}>Followers</Text>
              <Text style={styles.cardTitle}>{profile.followers?.length || 0}</Text>
            </View>
            <View>
              <Text style={styles.label}>Following</Text>
              <Text style={styles.cardTitle}>{profile.following?.length || 0}</Text>
            </View>
            <View>
              <Text style={styles.label}>Trust</Text>
              <Text style={styles.cardTitle}>{profile.trustPoints}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentInner}>
        <ScreenHeader title={profile.fullName || 'User'} subtitle={profile.community?.name} />
        <View style={styles.profileCard}>
          <Image source={{ uri: resolveUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.cardTitle}>{profile.fullName}</Text>
            <Text style={styles.muted}>Trust: {profile.trustPoints}</Text>
            <Text style={styles.muted}>{profile.bio}</Text>
            <Text style={styles.muted}>{profile.address}</Text>
            <Text style={styles.muted}>{profile.phone}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity style={styles.primaryButton} onPress={toggleFollow}><Text style={styles.primaryButtonText}>{isFollowing() ? 'Unfollow' : 'Follow'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => startDM(profile._id)}><Text style={styles.secondaryButtonText}>Message</Text></TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <Text style={styles.cardTitle}>Social</Text>
          <Text style={styles.muted}>Followers: {profile.followers?.length || 0}</Text>
          <Text style={styles.muted}>Following: {profile.following?.length || 0}</Text>
          <Text style={[styles.label, { marginTop: 8 }]}>Communities</Text>
          <Text style={styles.muted}>{profile.community?.name || 'None'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
