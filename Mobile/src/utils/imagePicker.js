import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../api/client";

export async function pickAndUploadImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to choose an image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.82
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  return uploadImage(asset);
}
