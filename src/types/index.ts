export interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailUri?: string;
  replacementUri?: string; // user's own clip
}

export interface AudioTrack {
  uri: string;
  isOriginal: boolean;
  title?: string;
}

export interface VideoTemplate {
  id: string;
  sourceUrl: string;
  localUri: string;
  platform: 'instagram' | 'tiktok' | 'unknown' | 'catalog';
  thumbnailUri?: string;
  totalDuration: number;
  clips: VideoClip[];
  audio: AudioTrack | null;
  aspectRatio: '9:16' | '1:1' | '16:9';
  createdAt: number;
  // RollToReel-style template metadata
  templateTitle?: string;
  niche?: string;
  audioName?: string;
  gradient?: [string, string];
  captionsOn?: boolean;
}

export interface Project {
  id: string;
  template: VideoTemplate;
  name: string;
  createdAt: number;
  updatedAt: number;
  exportedUri?: string;
}
