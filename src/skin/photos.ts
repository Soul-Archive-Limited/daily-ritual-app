import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Check-in photos live only on the phone, in Documents/checkins. Records keep just the file name. */
const dir = () => {
  const d = new Directory(Paths.document, 'checkins');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};

export const checkinPhotoUri = (name?: string | null) => (name ? new File(dir(), name).uri : null);

export function deleteCheckinPhoto(name?: string | null) {
  if (!name) return;
  try {
    const f = new File(dir(), name);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}

/**
 * Crop to 3:4 portrait (centre) and shrink to 900×1200, so every check-in lines up the same way
 * and a year of photos stays small. Returns a temporary file URI.
 */
export async function normalisePhoto(uri: string, width: number, height: number) {
  const target = 3 / 4;
  let crop = { originX: 0, originY: 0, width, height };
  if (width / height > target) {
    const w = Math.round(height * target);
    crop = { originX: Math.round((width - w) / 2), originY: 0, width: w, height };
  } else if (width / height < target) {
    const h = Math.round(width / target);
    crop = { originX: 0, originY: Math.round((height - h) / 2), width, height: h };
  }
  const ctx = ImageManipulator.manipulate(uri);
  ctx.crop(crop).resize({ width: 900, height: 1200 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return out.uri;
}

/** Move a prepared photo into permanent storage. Returns its file name. */
export function keepCheckinPhoto(tempUri: string, date: string, angle: string) {
  const dest = new File(dir(), `${date}-${angle}-${Date.now()}.jpg`);
  new File(tempUri).copy(dest);
  return dest.name;
}
