import React, { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles/styles";
import ScreenHeader from "../components/ScreenHeader";
import { pickAndUploadImage } from "../utils/imagePicker";

export default function AddToolScreen() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    rules: "",
    depositPoints: "10",
    category: "",
    imageUrl: "",
    pickupLocation: "",
    availableWindows: "",
    securityNotes: "",
    maxBorrowDays: "7",
    condition: "good",
    requiresIdCheck: true,
    requiresPhotoEvidence: true
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/tools/categories").then((data) => {
      setCategories(data.categories);
      if (data.categories[0]) setForm((current) => ({ ...current, category: data.categories[0]._id }));
    }).catch(console.error);
  }, []);

  async function submit() {
    try {
      await api("/tools", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          depositPoints: Number(form.depositPoints),
          maxBorrowDays: Number(form.maxBorrowDays),
          images: [{ url: form.imageUrl, label: "listing" }]
        })
      });
      setMessage("Tool listed successfully.");
      setForm({ ...form, name: "", description: "", rules: "", imageUrl: "", pickupLocation: "", availableWindows: "", securityNotes: "" });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function chooseImage() {
    try {
      setMessage("Uploading image...");
      const uploaded = await pickAndUploadImage();
      if (uploaded) setForm({ ...form, imageUrl: uploaded.url });
      setMessage(uploaded ? "Image attached." : "");
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <View>
      <ScreenHeader title="List a Tool" subtitle="Earn trust by lending useful equipment to neighbors." />
      <View style={styles.panel}>
        <TextInput style={styles.input} value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Tool name" />
        <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(value) => setForm({ ...form, description: value })} placeholder="Description, inclusions, and current condition" multiline />
        {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={styles.previewImage} /> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={chooseImage}><Text style={styles.secondaryButtonText}>{form.imageUrl ? "Change listing photo" : "Choose listing photo"}</Text></TouchableOpacity>
        <TextInput style={[styles.input, styles.textArea]} value={form.rules} onChangeText={(value) => setForm({ ...form, rules: value })} placeholder="Borrowing rules" multiline />
        <TextInput style={styles.input} value={form.depositPoints} onChangeText={(value) => setForm({ ...form, depositPoints: value })} keyboardType="numeric" placeholder="Escrow points" />
        <TextInput style={styles.input} value={form.maxBorrowDays} onChangeText={(value) => setForm({ ...form, maxBorrowDays: value })} keyboardType="numeric" placeholder="Max borrow days" />
        <TextInput style={styles.input} value={form.pickupLocation} onChangeText={(value) => setForm({ ...form, pickupLocation: value })} placeholder="Pickup location" />
        <TextInput style={styles.input} value={form.availableWindows} onChangeText={(value) => setForm({ ...form, availableWindows: value })} placeholder="Available pickup windows" />
        <TextInput style={[styles.input, styles.textArea]} value={form.securityNotes} onChangeText={(value) => setForm({ ...form, securityNotes: value })} placeholder="Security notes, ID handoff, photo evidence" multiline />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipWrap}>
          {categories.map((category) => (
            <TouchableOpacity key={category._id} style={[styles.chip, form.category === category._id && styles.chipActive]} onPress={() => setForm({ ...form, category: category._id })}>
              <Text style={[styles.chipText, form.category === category._id && styles.chipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipWrap}>
          {["excellent", "good", "fair"].map((condition) => (
            <TouchableOpacity key={condition} style={[styles.chip, form.condition === condition && styles.chipActive]} onPress={() => setForm({ ...form, condition })}>
              <Text style={[styles.chipText, form.condition === condition && styles.chipTextActive]}>{condition}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, requiresIdCheck: !form.requiresIdCheck })}>
          <Text style={styles.cardTitle}>Require ID check</Text><Text style={styles.badge}>{form.requiresIdCheck ? "on" : "off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, requiresPhotoEvidence: !form.requiresPhotoEvidence })}>
          <Text style={styles.cardTitle}>Require pickup/return photos</Text><Text style={styles.badge}>{form.requiresPhotoEvidence ? "on" : "off"}</Text>
        </TouchableOpacity>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>Publish tool</Text></TouchableOpacity>
      </View>
    </View>
  );
}
