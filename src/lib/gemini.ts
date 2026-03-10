import { SupabaseClient } from '@supabase/supabase-js';
import { ContentType } from './types';

const SOMEDAY_TOPICS = [
    'करोड़पति बनने की सोच', 'बिज़नेस शुरू करना', 'निवेश की ताकत', 'सफल लोगों की आदतें',
    'पैसे की समझ', 'लीडरशिप', 'टाइम मैनेजमेंट', 'गोल सेटिंग', 'फाइनेंशियल फ्रीडम',
    'स्किल डेवलपमेंट', 'नेटवर्किंग', 'पैसिव इनकम', 'रियल एस्टेट', 'स्टॉक मार्केट',
    'सेल्फ डिसिप्लिन', 'मानसिक मजबूती', 'कॉन्फिडेंस बढ़ाना', 'डिजिटल बिज़नेस',
];

const EVERYDAY_TOPICS = [
    'सुबह की दिनचर्या', 'सेहत के नुस्खे', 'पानी पीने के फायदे', 'अच्छी नींद',
    'तनाव कम करना', 'बचत के तरीके', 'रिश्तों में सुधार', 'पॉजिटिव सोच',
    'खाने में क्या खाएं', 'एक्सरसाइज़ टिप्स', 'फोन की लत छोड़ना', 'किताबें पढ़ना',
    'ध्यान और योग', 'घर की साफ़-सफ़ाई', 'बच्चों की परवरिश', 'ऑफिस में प्रोडक्टिविटी',
];

export interface GeneratedScript {
    title: string;
    script: string;
}

/**
 * Generate a unique Hindi title + script using Gemini.
 * Fetches recent titles from Supabase to avoid repetition.
 */
export async function generateScript(
    supabase: SupabaseClient,
    contentType: ContentType,
    topic?: string
): Promise<GeneratedScript> {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
        throw new Error('GEMINI_API key not configured');
    }

    const contentTypeDesc =
        contentType === 'someday'
            ? 'aspirational, motivational, dream-big content about success, wealth, career, business, mindset'
            : 'daily practical tips — health, productivity, money-saving, self-improvement, relationships';

    // Fetch recent titles to avoid repetition
    const { data: recentVideos } = await supabase
        .from('videos')
        .select('title, script')
        .order('created_at', { ascending: false })
        .limit(20);

    const recentTopics = recentVideos?.map(v => v.title).join(', ') || '';

    // Pick a random seed topic
    const topicPool = contentType === 'someday' ? SOMEDAY_TOPICS : EVERYDAY_TOPICS;
    const randomTopic = topicPool[Math.floor(Math.random() * topicPool.length)];

    const prompt = `You are a professional Hindi content creator for short-form vertical videos (Instagram Reels / YouTube Shorts). You speak like a knowledgeable mentor — confident, professional, and respectful.

Content type: ${contentTypeDesc}
Today's topic: ${topic || randomTopic}

${recentTopics ? `IMPORTANT — These titles were already used recently. Do NOT repeat or rephrase any of them:\n${recentTopics}\n` : ''}

Generate a unique video title and a professional spoken script in Hindi (Devanagari script).

Rules:
- Title: Max 60 characters, in Hindi, unique and catchy
- Script: Must be 350-500 characters in Hindi (Devanagari). The avatar needs enough text to speak for 15-20 seconds.
- Tone: Professional, mentor-like. Address the viewer with "आप" (formal). NEVER use "यार", "भाई", "दोस्त" or casual slang.
- Start with a hook — a bold statement, a surprising fact, or a thought-provoking question.
- Include one actionable insight or tip.
- End with a strong call-to-action (follow, share, comment).
- Every script must be completely different from previous ones — new angle, new structure, new opening.
- Do NOT include any English text.

Respond in this exact JSON format only, no markdown:
{"title": "Hindi title here", "script": "Hindi script here"}`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 600,
                },
            }),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
        throw new Error('Empty response from Gemini');
    }

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
        title: parsed.title,
        script: parsed.script,
    };
}
