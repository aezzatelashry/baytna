import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, IconButton, Txt, type IconName } from '@/components/kit';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { isBarcode } from '@/domain/barcode';
import { useStore } from '@/store/store';
import { lookUpBarcode } from '@/sync/barcode';

const SCAN_ICON: IconName = { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' };
const CAMERA_HEIGHT = 200;

export type ScanResult = {
  code: string;
  /** The product's name when the phone or the public database knows the barcode. */
  name: string | null;
};

type BarcodeScannerProps = {
  onScanned: (result: ScanResult) => void;
};

/** A barcode button that opens the camera in place, reads one product barcode and names it. */
export function BarcodeScanner({ onScanned }: BarcodeScannerProps) {
  const known = useStore((state) => state.barcodes);
  const [permission, requestPermission] = useCameraPermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const isHandling = useRef(false);
  const styles = useStyles();

  // The web preview has no camera to point at a pack.
  if (Platform.OS === 'web') return null;

  const handleOpen = async (): Promise<void> => {
    setMessage('');
    const granted = permission?.granted === true || (await requestPermission()).granted;
    if (!granted) return setMessage('اسمح للتطبيق بالكاميرا من إعدادات الموبايل.');
    isHandling.current = false;
    setIsOpen(true);
  };

  const handleScanned = async ({ data }: BarcodeScanningResult): Promise<void> => {
    // The camera reports the same barcode many times a second; the first one is enough.
    if (isHandling.current || !isBarcode(data)) return;
    isHandling.current = true;
    setIsOpen(false);
    const code = data.trim();
    const name = known[code] ?? (await lookUpBarcode(code));
    setMessage(name === null ? 'الباركود ده مش معروف. اكتب اسم الصنف وهنفتكره المرة الجاية.' : '');
    onScanned({ code, name });
  };

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Txt kind="label" style={styles.grow}>
          {isOpen ? 'وجّه الكاميرا على الباركود.' : 'أو امسح باركود الصنف.'}
        </Txt>
        {isOpen ? (
          <Button label="اقفل الكاميرا" onPress={() => setIsOpen(false)} />
        ) : (
          <IconButton icon={SCAN_ICON} label="امسح باركود الصنف" onPress={() => void handleOpen()} />
        )}
      </View>
      {isOpen && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={(result) => void handleScanned(result)}
        />
      )}
      {message !== '' && <Txt kind="label">{message}</Txt>}
    </View>
  );
}

const useStyles = themed(() => ({
  block: { gap: Spacing.two },
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  camera: { height: CAMERA_HEIGHT, borderRadius: Radius.control, overflow: 'hidden' },
}));
