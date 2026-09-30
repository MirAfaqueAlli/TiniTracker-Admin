'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import api from '@/lib/api';

const QUICK_PAGES = [
  { title: 'Dashboard', path: '/dashboard', icon: '📊', category: 'Pages', hint: 'Platform metrics & overview' },
  { title: 'Hospital Management', path: '/hospitals', icon: '🏥', category: 'Pages', hint: 'Browse, register & manage hospitals' },
  { title: 'Subscriptions & Upgrades', path: '/subscriptions', icon: '💳', category: 'Pages', hint: 'Active plans, trial status & requests' },
  { title: 'Hospital Staff & Users', path: '/users', icon: '👥', category: 'Pages', hint: 'All registered hospital staff & doctors' },
  { title: 'Audit & System Logs', path: '/logs', icon: '📜', category: 'Pages', hint: 'Platform activity & security logs' },
  { title: 'Revenue & Financial Reports', path: '/reports', icon: '📈', category: 'Pages', hint: 'Financial summary & exports' },
  { title: 'System Announcements', path: '/announcements', icon: '📢', category: 'Pages', hint: 'Broadcast messages to hospital staff' },
  { title: 'Platform Settings', path: '/settings', icon: '⚙️', category: 'Pages', hint: 'Configuration & provider rules' },
  { title: 'Provider Admins', path: '/admins', icon: '🛡️', category: 'Pages', hint: 'Manage provider administrative accounts' },
];

export default function GlobalSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    hospitals: [],
    subscriptions: [],
    requests: [],
    users: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [portalRoot, setPortalRoot] = useState(null);

  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults({ hospitals: [], subscriptions: [], requests: [], users: [] });
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced search query
  const performSearch = useCallback(async (q) => {
    if (!q || q.trim().length === 0) {
      setResults({ hospitals: [], subscriptions: [], requests: [], users: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      setResults({
        hospitals: res.data.hospitals || [],
        subscriptions: res.data.subscriptions || [],
        requests: res.data.requests || [],
        users: res.data.users || [],
      });
      setSelectedIndex(0);
    } catch (err) {
      console.error('[Search] Search request failed:', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    if (!val.trim()) {
      setResults({ hospitals: [], subscriptions: [], requests: [], users: [] });
      setLoading(false);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      performSearch(val);
    }, 200);
  };

  // Compile items list for keyboard navigation
  const matchingPages = query.trim()
    ? QUICK_PAGES.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.hint.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_PAGES;

  const flatItems = [];

  matchingPages.forEach(p => {
    flatItems.push({
      type: 'page',
      title: p.title,
      sub: p.hint,
      icon: p.icon,
      path: p.path,
    });
  });

  results.hospitals.forEach(h => {
    flatItems.push({
      type: 'hospital',
      title: h.name,
      sub: `${h.address || 'Address N/A'} • ${h.phone || 'No phone'}`,
      icon: '🏥',
      path: `/hospitals?search=${encodeURIComponent(h.name)}`,
      badge: h.is_blocked ? 'blocked' : 'active',
      badgeColor: h.is_blocked ? '#ef4444' : '#10b981',
    });
  });

  results.requests.forEach(r => {
    flatItems.push({
      type: 'request',
      title: `${r.Hospital?.name || 'Hospital'} — Upgrade Request: ${(r.requested_plan || 'Plan').toUpperCase()}`,
      sub: `Cycle: ${r.billing_cycle || 'monthly'} • Phone: ${r.contact_phone || 'N/A'} • Status: ${r.status}`,
      icon: '⚡',
      path: `/subscriptions?search=${encodeURIComponent(r.Hospital?.name || '')}`,
      badge: r.status,
      badgeColor: '#f59e0b',
    });
  });

  results.subscriptions.forEach(s => {
    flatItems.push({
      type: 'subscription',
      title: `${s.Hospital?.name || 'Hospital'} — ${(s.plan || 'Free Trial').toUpperCase()} Plan`,
      sub: `Active: ${s.is_active ? 'Yes' : 'No'} • Starts: ${s.starts_at || 'N/A'} • Ends: ${s.ends_at || 'N/A'}`,
      icon: '💳',
      path: `/subscriptions?search=${encodeURIComponent(s.Hospital?.name || '')}`,
      badge: s.is_active ? 'active' : 'inactive',
      badgeColor: s.is_active ? '#10b981' : '#64748b',
    });
  });

  results.users.forEach(u => {
    flatItems.push({
      type: 'user',
      title: u.name,
      sub: `${u.email} • Role: ${u.role} • ${u.Hospital?.name || 'Global'}`,
      icon: '👤',
      path: `/users?search=${encodeURIComponent(u.email || u.name)}`,
      badge: u.is_blocked ? 'blocked' : u.role,
      badgeColor: u.is_blocked ? '#ef4444' : '#6366f1',
    });
  });

  const handleSelectItem = (item) => {
    if (item?.path) {
      router.push(item.path);
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelectItem(flatItems[selectedIndex]);
      }
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen || !portalRoot) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
          animation: 'fadeInSlide 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}>
          <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search hospitals, upgrade requests, staff, logs, or pages..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          />
          {loading && (
            <span style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#00857c',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults({ hospitals: [], subscriptions: [], requests: [], users: [] });
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          )}
          <kbd style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '0.7rem',
            color: '#94a3b8',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {flatItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '2rem' }}>🔎</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8' }}>
                No results found for &ldquo;{query}&rdquo;
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                Try searching for hospital names, cities, plans, or staff emails.
              </span>
            </div>
          ) : (
            <>
              {/* Group by category if query */}
              {flatItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.type}-${idx}`}
                    data-selected={isSelected}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(0, 133, 124, 0.2)' : 'transparent',
                      border: isSelected ? '1px solid rgba(0, 133, 124, 0.4)' : '1px solid transparent',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(0, 133, 124, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: isSelected ? '#ffffff' : '#e2e8f0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: item.badgeColor ? `${item.badgeColor}22` : 'rgba(255, 255, 255, 0.1)',
                            color: item.badgeColor || '#38bdf8',
                            border: `1px solid ${item.badgeColor ? `${item.badgeColor}44` : 'rgba(255, 255, 255, 0.15)'}`,
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}>
                        {item.sub}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      color: isSelected ? '#38bdf8' : 'transparent',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      ↵ Open
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          fontSize: '0.72rem',
          color: '#64748b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>↑↓</kbd> Navigate</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>↵</kbd> Select</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>ESC</kbd> Close</span>
          </div>
          <span>Provider Admin Command Center</span>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
