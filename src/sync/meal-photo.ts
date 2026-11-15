import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

export type PhotoResult =
  | { readonly status: 'picked'; readonly uri: string }
  | { readonly status: 'cancelled' }
  | { readonly status: 'denied' }
  | { readonly status: 'failed' };

const PHOTO_QUALITY = 0.6;
const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: PHOTO_QUALITY };

function extensionOf(uri: string): string {
  const match = /\.(jpe?g|png|webp|heic)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * The picker hands back a file in the cache, which the phone may clear. The photo is
 * copied next to the app's own data so it stays. The web has no such folder, so the
 * picked address is kept as it is and lasts only for the visit.
 */
function keep(uri: string, mealId: string): string {
  if (Platform.OS === 'web') return uri;
  const safeId = mealId.replace(/[^\w-]/g, '_');
  const target = new File(Paths.document, `meal-${safeId}-${Date.now()}.${extensionOf(uri)}`);
  new File(uri).copySync(target);
  return target.uri;
}

/** Lets the family take or choose a photo of a meal. The photo never leaves the phone. */
export async function pickMealPhoto(source: PhotoSource, mealId: string): Promise<PhotoResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { status: 'cancelled' };
    return { status: 'picked', uri: keep(asset.uri, mealId) };
  } catch {
    return { status: 'failed' };
  }
}
