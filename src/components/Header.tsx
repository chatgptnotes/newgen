'use client';

import Link from 'next/link';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="header">
            <div>
                <div className="header-title">{title}</div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {subtitle}
                    </div>
                )}
            </div>
            <div className="header-actions">
                <Link href="/create" className="btn btn-primary btn-sm">
                    <span>+</span> New Video
                </Link>
            </div>
        </header>
    );
}
