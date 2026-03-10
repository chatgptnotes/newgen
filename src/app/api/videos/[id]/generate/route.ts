import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideo } from '@/lib/heygen';

// POST /api/videos/[id]/generate — Trigger HeyGen video generation
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

        if (video.status !== 'draft' && video.status !== 'failed') {
            return NextResponse.json(
                { error: `Cannot generate video in status: ${video.status}` },
                { status: 400 }
            );
        }

        // Update status to generating
        await supabase
            .from('videos')
            .update({ status: 'generating', error_message: null })
            .eq('id', id);

        try {
            // Call HeyGen API
            const result = await generateVideo(video.script, video.image_urls);

            // Save the HeyGen video ID
            await supabase
                .from('videos')
                .update({
                    heygen_video_id: result.data.video_id,
                    status: 'generating',
                })
                .eq('id', id);

            return NextResponse.json({
                message: 'Video generation started',
                heygen_video_id: result.data.video_id,
            });
        } catch (apiError) {
            // If HeyGen call fails, update status back to failed
            await supabase
                .from('videos')
                .update({
                    status: 'failed',
                    error_message:
                        apiError instanceof Error
                            ? apiError.message
                            : 'HeyGen API call failed',
                })
                .eq('id', id);

            return NextResponse.json(
                {
                    error:
                        apiError instanceof Error
                            ? apiError.message
                            : 'Video generation failed',
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Generate route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
