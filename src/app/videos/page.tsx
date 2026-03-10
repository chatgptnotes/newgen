'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Video, STATUS_LABELS } from '@/lib/types';

const statusFilters: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Generating', value: 'generating' },
    { label: 'Ready', value: 'generated' },
    { label: 'Published', value: 'published' },
    { label: 'Failed', value: 'failed' },
];

function VideosContent() {
    const searchParams = useSearchParams();
    const typeFilter = searchParams.get('type');

    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        async function fetchVideos() {
            try {
                let url = '/api/videos';
                const params: string[] = [];
                if (typeFilter) params.push(`content_type=${typeFilter}`);
                if (params.length > 0) url += `?${params.join('&')}`;

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setVideos(data.videos || []);
                }
            } catch (err) {
                console.error('Failed to fetch videos:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchVideos();
    }, [typeFilter]);

    const filteredVideos = videos.filter((v) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'published') {
            return (
                v.status === 'published_instagram' ||
                v.status === 'published_youtube' ||
                v.status === 'published_all'
            );
        }
        return v.status === activeFilter;
    });

    return (
        <>
            <Header
                title="All Videos"
                subtitle={`${videos.length} total videos${typeFilter ? ` · Filtered by ${typeFilter}` : ''}`}
            />
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h2>Video Library</h2>
                        <div className="page-header-sub">
                            Manage and track all your generated videos
                        </div>
                    </div>
                    <Link href="/create" className="btn btn-primary">
                        🎬 Create Video
                    </Link>
                </div>

                {/* Status Filter Tabs */}
                <div className="filter-tabs">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.value}
                            className={`filter-tab ${activeFilter === filter.value ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner" />
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">🔍</div>
                            <div className="empty-state-title">No videos found</div>
                            <div className="empty-state-text">
                                {activeFilter !== 'all'
                                    ? `No videos with status "${activeFilter}". Try a different filter.`
                                    : 'Create your first video to get started.'}
                            </div>
                            <Link href="/create" className="btn btn-primary">
                                Create Video
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Script</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVideos.map((video) => (
                                    <tr key={video.id}>
                                        <td>
                                            <div className="table-title">{video.title}</div>
                                        </td>
                                        <td>
                                            <div
                                                className="table-subtitle"
                                                style={{ maxWidth: 250, color: 'var(--text-secondary)' }}
                                            >
                                                {video.script.slice(0, 80)}
                                                {video.script.length > 80 ? '…' : ''}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${video.content_type}`}>
                                                {video.content_type === 'someday' ? '🌤️ Someday' : '☀️ Every Day'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${video.status}`}>
                                                <span className="badge-dot" />
                                                {STATUS_LABELS[video.status]}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {new Date(video.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <Link
                                                    href={`/videos/${video.id}`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

export default function VideosPage() {
    return (
        <Suspense
            fallback={
                <>
                    <Header title="All Videos" subtitle="Loading..." />
                    <div className="page-container">
                        <div className="loading-overlay">
                            <div className="spinner" />
                        </div>
                    </div>
                </>
            }
        >
            <VideosContent />
        </Suspense>
    );
}
