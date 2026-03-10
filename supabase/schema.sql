-- Video Content Automation Platform Schema
-- Run this in your Supabase SQL editor

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('someday', 'everyday')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'generating', 'generated', 'failed',
    'publishing_instagram', 'published_instagram',
    'publishing_youtube', 'published_youtube',
    'published_all'
  )),
  image_urls TEXT[] DEFAULT '{}',
  heygen_video_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  instagram_media_id TEXT,
  youtube_video_id TEXT,
  scheduled_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Index for scheduled video queries
CREATE INDEX IF NOT EXISTS idx_videos_scheduled ON videos(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_videos_content_type ON videos(content_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Storage bucket for video assets (images)
-- Run this via Supabase dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('video-assets', 'video-assets', true);
