const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Step 1: Create a Reel media container
 */
export async function createReelContainer(
    videoUrl: string,
    caption: string
): Promise<string> {
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN!;

    const response = await fetch(`${GRAPH_API_BASE}/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            media_type: 'REELS',
            video_url: videoUrl,
            caption: caption,
            access_token: accessToken,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Instagram container creation failed: ${error}`);
    }

    const data = await response.json();
    return data.id; // container ID
}

/**
 * Step 2: Poll container status until it's ready
 */
export async function pollContainerStatus(
    containerId: string,
    maxAttempts = 30,
    intervalMs = 5000
): Promise<boolean> {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN!;

    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(
            `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
        );

        if (!response.ok) {
            throw new Error(`Failed to check container status: ${await response.text()}`);
        }

        const data = await response.json();

        if (data.status_code === 'FINISHED') {
            return true;
        }

        if (data.status_code === 'ERROR') {
            throw new Error('Instagram media container processing failed');
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Instagram container processing timed out');
}

/**
 * Step 3: Publish the Reel
 */
export async function publishReel(containerId: string): Promise<string> {
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN!;

    const response = await fetch(
        `${GRAPH_API_BASE}/${accountId}/media_publish`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: accessToken,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Instagram publish failed: ${error}`);
    }

    const data = await response.json();
    return data.id; // published media ID
}

/**
 * Full flow: Create container → poll → publish
 */
export async function publishToInstagram(
    videoUrl: string,
    caption: string
): Promise<string> {
    const containerId = await createReelContainer(videoUrl, caption);
    await pollContainerStatus(containerId);
    const mediaId = await publishReel(containerId);
    return mediaId;
}
