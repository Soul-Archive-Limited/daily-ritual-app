import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import type { ExportFile } from './import';

/** Let the person pick a backup file. Null when they cancel; throws when the file isn't a backup. */
export async function pickBackup(): Promise<ExportFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const data = JSON.parse(new File(res.assets[0].uri).textSync()) as ExportFile;
  if (!data?.app?.config?.steps) throw new Error('That file isn’t a Daily Ritual backup.');
  return data;
}
