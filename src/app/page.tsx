'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Video, STATUS_LABELS } from '@/lib/types';

interface DashboardStats {
  total: number;
  generating: number;
  readyToPublish: number;
  scheduled: number;
  publishedToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    generating: 0,
    readyToPublish: 0,
    scheduled: 0,
    publishedToday: 0,
  });
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data = await res.json();
          const videos: Video[] = data.videos || [];

          const today = new Date().toISOString().split('T')[0];

          setStats({
            total: videos.length,
            generating: videos.filter((v) => v.status === 'generating').length,
            readyToPublish: videos.filter((v) => v.status === 'generated').length,
            scheduled: videos.filter((v) => v.scheduled_at && v.status === 'draft').length,
            publishedToday: videos.filter(
              (v) =>
                v.published_at && v.published_at.startsWith(today)
            ).length,
          });

          setRecentVideos(videos.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your content pipeline" />
      <div className="page-container">
        {/* Quick Actions */}
        <div className="quick-actions">
          <Link href="/create" className="btn btn-primary btn-lg">
            🎬 Create New Video
          </Link>
          <Link href="/schedule" className="btn btn-secondary btn-lg">
            📅 View Schedule
          </Link>
          <Link href="/videos" className="btn btn-secondary btn-lg">
            🎥 All Videos
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-card-label">Total Videos</div>
            <div className="stat-card-value">{loading ? '—' : stats.total}</div>
            <div className="stat-card-sub">All time content</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-card-label">Generating Now</div>
            <div className="stat-card-value">{loading ? '—' : stats.generating}</div>
            <div className="stat-card-sub">Currently processing</div>
          </div>
          <div className="stat-card green">
            <div className="stat-card-label">Ready to Publish</div>
            <div className="stat-card-value">{loading ? '—' : stats.readyToPublish}</div>
            <div className="stat-card-sub">Awaiting review</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-card-label">Scheduled</div>
            <div className="stat-card-value">{loading ? '—' : stats.scheduled}</div>
            <div className="stat-card-sub">Queued for generation</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="section">
          <div className="section-title">
            📋 Recent Videos
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <div className="empty-state-title">No videos yet</div>
                <div className="empty-state-text">
                  Start creating your first AI-generated video. It only takes a few minutes!
                </div>
                <Link href="/create" className="btn btn-primary">
                  Create Your First Video
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentVideos.map((video) => (
                    <tr key={video.id}>
                      <td>
                        <div className="table-title">{video.title}</div>
                        <div className="table-subtitle">
                          {video.script.slice(0, 60)}
                          {video.script.length > 60 ? '…' : ''}
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
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(video.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <Link
                          href={`/videos/${video.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
