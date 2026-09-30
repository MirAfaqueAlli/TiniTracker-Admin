'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  {
    section: 'MAIN OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '⚡', phase: 'active' },
      { name: 'Hospitals', href: '/hospitals', icon: '🏥', phase: 'active' },
      { name: 'Subscriptions', href: '/subscriptions', icon: '💳', phase: 'active' },
      { name: 'Payments & Revenue', href: '/payments', icon: '💰', phase: 'active' },
    ]
  },
  {
    section: 'PLATFORM GOVERNANCE',
    items: [
      { name: 'Platform Users', href: '/users', icon: '👥', phase: 'active' },
      { name: 'Audit & Activity Logs', href: '/logs', icon: '📋', phase: 'active' },
      { name: 'Announcements', href: '/announcements', icon: '📢', phase: 'active' },
      { name: 'System Settings', href: '/settings', icon: '🔧', phase: 'active' },
      { name: 'Provider Admins', href: '/admins', icon: '🔑', phase: 'active' },
      { name: 'Reports & Exports', href: '/reports', icon: '📊', phase: 'active' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      userSelect: 'none',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            flexShrink: 0,
          }}>
            <img
              src="/tinitraker-logo.png"
              alt="TiniTracker"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              TiniTracker
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}>
                ADMIN
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Provider Control Center
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.2rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {NAV_ITEMS.map((group, gIdx) => (
          <div key={gIdx}>
            <div style={{
              fontSize: '0.67rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              padding: '0 0.65rem 0.55rem',
              textTransform: 'uppercase',
            }}>
              {group.section}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((item, iIdx) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                const isComingSoon = item.phase !== 'active';

                return (
                  <Link
                    key={iIdx}
                    href={isComingSoon ? '#' : item.href}
                    onClick={(e) => {
                      if (isComingSoon) {
                        e.preventDefault();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.62rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : isComingSoon ? 'var(--text-dim)' : 'var(--text-muted)',
                      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      opacity: isComingSoon ? 0.72 : 1,
                      cursor: isComingSoon ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isComingSoon) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isComingSoon) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>

                    {isComingSoon ? (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-dim)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {item.phase}
                      </span>
                    ) : isActive ? (
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#818cf8',
                        boxShadow: '0 0 8px #818cf8',
                      }} />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Backend Status & Profile Footer */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(9, 13, 22, 0.6)',
      }}>
        {/* Connection status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0.45rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          marginBottom: '0.85rem',
        }}>
          <div className="status-dot" />
          <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
            API Connected · :3000
          </div>
        </div>

        {/* Admin User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          padding: '0.5rem 0.4rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '9px',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}>
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {admin?.name || 'Provider Admin'}
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: 'var(--accent-cyan)',
                textTransform: 'capitalize',
                fontWeight: 600,
              }}>
                {admin?.role || 'superadmin'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              fontSize: '1.1rem',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-rose)';
              e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dim)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
