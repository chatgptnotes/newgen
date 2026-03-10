import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getVideoStatus } from '@/lib/heygen';

// GET /api/videos/[id]/status — Poll HeyGen for video status
export async function GET(
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

        if (!video.heygen_video_id) {
            return NextResponse.json(
                { error: 'No HeyGen video ID — generation not started' },
                { status: 400 }
            );
        }

        try {
            // Poll HeyGen for status
            const result = await getVideoStatus(video.heygen_video_id);

            if (result.data.status === 'completed') {
                // Video is ready — update the record
                await supabase
                    .from('videos')
                    .update({
                        status: 'generated',
                        video_url: result.data.video_url || null,
                        thumbnail_url: result.data.thumbnail_url || null,
                        generated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                return NextResponse.json({
                    status: 'generated',
                    video_url: result.data.video_url,
                });
            }

            if (result.data.status === 'failed') {
                await supabase
                    .from('videos')
                    .update({
                        status: 'failed',
                        error_message: result.data.error || 'HeyGen video generation failed',
                    })
                    .eq('id', id);

                return NextResponse.json({
                    status: 'failed',
                    error: result.data.error,
                });
            }

            // Still processing
            return NextResponse.json({
                status: 'generating',
                heygen_status: result.data.status,
            });
        } catch (apiError) {
            return NextResponse.json(
                {
                    error:
                        apiError instanceof Error
                            ? apiError.message
                            : 'Failed to check HeyGen status',
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Status route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
