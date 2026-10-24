import { Directory, File, Paths } from 'expo-file-system';
import { canLiftSubject, liftSubject } from 'subject-lift';

/** Product photos live only on the phone, in Documents/products. Records store just the file name. */
const dir = () => {
  const d = new Directory(Paths.document, 'products');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};

export const photoUri = (name?: string | null) => (name ? new File(dir(), name).uri : null);

export function deletePhoto(name?: string | null) {
  if (!name) return;
  try {
    const f = new File(dir(), name);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}

/** Cut the product out of a photo (iOS subject lifting) and keep it. Returns the stored file name. */
export async function saveProductPhoto(productId: string, sourceUri: string) {
  const base = `${productId}-${Date.now()}`;
  const path = new File(dir(), base).uri.replace(/^file:\/\//, '');
  if (canLiftSubject()) {
    const out = await liftSubject(sourceUri, decodeURIComponent(path), 1024);
    return { name: out.uri.split('/').pop()!, cut: out.cut };
  }
  // Old build without the module: keep the photo as it is.
  const dest = new File(dir(), `${base}.jpg`);
  new File(sourceUri).copy(dest);
  return { name: dest.name, cut: false };
}
