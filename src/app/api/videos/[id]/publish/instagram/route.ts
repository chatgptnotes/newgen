import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { publishToInstagram } from '@/lib/instagram';

// POST /api/videos/[id]/publish/instagram — Publish to Instagram Reels
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
            .update({ status: 'publishing_instagram' })
            .eq('id', id);

        try {
            const caption = `${video.title}\n\n#${video.content_type === 'someday' ? 'Someday' : 'EveryDay'} #AIContent`;

            const mediaId = await publishToInstagram(video.video_url, caption);

            // Determine new status
            const newStatus =
                video.youtube_video_id ? 'published_all' : 'published_instagram';

            await supabase
                .from('videos')
                .update({
                    status: newStatus,
                    instagram_media_id: mediaId,
                    published_at: video.published_at || new Date().toISOString(),
                })
                .eq('id', id);

            return NextResponse.json({
                message: 'Published to Instagram Reels',
                instagram_media_id: mediaId,
            });
        } catch (apiError) {
            await supabase
                .from('videos')
                .update({
                    status: 'generated',
                    error_message:
                        apiError instanceof Error
                            ? apiError.message
                            : 'Instagram publishing failed',
                })
                .eq('id', id);

            return NextResponse.json(
                {
                    error:
                        apiError instanceof Error
                            ? apiError.message
                            : 'Instagram publishing failed',
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Instagram publish error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
