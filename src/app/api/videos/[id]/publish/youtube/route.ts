import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { uploadShort } from '@/lib/youtube';

// POST /api/videos/[id]/publish/youtube — Upload to YouTube Shorts
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        // Fetch the video record
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !video) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        if (!video.video_url) {
            return NextResponse.json(
                { error: 'No video URL — generate the video first' },
                { status: 400 }
            );
        }

        // Update status
        await supabase
            .from('videos')
            .update({ status: 'publishing_youtube' })
            .eq('id', id);

        try {
            const description = `${video.script}\n\n#${video.content_type === 'someday' ? 'Someday' : 'EveryDay'} #AIContent`;

            const youtubeVideoId = await uploadShort(
                video.video_url,
                video.title,
                description
            );

            // Determine new status
            const newStatus =
                video.instagram_media_id ? 'published_all' : 'published_youtube';

            await supabase
                .from('videos')
                .update({
                    status: newStatus,
                    youtube_video_id: youtubeVideoId,
                    published_at: video.published_at || new Date().toISOString(),
                })
                .eq('id', id);

            return NextResponse.json({
                message: 'Published to YouTube Shorts',
                youtube_video_id: youtubeVideoId,
            });
        } catch (apiError) {
            await supabase
                .from('videos')
                .update({
                    status: 'generated',
                    error_message:
                        apiError instanceof Error
                            ? apiError.message
                            : 'YouTube upload failed',
                })
                .eq('id', id);

            return NextResponse.json(
                {
                    error:
                        apiError instanceof Error
                            ? apiError.message
                            : 'YouTube upload failed',
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('YouTube publish error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
