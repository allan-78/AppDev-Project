import * as ImagePicker from "expo-image-picker";
import { uploadMedia } from "../api/client";

export async function pickAndUploadImage(options = {}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to choose an image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options.allowVideo ? ["images", "videos"] : ["images"],
    allowsEditing: !options.allowVideo,
    aspect: [4, 3],
    quality: 0.82
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  return uploadMedia(asset);
}
