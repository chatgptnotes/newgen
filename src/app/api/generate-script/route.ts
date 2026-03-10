import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateScript } from '@/lib/gemini';

// POST /api/generate-script — Generate a Hindi title + script using Gemini
export async function POST(request: NextRequest) {
    try {
        const { content_type, topic } = await request.json();
        const supabase = createServerClient();
        const result = await generateScript(supabase, content_type, topic);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Generate script error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate script' },
            { status: 500 }
        );
    }
}
