import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Project } from '../types';

// Render server base URL.
// - Web / iOS simulator: localhost works.
// - Physical phone (Expo Go): set EXPO_PUBLIC_RENDER_URL to your Mac's LAN IP,
//   e.g. http://192.168.1.42:4000
export const RENDER_BASE =
  process.env.EXPO_PUBLIC_RENDER_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export interface RenderResult {
  localUri: string; // downloaded finished reel
  remoteUrl: string;
}

export interface ImportResult {
  platform: 'instagram' | 'tiktok' | 'unknown';
  title: string;
  uploader: string;
  duration: number;
  clips: { id: string; startTime: number; endTime: number; duration: number }[];
  videoUrl: string;
  audioUrl: string;
}

// Ask the server to download a real IG/TikTok video and return its edit structure.
export async function importFromUrl(url: string): Promise<ImportResult> {
  const resp = await fetch(`${RENDER_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Import failed (${resp.status})`);
  // Make relative URLs absolute so the app can play/download them.
  data.videoUrl = `${RENDER_BASE}${data.videoUrl}`;
  data.audioUrl = `${RENDER_BASE}${data.audioUrl}`;
  return data;
}

export async function checkServer(): Promise<boolean> {
  try {
    const r = await fetch(`${RENDER_BASE}/health`, { method: 'GET' });
    return r.ok;
  } catch {
    return false;
  }
}

// Upload the project's clips + spec, get back a finished reel, download it.
export async function renderReel(project: Project): Promise<RenderResult> {
  const { template } = project;
  const filledClips = template.clips.filter(c => c.replacementUri);
  if (filledClips.length === 0) throw new Error('No clips to render');

  const form = new FormData();
  filledClips.forEach((clip, i) => {
    form.append('clips', {
      uri: clip.replacementUri!,
      name: `clip_${i}.mp4`,
      type: 'video/mp4',
    } as any);
  });

  // Captions: template title on the opener (until per-clip captions exist).
  const captions = filledClips.map((_, i) =>
    i === 0 && template.templateTitle ? template.templateTitle : '',
  );

  const spec = {
    durations: filledClips.map(c => c.duration),
    captions,
    captionsOn: template.captionsOn !== false,
  };
  form.append('spec', JSON.stringify(spec));

  const resp = await fetch(`${RENDER_BASE}/render`, { method: 'POST', body: form });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Render failed (${resp.status}): ${txt.slice(0, 200)}`);
  }
  const { url } = await resp.json();
  const remoteUrl = `${RENDER_BASE}${url}`;

  // Download finished reel locally so it can be saved/shared.
  const localUri = `${FileSystem.documentDirectory}reel_${Date.now()}.mp4`;
  const dl = await FileSystem.downloadAsync(remoteUrl, localUri);
  return { localUri: dl.uri, remoteUrl };
}
