'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Video, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

export default function VideoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const videoId = params.id as string;

    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');

    const fetchVideo = useCallback(async () => {
        try {
            const res = await fetch(`/api/videos/${videoId}`);
            if (res.ok) {
                const data = await res.json();
                setVideo(data.video);
            }
        } catch (err) {
            console.error('Failed to fetch video:', err);
        } finally {
            setLoading(false);
        }
    }, [videoId]);

    useEffect(() => {
        fetchVideo();
    }, [fetchVideo]);

    // Poll for status updates when generating
    useEffect(() => {
        if (!video || video.status !== 'generating') return;

        const poll = setInterval(async () => {
            try {
                const res = await fetch(`/api/videos/${videoId}/status`);
                if (res.ok) {
                    await fetchVideo(); // Refresh video data
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(poll);
    }, [video?.status, videoId, fetchVideo]);

    const handleGenerate = async () => {
        setActionLoading('generate');
        try {
            await fetch(`/api/videos/${videoId}/generate`, { method: 'POST' });
            await fetchVideo();
        } catch (err) {
            console.error('Generation failed:', err);
        } finally {
            setActionLoading('');
        }
    };

    const handlePublishInstagram = async () => {
        setActionLoading('instagram');
        try {
            await fetch(`/api/videos/${videoId}/publish/instagram`, { method: 'POST' });
            await fetchVideo();
        } catch (err) {
            console.error('Instagram publish failed:', err);
        } finally {
            setActionLoading('');
        }
    };

    const handlePublishYouTube = async () => {
        setActionLoading('youtube');
        try {
            await fetch(`/api/videos/${videoId}/publish/youtube`, { method: 'POST' });
            await fetchVideo();
        } catch (err) {
            console.error('YouTube publish failed:', err);
        } finally {
            setActionLoading('');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this video?')) return;
        setActionLoading('delete');
        try {
            await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
            router.push('/videos');
        } catch (err) {
            console.error('Delete failed:', err);
            setActionLoading('');
        }
    };

    if (loading) {
        return (
            <>
                <Header title="Video Details" />
                <div className="page-container">
                    <div className="loading-overlay">
                        <div className="spinner" />
                    </div>
                </div>
            </>
        );
    }

    if (!video) {
        return (
            <>
                <Header title="Video Not Found" />
                <div className="page-container">
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">❌</div>
                            <div className="empty-state-title">Video not found</div>
                            <div className="empty-state-text">
                                This video may have been deleted or doesn&apos;t exist.
                            </div>
                            <button className="btn btn-primary" onClick={() => router.push('/videos')}>
                                Back to Videos
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const canGenerate = video.status === 'draft' || video.status === 'failed';
    const canPublish = video.status === 'generated' ||
        video.status === 'published_instagram' ||
        video.status === 'published_youtube';
    const canPublishIG = canPublish && video.status !== 'published_instagram' && video.status !== 'published_all';
    const canPublishYT = canPublish && video.status !== 'published_youtube' && video.status !== 'published_all';

    const timelineSteps = [
        {
            title: 'Created',
            time: video.created_at ? new Date(video.created_at).toLocaleString() : null,
            complete: true,
        },
        {
            title: 'Generating',
            time: video.status === 'generating' ? 'In progress…' : null,
            active: video.status === 'generating',
            complete: ['generated', 'published_instagram', 'published_youtube', 'published_all'].includes(video.status),
        },
        {
            title: 'Video Ready',
            time: video.generated_at ? new Date(video.generated_at).toLocaleString() : null,
            complete: ['generated', 'published_instagram', 'published_youtube', 'published_all'].includes(video.status),
        },
        {
            title: 'Published',
            time: video.published_at ? new Date(video.published_at).toLocaleString() : null,
            complete: ['published_instagram', 'published_youtube', 'published_all'].includes(video.status),
        },
    ];

    return (
        <>
            <Header title={video.title} subtitle={`Video #${video.id.slice(0, 8)}`} />
            <div className="page-container">
                <div className="detail-grid">
                    {/* Left: Video Preview */}
                    <div className="detail-sidebar">
                        <div className="video-player-container">
                            {video.video_url ? (
                                <video src={video.video_url} controls playsInline />
                            ) : (
                                <div className="video-placeholder">
                                    <div className="video-placeholder-icon">🎞️</div>
                                    <div>
                                        {video.status === 'generating'
                                            ? 'Video is being generated…'
                                            : 'No video generated yet'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            {canGenerate && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleGenerate}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'generate' ? (
                                        <>
                                            <div className="spinner" /> Generating…
                                        </>
                                    ) : (
                                        '⚡ Generate Video'
                                    )}
                                </button>
                            )}

                            {canPublishIG && (
                                <button
                                    className="btn btn-instagram"
                                    onClick={handlePublishInstagram}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'instagram' ? (
                                        <>
                                            <div className="spinner" /> Publishing…
                                        </>
                                    ) : (
                                        '📸 Publish to Instagram Reels'
                                    )}
                                </button>
                            )}

                            {canPublishYT && (
                                <button
                                    className="btn btn-youtube"
                                    onClick={handlePublishYouTube}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'youtube' ? (
                                        <>
                                            <div className="spinner" /> Uploading…
                                        </>
                                    ) : (
                                        '▶️ Publish to YouTube Shorts'
                                    )}
                                </button>
                            )}

                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={!!actionLoading}
                            >
                                🗑️ Delete Video
                            </button>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="detail-main">
                        {/* Status Badge */}
                        <div>
                            <span
                                className={`badge badge-${video.status}`}
                                style={{ fontSize: '14px', padding: '6px 16px' }}
                            >
                                <span className="badge-dot" />
                                {STATUS_LABELS[video.status]}
                            </span>
                        </div>

                        {/* Error Message */}
                        {video.error_message && (
                            <div
                                style={{
                                    padding: '12px 16px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--accent-red)',
                                    fontSize: '14px',
                                }}
                            >
                                <strong>Error:</strong> {video.error_message}
                            </div>
                        )}

                        {/* Metadata Grid */}
                        <div className="detail-meta">
                            <div className="detail-meta-item">
                                <div className="detail-meta-label">Content Type</div>
                                <div className="detail-meta-value">
                                    <span className={`badge badge-${video.content_type}`}>
                                        {video.content_type === 'someday' ? '🌤️ Someday' : '☀️ Every Day'}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-meta-item">
                                <div className="detail-meta-label">Images</div>
                                <div className="detail-meta-value">
                                    {video.image_urls.length} scene{video.image_urls.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div className="detail-meta-item">
                                <div className="detail-meta-label">Created</div>
                                <div className="detail-meta-value" style={{ fontSize: '13px' }}>
                                    {new Date(video.created_at).toLocaleString()}
                                </div>
                            </div>
                            {video.scheduled_at && (
                                <div className="detail-meta-item">
                                    <div className="detail-meta-label">Scheduled For</div>
                                    <div className="detail-meta-value" style={{ fontSize: '13px' }}>
                                        {new Date(video.scheduled_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Script */}
                        <div className="card">
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Script
                            </div>
                            <div style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                {video.script}
                            </div>
                        </div>

                        {/* Scene Images */}
                        {video.image_urls.length > 0 && (
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Scene Images
                                </div>
                                <div className="upload-previews">
                                    {video.image_urls.map((url, i) => (
                                        <div key={i} className="upload-preview">
                                            <img src={url} alt={`Scene ${i + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="card">
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Pipeline Timeline
                            </div>
                            <div className="timeline">
                                {timelineSteps.map((step, i) => (
                                    <div key={i} className="timeline-item">
                                        <div
                                            className={`timeline-dot ${step.active ? 'active' : step.complete ? 'complete' : ''
                                                }`}
                                        />
                                        <div className="timeline-title">{step.title}</div>
                                        {step.time && (
                                            <div className="timeline-time">{step.time}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* External Links */}
                        {(video.instagram_media_id || video.youtube_video_id) && (
                            <div className="card">
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Published Links
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {video.instagram_media_id && (
                                        <span className="badge badge-published_instagram">
                                            📸 Live on Instagram
                                        </span>
                                    )}
                                    {video.youtube_video_id && (
                                        <a
                                            href={`https://youtube.com/shorts/${video.youtube_video_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="badge badge-published_youtube"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            ▶️ Watch on YouTube
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
