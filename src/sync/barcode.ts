import { isBarcode, productNameFromLookup } from '@/domain/barcode';

const LOOKUP_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'product_name,product_name_ar,brands';
const TIMEOUT_MS = 8000;

/**
 * Asks Open Food Facts, a free public product database, what a barcode is. Only the
 * barcode is sent. Null when the product is not listed there or the phone is offline.
 */
export async function lookUpBarcode(code: string): Promise<string | null> {
  if (!isBarcode(code)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${LOOKUP_URL}/${code.trim()}.json?fields=${FIELDS}`, { signal: controller.signal });
    if (!response.ok) return null;
    return productNameFromLookup(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
