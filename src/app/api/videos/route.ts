import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CreateVideoPayload } from '@/lib/types';

// GET /api/videos — List all videos
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { searchParams } = new URL(request.url);
        const contentType = searchParams.get('content_type');
        const status = searchParams.get('status');

        let query = supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (contentType) {
            query = query.eq('content_type', contentType);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ videos: data || [] });
    } catch (error) {
        console.error('Videos list error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/videos — Create a new video record
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const body: CreateVideoPayload = await request.json();

        if (!body.title || !body.script || !body.content_type) {
            return NextResponse.json(
                { error: 'Missing required fields: title, script, content_type' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('videos')
            .insert({
                title: body.title,
                script: body.script,
                content_type: body.content_type,
                image_urls: body.image_urls || [],
                scheduled_at: body.scheduled_at || null,
                status: 'draft',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ video: data }, { status: 201 });
    } catch (error) {
        console.error('Videos create error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
