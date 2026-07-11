import { VideoTemplate, VideoClip } from '../types';
import * as FileSystem from 'expo-file-system/legacy';

export function detectPlatform(url: string): 'instagram' | 'tiktok' | 'unknown' {
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
  return 'unknown';
}

// Simulates parsing a video into clip segments based on duration
// In production, this would use FFmpeg to detect scene cuts
export function parseVideoIntoClips(durationSeconds: number): VideoClip[] {
  const clips: VideoClip[] = [];
  // Estimate ~2-4 second clips typical of Reels/TikToks
  const avgClipDuration = 2.5;
  const clipCount = Math.max(1, Math.round(durationSeconds / avgClipDuration));

  for (let i = 0; i < clipCount; i++) {
    const start = (durationSeconds / clipCount) * i;
    const end = (durationSeconds / clipCount) * (i + 1);
    clips.push({
      id: `clip_${i}`,
      startTime: parseFloat(start.toFixed(2)),
      endTime: parseFloat(end.toFixed(2)),
      duration: parseFloat((end - start).toFixed(2)),
    });
  }
  return clips;
}

export function buildTemplate(
  localUri: string,
  sourceUrl: string,
  durationSeconds: number,
): VideoTemplate {
  return {
    id: `template_${Date.now()}`,
    sourceUrl,
    localUri,
    platform: detectPlatform(sourceUrl),
    totalDuration: durationSeconds,
    clips: parseVideoIntoClips(durationSeconds),
    audio: { uri: localUri, isOriginal: true },
    aspectRatio: '9:16',
    createdAt: Date.now(),
  };
}

// Build empty clip slots for a catalog template (no source video to parse —
// the structure is defined by the template itself).
export function clipsFromCatalog(clipCount: number, totalDuration: number): VideoClip[] {
  const clips: VideoClip[] = [];
  const each = totalDuration / clipCount;
  for (let i = 0; i < clipCount; i++) {
    clips.push({
      id: `clip_${i}`,
      startTime: parseFloat((each * i).toFixed(2)),
      endTime: parseFloat((each * (i + 1)).toFixed(2)),
      duration: parseFloat(each.toFixed(2)),
    });
  }
  return clips;
}

export async function saveVideoLocally(uri: string): Promise<string> {
  const filename = `recut_${Date.now()}.mp4`;
  const dest = FileSystem.documentDirectory + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
