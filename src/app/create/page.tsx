'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ContentType } from '@/lib/types';

export default function CreateVideoPage() {
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [script, setScript] = useState('');
    const [contentType, setContentType] = useState<ContentType>('someday');
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const maxScript = 500;

    const handleGenerateScript = async () => {
        setGenerating(true);
        setError('');
        try {
            const res = await fetch('/api/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_type: contentType, topic: topic.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate script');
            }
            const data = await res.json();
            setTitle(data.title);
            setScript(data.script.slice(0, maxScript));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Script generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter a title');
            return;
        }
        if (!script.trim()) {
            setError('Please enter a script');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Create video record
            const videoRes = await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    script: script.trim(),
                    content_type: contentType,
                    image_urls: [],
                    ...(enableSchedule && scheduledAt ? { scheduled_at: scheduledAt } : {}),
                }),
            });

            if (!videoRes.ok) {
                throw new Error('Failed to create video');
            }

            const { video } = await videoRes.json();

            // Step 2: If not scheduled, trigger generation immediately
            if (!enableSchedule) {
                await fetch(`/api/videos/${video.id}/generate`, {
                    method: 'POST',
                });
            }

            router.push(`/videos/${video.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header title="Create Video" subtitle="Generate a new AI-powered short-form video" />
            <div className="page-container" style={{ maxWidth: 720 }}>
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div
                            style={{
                                padding: '12px 16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--accent-red)',
                                fontSize: '14px',
                                marginBottom: 24,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Content Type */}
                    <div className="form-group">
                        <label className="form-label">Content Type</label>
                        <div className="radio-group">
                            <button
                                type="button"
                                className={`radio-card ${contentType === 'someday' ? 'selected' : ''}`}
                                onClick={() => setContentType('someday')}
                            >
                                <div className="radio-card-title">🌤️ Someday</div>
                                <div className="radio-card-desc">Aspirational content theme</div>
                            </button>
                            <button
                                type="button"
                                className={`radio-card ${contentType === 'everyday' ? 'selected' : ''}`}
                                onClick={() => setContentType('everyday')}
                            >
                                <div className="radio-card-title">☀️ Every Day</div>
                                <div className="radio-card-desc">Daily engagement content</div>
                            </button>
                        </div>
                    </div>

                    {/* AI Script Generator */}
                    <div className="form-group">
                        <label className="form-label">Generate Script with AI</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Topic hint (optional) e.g. सफलता, पैसा, health tips..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleGenerateScript}
                                disabled={generating}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {generating ? (
                                    <>
                                        <div className="spinner" /> Generating…
                                    </>
                                ) : (
                                    '✨ Generate Hindi Script'
                                )}
                            </button>
                        </div>
                        <div className="form-hint">
                            AI will generate a Hindi title and script based on content type
                        </div>
                    </div>

                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label">Video Title</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="AI-generated Hindi title will appear here..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Script */}
                    <div className="form-group">
                        <label className="form-label">Script</label>
                        <textarea
                            className="form-textarea"
                            placeholder="AI-generated Hindi script will appear here..."
                            value={script}
                            onChange={(e) => setScript(e.target.value.slice(0, maxScript))}
                            rows={4}
                        />
                        <div className="form-hint">
                            {script.length}/{maxScript} characters · The avatar will speak this
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="form-group">
                        <label
                            className="form-label"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={enableSchedule}
                                onChange={(e) => setEnableSchedule(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
                            />
                            Schedule for later
                        </label>
                        {enableSchedule && (
                            <input
                                type="datetime-local"
                                className="form-input"
                                style={{ marginTop: 8 }}
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                        )}
                        <div className="form-hint">
                            {enableSchedule
                                ? 'The video will be auto-generated and published at the scheduled time'
                                : 'Video generation will start immediately after submission'}
                        </div>
                    </div>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" /> Processing…
                                </>
                            ) : enableSchedule ? (
                                '📅 Schedule Video'
                            ) : (
                                '⚡ Generate Video Now'
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-lg"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
