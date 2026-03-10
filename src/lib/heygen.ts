import { HeyGenVideoRequest, HeyGenVideoResponse, HeyGenStatusResponse } from './types';

const HEYGEN_API_BASE = 'https://api.heygen.com';

function getHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY!,
    };
}

/**
 * Build a multi-scene HeyGen video payload.
 * Scene 1: Avatar speaking the script (~5 seconds)
 * Scene 2+: Image scenes showing uploaded graphics (~25 seconds total)
 */
export function buildVideoPayload(
    script: string,
    imageUrls: string[]
): HeyGenVideoRequest {
    const avatarId = process.env.HEYGEN_AVATAR_ID!;
    const voiceId = process.env.HEYGEN_VOICE_ID!;

    // Scene 1: Avatar speaking the script
    const avatarScene: HeyGenVideoRequest['video_inputs'][0] = {
        character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal',
            scale: 1,
        },
        voice: {
            type: 'text',
            voice_id: voiceId,
            input_text: script,
        },
        background: {
            type: 'color',
            value: '#000000',
        },
    };

    // Scene 2+: Image scenes (avatar speaks nothing, images are the focus)
    const imageScenes = imageUrls.map((url) => ({
        character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal',
        },
        voice: {
            type: 'silence' as const,
            duration: 5,
        },
        background: {
            type: 'image',
            url: url,
        },
    }));

    return {
        video_inputs: [avatarScene, ...imageScenes],
        dimension: {
            width: 1080,
            height: 1920,
        },
    };
}

/**
 * Submit a video generation request to HeyGen API v2
 */
export async function generateVideo(
    script: string,
    imageUrls: string[]
): Promise<HeyGenVideoResponse> {
    const payload = buildVideoPayload(script, imageUrls);

    const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Poll HeyGen for video generation status
 */
export async function getVideoStatus(
    videoId: string
): Promise<HeyGenStatusResponse> {
    const response = await fetch(
        `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HeyGen status check error: ${response.status} - ${errorText}`);
    }

    return response.json();
}
