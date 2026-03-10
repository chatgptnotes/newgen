const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

/**
 * Refresh the YouTube OAuth2 access token using the stored refresh token
 */
async function refreshAccessToken(): Promise<string> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.YOUTUBE_CLIENT_ID!,
            client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
            refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`YouTube token refresh failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Download a video from URL and return as a Blob
 */
async function downloadVideo(videoUrl: string): Promise<Blob> {
    const response = await fetch(videoUrl);
    if (!response.ok) {
        throw new Error(`Failed to download video from ${videoUrl}`);
    }
    return response.blob();
}

/**
 * Upload a video to YouTube as a Short
 * Videos ≤60s in 9:16 aspect ratio with #Shorts in title/description
 */
export async function uploadShort(
    videoUrl: string,
    title: string,
    description: string
): Promise<string> {
    const accessToken = await refreshAccessToken();

    // Download the video first
    const videoBlob = await downloadVideo(videoUrl);

    // Step 1: Initialize resumable upload
    const metadata = {
        snippet: {
            title: `${title} #Shorts`,
            description: `${description} #Shorts`,
            categoryId: '22', // People & Blogs
        },
        status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
        },
    };

    const initResponse = await fetch(
        `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': 'video/mp4',
                'X-Upload-Content-Length': videoBlob.size.toString(),
            },
            body: JSON.stringify(metadata),
        }
    );

    if (!initResponse.ok) {
        const error = await initResponse.text();
        throw new Error(`YouTube upload init failed: ${error}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
        throw new Error('YouTube did not return an upload URL');
    }

    // Step 2: Upload the video data
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'video/mp4',
            'Content-Length': videoBlob.size.toString(),
        },
        body: videoBlob,
    });

    if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`YouTube video upload failed: ${error}`);
    }

    const data = await uploadResponse.json();
    return data.id; // YouTube video ID
}

