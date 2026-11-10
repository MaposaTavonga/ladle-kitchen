// Take a photo or pick one from the gallery, ready to send to the AI.
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import type { Photo } from '@/lib/types';

/** Ask "Camera or Gallery?" and return the photo, or null if cancelled. */
export function choosePhoto(title = 'Add a photo'): Promise<Photo | null> {
  return new Promise(resolve => {
    Alert.alert(title, undefined, [
      { text: 'Take a photo', onPress: () => pick('camera').then(resolve) },
      { text: 'Choose from gallery', onPress: () => pick('library').then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}

export async function pick(source: 'camera' | 'library'): Promise<Photo | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', source === 'camera'
      ? 'Allow camera access in your phone settings to take a photo.'
      : 'Allow photo access in your phone settings to choose a photo.');
    return null;
  }
  // quality 0.5 keeps photos small enough to send quickly over mobile data
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.5, allowsEditing: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const a = res.canceled ? null : res.assets?.[0];
  if (!a?.base64) return null;
  return { uri: a.uri, base64: a.base64, mimeType: a.mimeType ?? 'image/jpeg' };
}
