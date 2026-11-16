import * as ImagePicker from 'expo-image-picker';

import type { PhotoSource } from './meal-photo';

export type FlyerMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export type FlyerPhoto =
  | { readonly status: 'picked'; readonly base64: string; readonly mediaType: FlyerMediaType }
  | { readonly status: 'cancelled' }
  | { readonly status: 'denied' }
  | { readonly status: 'failed' };

/** Small enough to upload on mobile data, sharp enough to read printed prices. */
const FLYER_QUALITY = 0.5;
const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: FLYER_QUALITY, base64: true };
const MEDIA_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** The picker re-encodes photos as JPEG; anything it reports that the server cannot take falls back to that. */
function mediaTypeOf(mimeType: string | undefined): FlyerMediaType {
  return mimeType !== undefined && MEDIA_TYPES.includes(mimeType) ? (mimeType as FlyerMediaType) : 'image/jpeg';
}

/** Takes or chooses a photo of an offers flyer. It is sent to be read and is not kept on the phone or the server. */
export async function pickFlyer(source: PhotoSource): Promise<FlyerPhoto> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { status: 'cancelled' };
    if (!asset.base64) return { status: 'failed' };
    return { status: 'picked', base64: asset.base64, mediaType: mediaTypeOf(asset.mimeType) };
  } catch {
    return { status: 'failed' };
  }
}
