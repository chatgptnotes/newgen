import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        const urls: string[] = [];

        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { data, error } = await supabase.storage
                .from('video-assets')
                .upload(filePath, buffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (error) {
                console.error('Upload error:', error);
                return NextResponse.json(
                    { error: `Failed to upload ${file.name}: ${error.message}` },
                    { status: 500 }
                );
            }

            const { data: urlData } = supabase.storage
                .from('video-assets')
                .getPublicUrl(data.path);

            urls.push(urlData.publicUrl);
        }

        return NextResponse.json({ urls });
    } catch (error) {
        console.error('Upload route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
