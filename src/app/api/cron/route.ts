import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideo } from '@/lib/heygen';
import { getVideoStatus } from '@/lib/heygen';
import { publishToInstagram } from '@/lib/instagram';
import { uploadShort } from '@/lib/youtube';

// GET /api/cron — Cron endpoint for scheduled video processing
// Secured via CRON_SECRET query parameter or Authorization header
// For Vercel Cron, add to vercel.json:
// { "crons": [{ "path": "/api/cron?secret=YOUR_SECRET", "schedule": "*/5 * * * *" }] }
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const { searchParams } = new URL(request.url);
        const secret =
            searchParams.get('secret') ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();
        const now = new Date().toISOString();
        const results: string[] = [];

        // === Task 1: Start generation for scheduled drafts ===
        const { data: scheduledDrafts } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'draft')
            .not('scheduled_at', 'is', null)
            .lte('scheduled_at', now);

        if (scheduledDrafts && scheduledDrafts.length > 0) {
            for (const video of scheduledDrafts) {
                try {
                    await supabase
                        .from('videos')
                        .update({ status: 'generating', error_message: null })
                        .eq('id', video.id);

                    const result = await generateVideo(video.script, video.image_urls);

                    await supabase
                        .from('videos')
                        .update({
                            heygen_video_id: result.data.video_id,
                            status: 'generating',
                        })
                        .eq('id', video.id);

                    results.push(`Started generation for: ${video.title}`);
                } catch (err) {
                    await supabase
                        .from('videos')
                        .update({
                            status: 'failed',
                            error_message:
                                err instanceof Error ? err.message : 'Scheduled generation failed',
                        })
                        .eq('id', video.id);

                    results.push(`Failed generation for: ${video.title}`);
                }
            }
        }

        // === Task 2: Check status of generating videos ===
        const { data: generatingVideos } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'generating')
            .not('heygen_video_id', 'is', null);

        if (generatingVideos && generatingVideos.length > 0) {
            for (const video of generatingVideos) {
                try {
                    const statusResult = await getVideoStatus(video.heygen_video_id!);

                    if (statusResult.data.status === 'completed') {
                        await supabase
                            .from('videos')
                            .update({
                                status: 'generated',
                                video_url: statusResult.data.video_url || null,
                                thumbnail_url: statusResult.data.thumbnail_url || null,
                                generated_at: new Date().toISOString(),
                            })
                            .eq('id', video.id);

                        results.push(`Video ready: ${video.title}`);
                    } else if (statusResult.data.status === 'failed') {
                        await supabase
                            .from('videos')
                            .update({
                                status: 'failed',
                                error_message: statusResult.data.error || 'Generation failed',
                            })
                            .eq('id', video.id);

                        results.push(`Video failed: ${video.title}`);
                    }
                } catch (err) {
                    results.push(`Status check error for: ${video.title}`);
                }
            }
        }

        // === Task 3: Auto-publish generated scheduled videos ===
        const { data: readyToPublish } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'generated')
            .not('scheduled_at', 'is', null)
            .lte('scheduled_at', now);

        if (readyToPublish && readyToPublish.length > 0) {
            for (const video of readyToPublish) {
                if (!video.video_url) continue;

                const caption = `${video.title}\n\n#${video.content_type === 'someday' ? 'Someday' : 'EveryDay'} #AIContent`;

                // Publish to Instagram
                try {
                    const mediaId = await publishToInstagram(video.video_url, caption);
                    await supabase
                        .from('videos')
                        .update({
                            instagram_media_id: mediaId,
                            status: 'published_instagram',
                            published_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);

                    results.push(`Published to Instagram: ${video.title}`);
                } catch (err) {
                    results.push(`Instagram publish failed: ${video.title}`);
                }

                // Publish to YouTube
                try {
                    const description = `${video.script}\n\n#${video.content_type === 'someday' ? 'Someday' : 'EveryDay'} #AIContent`;
                    const ytId = await uploadShort(video.video_url, video.title, description);

                    // Update to published_all if both succeeded
                    const currentVideo = await supabase
                        .from('videos')
                        .select('instagram_media_id')
                        .eq('id', video.id)
                        .single();

                    const newStatus = currentVideo.data?.instagram_media_id
                        ? 'published_all'
                        : 'published_youtube';

                    await supabase
                        .from('videos')
                        .update({
                            youtube_video_id: ytId,
                            status: newStatus,
                            published_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);

                    results.push(`Published to YouTube: ${video.title}`);
                } catch (err) {
                    results.push(`YouTube publish failed: ${video.title}`);
                }
            }
        }

        return NextResponse.json({
            message: 'Cron job completed',
            processed: results,
            timestamp: now,
        });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json(
            { error: 'Cron job failed' },
            { status: 500 }
        );
    }
}
