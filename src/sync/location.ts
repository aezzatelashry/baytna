import * as Location from 'expo-location';

export interface Position {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Where the phone is right now. Asked for only when the family taps "search around me";
 * the app never tracks position in the background and never stores it.
 */
export async function currentPosition(): Promise<Position> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق بمعرفة موقعك من إعدادات الموبايل، أو دوّر من غير موقع.');
  const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: fix.coords.latitude, lng: fix.coords.longitude };
}
