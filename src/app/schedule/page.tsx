'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Video, STATUS_LABELS } from '@/lib/types';

export default function SchedulePage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchScheduled() {
            try {
                const res = await fetch('/api/videos');
                if (res.ok) {
                    const data = await res.json();
                    const allVideos: Video[] = data.videos || [];
                    // Filter to scheduled videos that haven't been published yet
                    const scheduled = allVideos
                        .filter((v) => v.scheduled_at)
                        .sort(
                            (a, b) =>
                                new Date(a.scheduled_at!).getTime() -
                                new Date(b.scheduled_at!).getTime()
                        );
                    setVideos(scheduled);
                }
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchScheduled();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.getDate().toString(),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            time: date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            full: date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
        };
    };

    const handleCancel = async (videoId: string) => {
        if (!confirm('Remove this video from the schedule? It will remain as a draft.')) return;

        try {
            await fetch(`/api/videos/${videoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduled_at: null }),
            });

            setVideos((prev) => prev.filter((v) => v.id !== videoId));
        } catch (err) {
            console.error('Failed to cancel schedule:', err);
        }
    };

    return (
        <>
            <Header title="Schedule" subtitle="Upcoming scheduled video generations" />
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h2>📅 Content Schedule</h2>
                        <div className="page-header-sub">
                            {videos.length} video{videos.length !== 1 ? 's' : ''} scheduled
                        </div>
                    </div>
                    <Link href="/create" className="btn btn-primary">
                        🎬 Schedule New
                    </Link>
                </div>

                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner" />
                    </div>
                ) : videos.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <div className="empty-state-title">No scheduled videos</div>
                            <div className="empty-state-text">
                                Schedule videos to auto-generate and publish at the right time.
                                Use the &quot;Schedule for later&quot; toggle when creating a video.
                            </div>
                            <Link href="/create" className="btn btn-primary">
                                Schedule a Video
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="schedule-list">
                        {videos.map((video) => {
                            const date = formatDate(video.scheduled_at!);
                            const isPast = new Date(video.scheduled_at!) < new Date();

                            return (
                                <div
                                    key={video.id}
                                    className="schedule-item"
                                    style={{
                                        opacity: isPast ? 0.6 : 1,
                                    }}
                                >
                                    <div className="schedule-date">
                                        <div className="schedule-date-day">{date.day}</div>
                                        <div className="schedule-date-month">{date.month}</div>
                                    </div>

                                    <div
                                        style={{
                                            width: 1,
                                            height: 40,
                                            background: 'var(--border-default)',
                                        }}
                                    />

                                    <div className="schedule-info">
                                        <div className="schedule-title">{video.title}</div>
                                        <div className="schedule-meta">
                                            <span>⏰ {date.time}</span>
                                            <span className={`badge badge-${video.content_type}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                {video.content_type === 'someday' ? 'Someday' : 'Every Day'}
                                            </span>
                                            <span className={`badge badge-${video.status}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                {STATUS_LABELS[video.status]}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Link
                                            href={`/videos/${video.id}`}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            View
                                        </Link>
                                        {video.status === 'draft' && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleCancel(video.id)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
