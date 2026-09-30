'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import GlobalSearchModal from './GlobalSearchModal';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Topbar({ onRefresh, isRefreshing, onOpenCreateHospital }) {
  const router = useRouter();
  const { admin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      // Silent fail on polling errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Topbar] Failed to mark all notifications read:', err.response?.data?.error || err.message);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[Topbar] Failed to mark notification read:', err.response?.data?.error || err.message);
      }
    }
    setDropdownOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  return (
    <>
      <header style={{
      height: 'var(--topbar-height)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backgroundColor: 'rgba(9, 13, 22, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
    }}>
      {/* Left breadcrumb/title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            Dashboard Overview
          </h1>
          <div style={{
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '2px',
          }}>
            <span>Multi-Tenant Infrastructure</span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>All Systems Nominal</span>
          </div>
        </div>
      </div>

      {/* Center Search / Filter hint */}
      <div style={{
        maxWidth: 380,
        width: '100%',
        margin: '0 1.5rem',
      }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSearchModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSearchModalOpen(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            color: 'var(--text-dim)',
            fontSize: '0.825rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          }}
        >
          <span>🔍</span>
          <span style={{ flex: 1 }}>Search hospitals, subscriptions, logs...</span>
          <kbd style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>⌘K</kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Refresh metrics from backend"
          >
            <span style={{
              display: 'inline-block',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transformOrigin: 'center',
            }}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        {/* Quick Create Hospital */}
        {onOpenCreateHospital && (
          <button
            onClick={onOpenCreateHospital}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.825rem' }}
          >
            <span>+</span>
            <span>New Hospital</span>
          </button>
        )}

        {/* ── NOTIFICATION BELL DROPDOWN ─────────────────────────────────── */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setDropdownOpen(prev => !prev);
              if (!dropdownOpen) fetchNotifications();
            }}
            id="provider-notification-bell-btn"
            title="Provider Notifications & Upgrade Requests"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: dropdownOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: dropdownOpen ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
              color: unreadCount > 0 ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              if (!dropdownOpen) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = unreadCount > 0 ? '#ffffff' : 'var(--text-muted)';
              }
            }}
          >
            {/* Bell SVG */}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {/* Glowing Unread Badge */}
            {unreadCount > 0 && (
              <span
                id="provider-unread-count-badge"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid #090d16',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.7)',
                  animation: 'pulseBadge 2s infinite ease-in-out',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* ── NOTIFICATION DROPDOWN POPUP ────────────────────────────── */}
          {dropdownOpen && (
            <div
              id="provider-notifications-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '420px',
                maxWidth: '90vw',
                backgroundColor: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -4px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'popoverFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    Provider Notifications
                  </span>
                  {unreadCount > 0 ? (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.18)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                    }}>
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                    }}>
                      All caught up
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Feed List */}
              <div style={{
                maxHeight: '380px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>
                      🔔
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                      No Notifications
                    </span>
                    <span style={{ fontSize: '0.75rem', maxWidth: '240px', lineHeight: 1.4 }}>
                      Upgrade requests from hospital admins will appear here instantly.
                    </span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUpgrade = notif.type === 'upgrade_request';
                    const isUnread = !notif.is_read;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '1rem 1.25rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          background: isUnread ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isUnread ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isUnread ? 'rgba(99, 102, 241, 0.08)' : 'transparent';
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isUpgrade ? 'rgba(245, 158, 11, 0.18)' : 'rgba(99, 102, 241, 0.18)',
                          color: isUpgrade ? '#f59e0b' : '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '1rem',
                          border: isUpgrade ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                        }}>
                          {isUpgrade ? '⚡' : '📢'}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '3px',
                          }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: isUnread ? 700 : 600,
                              color: isUnread ? '#ffffff' : '#cbd5e1',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {notif.title}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              color: 'var(--text-dim)',
                              flexShrink: 0,
                            }}>
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <p style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.4,
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {notif.message}
                          </p>

                          {/* Action hint */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#6366f1',
                          }}>
                            <span>View in Subscriptions →</span>
                          </div>
                        </div>

                        {/* Unread dot */}
                        {isUnread && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 6px #ef4444',
                            flexShrink: 0,
                            marginTop: '6px',
                          }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/subscriptions');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <span>Manage all hospital subscriptions →</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Role Pill */}
        <div style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {admin?.role === 'superadmin' ? '🛡️ Superadmin' : '👤 ' + (admin?.role || 'Admin')}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        @keyframes popoverFade {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      </header>

      {/* Global Search / Command Palette Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
