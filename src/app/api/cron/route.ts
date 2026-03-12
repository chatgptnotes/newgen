import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideo } from '@/lib/heygen';
import { getVideoStatus } from '@/lib/heygen';
import { generateScript } from '@/lib/gemini';
import { publishToInstagram } from '@/lib/instagram';
import { ContentType } from '@/lib/types';

// GET /api/cron — Cron endpoint for daily auto video pipeline
// Runs every 5 minutes. Secured via CRON_SECRET.
//
// Pipeline each run:
//   Task 0: Auto-generate today's script (Gemini) + create video record + trigger HeyGen
//   Task 1: Start generation for any scheduled drafts that are due
//   Task 2: Poll HeyGen status for videos currently generating
//   Task 3: Auto-publish generated scheduled videos (Instagram/YouTube)

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
        const now = new Date();
        const results: string[] = [];

        // === Task 0: Daily auto-generate script + trigger video ===
        try {
            // Check if we already created a video today (IST timezone)
            const todayIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const todayStart = new Date(todayIST);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayIST);
            todayEnd.setHours(23, 59, 59, 999);

            // Convert IST boundaries back to UTC for DB query
            const offsetMs = todayIST.getTime() - now.getTime();
            const todayStartUTC = new Date(todayStart.getTime() - offsetMs).toISOString();
            const todayEndUTC = new Date(todayEnd.getTime() - offsetMs).toISOString();

            const { data: todaysVideos } = await supabase
                .from('videos')
                .select('id')
                .gte('created_at', todayStartUTC)
                .lte('created_at', todayEndUTC)
                .limit(1);

            if (!todaysVideos || todaysVideos.length === 0) {
                // Alternate content type: even days = someday, odd days = everyday
                const contentType: ContentType = todayIST.getDate() % 2 === 0 ? 'someday' : 'everyday';

                // Step 1: Generate script via Gemini
                const script = await generateScript(supabase, contentType);
                results.push(`Script generated: ${script.title}`);

                // Step 2: Create video record in Supabase
                const { data: video, error: insertError } = await supabase
                    .from('videos')
                    .insert({
                        title: script.title,
                        script: script.script,
                        content_type: contentType,
                        image_urls: [],
                        status: 'draft',
                    })
                    .select()
                    .single();

                if (insertError || !video) {
                    results.push(`Failed to save video record: ${insertError?.message}`);
                } else {
                    // Step 3: Trigger HeyGen video generation
                    await supabase
                        .from('videos')
                        .update({ status: 'generating', error_message: null })
                        .eq('id', video.id);

                    const heygenResult = await generateVideo(video.script, []);

                    await supabase
                        .from('videos')
                        .update({
                            heygen_video_id: heygenResult.data.video_id,
                            status: 'generating',
                        })
                        .eq('id', video.id);

                    results.push(`Auto video started: ${video.title} (HeyGen: ${heygenResult.data.video_id})`);
                }
            } else {
                results.push('Daily video already exists — skipping auto-generation');
            }
        } catch (err) {
            results.push(`Auto-generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }

        // === Task 1: Start generation for scheduled drafts ===
        const { data: scheduledDrafts } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'draft')
            .not('scheduled_at', 'is', null)
            .lte('scheduled_at', now.toISOString());

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

        // === Task 3: Auto-publish generated videos to Instagram ===
        const { data: readyVideos } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'generated')
            .not('video_url', 'is', null);

        if (readyVideos && readyVideos.length > 0) {
            for (const video of readyVideos) {
                try {
                    // Mark as publishing
                    await supabase
                        .from('videos')
                        .update({ status: 'publishing_instagram' })
                        .eq('id', video.id);

                    const caption = `${video.title}\n\n#motivation #success #drmuralibk #hope #hospital #nagpur`;
                    const mediaId = await publishToInstagram(video.video_url!, caption);

                    await supabase
                        .from('videos')
                        .update({
                            status: 'published_instagram',
                            instagram_media_id: mediaId,
                            published_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);

                    results.push(`Published to Instagram: ${video.title} (media: ${mediaId})`);
                } catch (err) {
                    // Revert status back to generated so it retries next cron run
                    await supabase
                        .from('videos')
                        .update({
                            status: 'generated',
                            error_message: err instanceof Error ? err.message : 'Instagram publish failed',
                        })
                        .eq('id', video.id);

                    results.push(`Instagram publish failed for: ${video.title} — ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
        }

        return NextResponse.json({
            message: 'Cron job completed',
            processed: results,
            timestamp: now.toISOString(),
        });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json(
            { error: 'Cron job failed' },
            { status: 500 }
        );
    }
}
