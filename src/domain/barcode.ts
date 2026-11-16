/** Retail barcodes are 8 to 14 digits (EAN-8, UPC-A, EAN-13, ITF-14). */
const BARCODE = /^\d{8,14}$/;
const MAX_NAME = 80;

export function isBarcode(text: string): boolean {
  return BARCODE.test(text.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME) : '';
}

/**
 * The product's name from an Open Food Facts reply: the Arabic name when the product
 * has one, otherwise its general name, with the brand in front when it is not already
 * part of the name. Null when the product is unknown or unnamed.
 */
export function productNameFromLookup(payload: unknown): string | null {
  if (!isRecord(payload) || payload.status !== 1 || !isRecord(payload.product)) return null;
  const { product_name_ar: arabic, product_name: general, brands } = payload.product;
  const name = clean(arabic) || clean(general);
  if (name === '') return null;
  const brand = clean(typeof brands === 'string' ? brands.split(',')[0] : '');
  return brand !== '' && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} ${brand}`.slice(0, MAX_NAME) : name;
}
