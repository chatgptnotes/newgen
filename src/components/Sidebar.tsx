'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Create Video', href: '/create', icon: '🎬' },
    { label: 'All Videos', href: '/videos', icon: '🎥' },
    { label: 'Schedule', href: '/schedule', icon: '📅' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">⚡</div>
                <div>
                    <h1>VideoForge</h1>
                    <span>Content Automation</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <span className="sidebar-section-label">Main Menu</span>
                {navItems.map((item) => {
                    const isActive =
                        item.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}

                <span className="sidebar-section-label" style={{ marginTop: 24 }}>
                    Content Types
                </span>
                <Link href="/videos?type=someday" className="sidebar-link">
                    <span className="sidebar-icon">🌤️</span>
                    Someday
                </Link>
                <Link href="/videos?type=everyday" className="sidebar-link">
                    <span className="sidebar-icon">☀️</span>
                    Every Day
                </Link>
            </nav>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Powered by HeyGen AI
                </div>
            </div>
        </aside>
    );
}
