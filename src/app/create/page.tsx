'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ContentType } from '@/lib/types';

export default function CreateVideoPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [script, setScript] = useState('');
    const [contentType, setContentType] = useState<ContentType>('someday');
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);

    const maxScript = 200;

    const handleImageSelect = useCallback((files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
        const newPreviews = newFiles.map((f) => URL.createObjectURL(f));

        setImages((prev) => [...prev, ...newFiles]);
        setImagePreviews((prev) => [...prev, ...newPreviews]);
    }, []);

    const removeImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            handleImageSelect(e.dataTransfer.files);
        },
        [handleImageSelect]
    );

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
        if (images.length === 0) {
            setError('Please upload at least one image');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Upload images
            const formData = new FormData();
            images.forEach((img) => formData.append('files', img));

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                throw new Error('Image upload failed');
            }

            const { urls: imageUrls } = await uploadRes.json();

            // Step 2: Create video record
            const videoRes = await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    script: script.trim(),
                    content_type: contentType,
                    image_urls: imageUrls,
                    ...(enableSchedule && scheduledAt ? { scheduled_at: scheduledAt } : {}),
                }),
            });

            if (!videoRes.ok) {
                throw new Error('Failed to create video');
            }

            const { video } = await videoRes.json();

            // Step 3: If not scheduled, trigger generation immediately
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

                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label">Video Title</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Monday Motivation Tip"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Script */}
                    <div className="form-group">
                        <label className="form-label">Script</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Write the script that the AI avatar will speak..."
                            value={script}
                            onChange={(e) => setScript(e.target.value.slice(0, maxScript))}
                            rows={4}
                        />
                        <div className="form-hint">
                            {script.length}/{maxScript} characters · The avatar will speak this in the first ~5 seconds
                        </div>
                    </div>

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

                    {/* Image Upload */}
                    <div className="form-group">
                        <label className="form-label">
                            Scene Images ({images.length} uploaded)
                        </label>
                        <div
                            className={`upload-zone ${dragging ? 'dragging' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                        >
                            <div className="upload-zone-icon">📁</div>
                            <div className="upload-zone-text">
                                Drop images here or click to browse
                            </div>
                            <div className="upload-zone-hint">
                                PNG, JPG, WebP · These will appear as visual scenes after the avatar intro
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageSelect(e.target.files)}
                        />

                        {imagePreviews.length > 0 && (
                            <div className="upload-previews">
                                {imagePreviews.map((src, i) => (
                                    <div key={i} className="upload-preview">
                                        <img src={src} alt={`Scene ${i + 1}`} />
                                        <button
                                            type="button"
                                            className="upload-preview-remove"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(i);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
