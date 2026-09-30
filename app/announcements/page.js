'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ totalBroadcasts: 0, urgentCount: 0, pinnedCount: 0, globalCount: 0 });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form Fields
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'info',
    target_type: 'all',
    target_hospital_id: '',
    is_pinned: false,
  });

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchHospitals();
  }, []);

  async function fetchAnnouncements() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements || []);
      setStats(res.data.stats || { totalBroadcasts: 0, urgentCount: 0, pinnedCount: 0, globalCount: 0 });
    } catch (err) {
      console.error('[Announcements] Failed to load announcements:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  async function fetchHospitals() {
    try {
      const res = await api.get('/hospitals?limit=100');
      setHospitals(res.data.hospitals || []);
    } catch (err) {
      console.error('[Announcements] Failed to load hospitals for dropdown:', err.response?.data?.error || err.message);
    }
  }

  async function handleCreateBroadcast(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.title.trim()) {
      setFormError('Please enter a broadcast title');
      return;
    }
    if (!form.message.trim()) {
      setFormError('Please enter the announcement message');
      return;
    }
    if (form.target_type === 'hospital' && !form.target_hospital_id) {
      setFormError('Please select a target hospital');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/announcements', {
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        target_type: form.target_type,
        target_hospital_id: form.target_type === 'hospital' ? Number(form.target_hospital_id) : null,
        is_pinned: form.is_pinned,
      });

      setFormSuccess(`Broadcast dispatched! Delivered to ${res.data.delivered_count || 1} hospital feed(s).`);
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        setForm({
          title: '',
          message: '',
          priority: 'info',
          target_type: 'all',
          target_hospital_id: '',
          is_pinned: false,
        });
        fetchAnnouncements();
      }, 1200);
    } catch (err) {
      console.error('[Announcements] Failed to dispatch broadcast:', err.response?.data?.error || err.message);
      setFormError(err.response?.data?.error || 'Failed to dispatch broadcast');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePin(announcement) {
    try {
      await api.patch(`/announcements/${announcement.id}`, {
        is_pinned: !announcement.is_pinned,
      });
      fetchAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update announcement');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/announcements/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  }

  // Filtered announcements
  const filteredAnnouncements = announcements.filter(item => {
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (targetFilter === 'GLOBAL' && item.target_type !== 'all') return false;
    if (targetFilter === 'HOSPITAL' && item.target_type !== 'hospital') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q);
      const matchHospital = item.Hospital?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchHospital) return false;
    }
    return true;
  });

  return (
    <AdminLayout title="Announcements & Broadcasts" subtitle="Cross-hospital push notifications and emergency alerts">
      {/* Top Header & CTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Platform Broadcast Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Publish system-wide notifications, maintenance alerts, and policy updates directly to tenant screens.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>📢</span>
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Broadcasts
            </span>
            <span style={{ fontSize: '1.25rem' }}>📢</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            {stats.totalBroadcasts}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            All-time published messages
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Global Reach
            </span>
            <span style={{ fontSize: '1.25rem' }}>🌐</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }}>
            {stats.globalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Sent to all hospital tenants
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Urgent Alerts
            </span>
            <span style={{ fontSize: '1.25rem' }}>🚨</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f87171', marginTop: '0.5rem' }}>
            {stats.urgentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            High-priority emergency notices
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pinned Notices
            </span>
            <span style={{ fontSize: '1.25rem' }}>📌</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem' }}>
            {stats.pinnedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Highlighted at top of feeds
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by title, keywords or hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="info">ℹ️ Info Only</option>
            <option value="warning">⚠️ Warnings</option>
            <option value="urgent">🚨 Urgent Alerts</option>
          </select>

          {/* Target filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Audiences</option>
            <option value="GLOBAL">🌐 Global (All Hospitals)</option>
            <option value="HOSPITAL">🏥 Single Hospital</option>
          </select>

          <button
            onClick={fetchAnnouncements}
            style={{
              padding: '9px 14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
            title="Refresh broadcast list"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Broadcast Feed */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Loading platform announcements...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          <div>⚠️ {error}</div>
          <button
            onClick={fetchAnnouncements}
            style={{
              marginTop: '1rem',
              padding: '6px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📢</div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 6px 0' }}>No Announcements Found</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            {search || priorityFilter !== 'ALL' || targetFilter !== 'ALL'
              ? 'Try adjusting your filters or search keywords.'
              : 'Dispatch your first platform broadcast using the "New Broadcast" button above.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAnnouncements.map((item) => {
            const isUrgent = item.priority === 'urgent';
            const isWarning = item.priority === 'warning';

            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  borderLeft: isUrgent
                    ? '4px solid #ef4444'
                    : isWarning
                    ? '4px solid #f59e0b'
                    : '4px solid #6366f1',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Card Top Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* Priority Badge */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isUrgent
                          ? 'rgba(239, 68, 68, 0.18)'
                          : isWarning
                          ? 'rgba(245, 158, 11, 0.18)'
                          : 'rgba(99, 102, 241, 0.18)',
                        color: isUrgent ? '#f87171' : isWarning ? '#fbbf24' : '#a5b4fc',
                        border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.3)' : isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                      }}
                    >
                      {isUrgent ? '🚨 Urgent Critical' : isWarning ? '⚠️ Important Notice' : 'ℹ️ Standard Info'}
                    </span>

                    {/* Target Audience Badge */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {item.target_type === 'all' ? '🌐 All Hospitals' : `🏥 ${item.Hospital?.name || `Hospital #${item.target_hospital_id}`}`}
                    </span>

                    {/* Pinned Tag */}
                    {item.is_pinned ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📌 Pinned Notice
                      </span>
                    ) : null}
                  </div>

                  {/* Actions & Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <button
                      onClick={() => handleTogglePin(item)}
                      title={item.is_pinned ? 'Unpin announcement' : 'Pin to top of hospital feeds'}
                      style={{
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: item.is_pinned ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: item.is_pinned ? '#fbbf24' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {item.is_pinned ? '📌 Unpin' : '📍 Pin'}
                    </button>

                    <button
                      onClick={() => setDeleteTarget(item)}
                      title="Delete announcement"
                      style={{
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem 0' }}>
                  {item.title}
                </h3>

                {/* Message Body */}
                <div style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}>
                  {item.message}
                </div>

                {/* Card Footer */}
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                }}>
                  <div>
                    Dispatched by: <strong style={{ color: 'var(--text-muted)' }}>{item.sender_name}</strong>
                  </div>
                  <div>
                    Delivery Status: <span style={{ color: '#34d399' }}>✓ Broadcast Synced</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Broadcast Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
                  📢 Compose New Broadcast
                </h3>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  This notification will immediately be published to hospital tenant dashboard feeds.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                ⚠️ {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                ✓ {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateBroadcast}>
              {/* Title */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  BROADCAST TITLE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Infrastructure Upgrade / Emergency Advisory"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={200}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Priority Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PRIORITY LEVEL *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, priority: 'info' })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: form.priority === 'info' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      background: form.priority === 'info' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.priority === 'info' ? '#a5b4fc' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    ℹ️ Standard Info
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, priority: 'warning' })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: form.priority === 'warning' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                      background: form.priority === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.priority === 'warning' ? '#fbbf24' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    ⚠️ Important Notice
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, priority: 'urgent' })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: form.priority === 'urgent' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                      background: form.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.priority === 'urgent' ? '#f87171' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    🚨 Urgent Critical
                  </button>
                </div>
              </div>

              {/* Target Audience */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  TARGET AUDIENCE *
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="target_type"
                      checked={form.target_type === 'all'}
                      onChange={() => setForm({ ...form, target_type: 'all', target_hospital_id: '' })}
                    />
                    🌐 All Hospitals (Global Broadcast)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="target_type"
                      checked={form.target_type === 'hospital'}
                      onChange={() => setForm({ ...form, target_type: 'hospital' })}
                    />
                    🏥 Specific Hospital
                  </label>
                </div>

                {form.target_type === 'hospital' && (
                  <select
                    value={form.target_hospital_id}
                    onChange={(e) => setForm({ ...form, target_hospital_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">Select target hospital...</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.address ? `(${h.address})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  MESSAGE CONTENT *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed instructions, maintenance schedules, or essential information for hospital administrators and staff..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Pin checkbox */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>📌 Pin this announcement at the top of hospital feeds</span>
                </label>
              </div>

              {/* Live Preview Card */}
              {form.title && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
                    Tenant Alert Bell Preview:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: form.priority === 'urgent' ? '#f87171' : form.priority === 'warning' ? '#fbbf24' : '#a5b4fc' }}>
                    {form.priority === 'urgent' ? '🚨 [URGENT] ' : form.priority === 'warning' ? '⚠️ [NOTICE] ' : '📢 '}
                    {form.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {form.message || 'Notification text will appear here...'}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f87171', fontSize: '1.15rem', fontWeight: 800 }}>
              🗑️ Delete Announcement?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
              Are you sure you want to remove the broadcast <strong>"{deleteTarget.title}"</strong>?
              This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
