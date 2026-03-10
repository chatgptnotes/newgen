export type ContentType = 'someday' | 'everyday';

export type VideoStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'failed'
  | 'publishing_instagram'
  | 'published_instagram'
  | 'publishing_youtube'
  | 'published_youtube'
  | 'published_all';

export interface Video {
  id: string;
  title: string;
  script: string;
  content_type: ContentType;
  status: VideoStatus;
  image_urls: string[];
  heygen_video_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  instagram_media_id: string | null;
  youtube_video_id: string | null;
  scheduled_at: string | null;
  generated_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVideoPayload {
  title: string;
  script: string;
  content_type: ContentType;
  image_urls: string[];
  scheduled_at?: string;
}

export interface HeyGenScene {
  character?: {
    type: string;
    avatar_id?: string;
    talking_photo_id?: string;
    avatar_style?: string;
    scale?: number;
  };
  voice?: {
    type: string;
    voice_id?: string;
    input_text?: string;
    duration?: number;
  };
  background?: {
    type: string;
    value?: string;
    url?: string;
  };
}

export interface HeyGenVideoRequest {
  video_inputs: HeyGenScene[];
  dimension: {
    width: number;
    height: number;
  };
  aspect_ratio?: string;
}

export interface HeyGenVideoResponse {
  error: string | null;
  data: {
    video_id: string;
  };
}

export interface HeyGenStatusResponse {
  error: string | null;
  data: {
    status: string;
    video_url?: string;
    thumbnail_url?: string;
    error?: string;
  };
}

export const STATUS_LABELS: Record<VideoStatus, string> = {
  draft: 'Draft',
  generating: 'Generating',
  generated: 'Ready to Publish',
  failed: 'Failed',
  publishing_instagram: 'Publishing to IG',
  published_instagram: 'Live on Instagram',
  publishing_youtube: 'Publishing to YT',
  published_youtube: 'Live on YouTube',
  published_all: 'Published Everywhere',
};

export const STATUS_COLORS: Record<VideoStatus, string> = {
  draft: '#6b7280',
  generating: '#f59e0b',
  generated: '#10b981',
  failed: '#ef4444',
  publishing_instagram: '#f59e0b',
  published_instagram: '#e1306c',
  publishing_youtube: '#f59e0b',
  published_youtube: '#ff0000',
  published_all: '#8b5cf6',
};
