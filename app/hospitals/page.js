'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function HospitalsListPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Block confirmation modal state
  const [blockModal, setBlockModal] = useState({ open: false, hospital: null, loading: false });
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, hospital: null, confirmInput: '', loading: false, error: '' });
  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHospitals = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data.hospitals || []);
    } catch (err) {
      console.error('[Hospitals] Failed to load hospitals:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to load hospitals', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Handle Block / Unblock action
  const handleToggleBlock = async () => {
    const { hospital } = blockModal;
    if (!hospital) return;

    setBlockModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/hospitals/${hospital.id}/block`, {
        is_blocked: !hospital.is_blocked,
      });
      showToast(res.data.message || 'Hospital status updated');
      setBlockModal({ open: false, hospital: null, loading: false });
      fetchHospitals(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change status', 'error');
      setBlockModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle Delete Hospital
  const handleDeleteHospital = async () => {
    const { hospital, confirmInput } = deleteModal;
    if (!hospital) return;
    if (confirmInput.trim().toLowerCase() !== hospital.name.trim().toLowerCase()) {
      setDeleteModal(prev => ({ ...prev, error: 'Please enter the exact hospital name to confirm deletion.' }));
      return;
    }

    setDeleteModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.delete(`/hospitals/${hospital.id}`);
      showToast(res.data.message || `Hospital ${hospital.name} deleted`, 'success');
      setDeleteModal({ open: false, hospital: null, confirmInput: '', loading: false, error: '' });
      fetchHospitals(true);
    } catch (err) {
      setDeleteModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Failed to delete hospital',
      }));
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (hospitals.length === 0) return;
    const headers = ['ID', 'Hospital Name', 'Address', 'Phone', 'Admin Name', 'Admin Email', 'Plan', 'Plan Starts', 'Plan Ends', 'Status', 'Users Count', 'Patients Count', 'Registered Date'];
    const rows = filteredHospitals.map(h => [
      h.id,
      `"${(h.name || '').replace(/"/g, '""')}"`,
      `"${(h.address || '').replace(/"/g, '""')}"`,
      `"${h.phone || ''}"`,
      `"${(h.admin_name || '').replace(/"/g, '""')}"`,
      `"${h.admin_email || ''}"`,
      h.subscription?.plan || 'None',
      h.subscription?.starts_at || '',
      h.subscription?.ends_at || '',
      h.is_blocked ? 'Blocked' : (h.subscription?.expired ? 'Expired' : 'Active'),
      h.user_count || 0,
      h.patient_count || 0,
      h.createdAt ? h.createdAt.slice(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tinitracker_hospitals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort logic
  const today = new Date().toISOString().split('T')[0];
  const d30 = new Date();
  d30.setDate(d30.getDate() + 30);
  const in30Days = d30.toISOString().split('T')[0];

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        h.name?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q) ||
        h.admin_email?.toLowerCase().includes(q) ||
        h.admin_name?.toLowerCase().includes(q) ||
        String(h.id).includes(q);

      if (!matchSearch) return false;

      // Plan filter
      if (planFilter !== 'ALL') {
        const p = h.subscription?.plan || 'none';
        if (p !== planFilter) return false;
      }

      // Status filter
      if (statusFilter === 'BLOCKED') {
        if (!h.is_blocked) return false;
      } else if (statusFilter === 'ACTIVE') {
        if (h.is_blocked || !h.subscription || h.subscription.expired) return false;
      } else if (statusFilter === 'EXPIRED') {
        if (h.is_blocked || (h.subscription && !h.subscription.expired)) return false;
      } else if (statusFilter === 'EXPIRING_SOON') {
        if (h.is_blocked || !h.subscription || h.subscription.expired || h.subscription.ends_at > in30Days) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'patients') return (b.patient_count || 0) - (a.patient_count || 0);
      if (sortBy === 'users') return (b.user_count || 0) - (a.user_count || 0);
      return 0;
    });
  }, [hospitals, search, planFilter, statusFilter, sortBy, in30Days]);

  // Summary counts
  const totalCount = hospitals.length;
  const blockedCount = hospitals.filter(h => h.is_blocked).length;
  const activeCount = hospitals.filter(h => !h.is_blocked && h.subscription && !h.subscription.expired).length;
  const expiringSoonCount = hospitals.filter(h => !h.is_blocked && h.subscription && !h.subscription.expired && h.subscription.ends_at <= in30Days).length;

  return (
    <AdminLayout onRefreshData={() => fetchHospitals(true)} isRefreshing={refreshing}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Toast Alert */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 150,
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: toast.type === 'error' ? 'rgba(244, 63, 94, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            fontSize: '0.85rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.5rem' }}>🏥</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Hospitals Directory
              </h1>
              <span className="badge badge-indigo" style={{ marginLeft: '4px' }}>
                {totalCount} Total
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Manage registered hospital tenants, access credentials, lifecycle states, and resource quotas.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleExportCSV}
              className="btn-secondary"
              title="Download CSV report of hospitals"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fetchHospitals(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Quick Overview Summary Chips */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Hospitals
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {activeCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Normal operations
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Expiring Soon (&lt; 30d)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
              {expiringSoonCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Renewal due soon
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Suspended / Blocked
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: blockedCount > 0 ? '#fb7185' : 'var(--text-muted)', marginTop: '2px' }}>
              {blockedCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Platform logins restricted
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Filtered Matches
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>
              {filteredHospitals.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Showing in table
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search hospital, city, admin, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '38px', height: '42px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Plan Filter */}
            <div>
              <select
                className="input-field"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{ height: '42px' }}
              >
                <option value="ALL">All Subscription Plans</option>
                <option value="free_trial">Free Trial</option>
                <option value="monthly">Monthly Standard</option>
                <option value="quarterly">Quarterly Pro</option>
                <option value="yearly">Annual Enterprise</option>
                <option value="custom">Custom Tier</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '42px' }}
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="ACTIVE">Active & Operational</option>
                <option value="EXPIRING_SOON">Expiring in &lt; 30 Days</option>
                <option value="EXPIRED">Expired Subscriptions</option>
                <option value="BLOCKED">Blocked / Suspended</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                className="input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ height: '42px' }}
              >
                <option value="newest">Sort: Newly Registered First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="name">Sort: Hospital Name (A-Z)</option>
                <option value="patients">Sort: Most Patients Tracked</option>
                <option value="users">Sort: Most Staff Accounts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hospitals Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Hospital</th>
                  <th style={{ padding: '1rem' }}>Primary Admin</th>
                  <th style={{ padding: '1rem' }}>Subscription Tier</th>
                  <th style={{ padding: '1rem' }}>Metrics</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading hospitals directory...
                    </td>
                  </tr>
                ) : filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        No hospitals match your filter criteria.
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        Try adjusting your search terms or clearing status filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((h) => {
                    const sub = h.subscription;
                    const isExpiringSoon = sub && !sub.expired && sub.ends_at <= in30Days;

                    return (
                      <tr
                        key={h.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'background-color 0.15s ease',
                          backgroundColor: h.is_blocked ? 'rgba(244, 63, 94, 0.04)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = h.is_blocked ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = h.is_blocked ? 'rgba(244, 63, 94, 0.04)' : 'transparent';
                        }}
                      >
                        {/* Hospital Info */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              backgroundColor: h.is_blocked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: h.is_blocked ? '#fb7185' : '#a5b4fc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              {h.is_blocked ? '⛔' : '🏥'}
                            </div>
                            <div>
                              <Link
                                href={`/hospitals/${h.id}`}
                                style={{
                                  fontWeight: 700,
                                  color: '#ffffff',
                                  fontSize: '0.88rem',
                                  textDecoration: 'none',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                              >
                                {h.name}
                              </Link>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                #{h.id} · {h.address || h.city || 'No address registered'}
                                {h.phone && ` · ${h.phone}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Admin info */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                            {h.admin_name || '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {h.admin_email || '—'}
                          </div>
                        </td>

                        {/* Subscription */}
                        <td style={{ padding: '1rem' }}>
                          {sub ? (
                            <div>
                              <span className={`badge ${sub.expired ? 'badge-rose' : isExpiringSoon ? 'badge-amber' : 'badge-emerald'}`}>
                                {sub.expired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'} · {sub.plan?.replace('_', ' ')}
                              </span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                Valid: {formatDate(sub.starts_at)} → {formatDate(sub.ends_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="badge badge-muted">No Plan</span>
                          )}
                        </td>

                        {/* Scale / Metrics */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: '#ffffff',
                              border: '1px solid var(--border-subtle)',
                            }} title="Registered staff members">
                              👥 {h.user_count || 0} users
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(236, 72, 153, 0.1)',
                              color: '#f472b6',
                              border: '1px solid rgba(236, 72, 153, 0.25)',
                            }} title="Maternal/child patients tracked">
                              👶 {h.patient_count || 0} pts
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '1rem' }}>
                          {h.is_blocked ? (
                            <span className="badge badge-rose">
                              ⛔ Blocked
                            </span>
                          ) : (
                            <span className="badge badge-emerald">
                              ✓ Operational
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Link
                              href={`/hospitals/${h.id}`}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                              title="View complete details and management panel"
                            >
                              Manage →
                            </Link>

                            <button
                              onClick={() => setBlockModal({ open: true, hospital: h, loading: false })}
                              className="btn-ghost"
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.76rem',
                                color: h.is_blocked ? '#34d399' : '#fb7185',
                              }}
                              title={h.is_blocked ? 'Unblock and restore hospital' : 'Suspend and block hospital'}
                            >
                              {h.is_blocked ? 'Unblock' : 'Block'}
                            </button>

                            <button
                              onClick={() => setDeleteModal({ open: true, hospital: h, confirmInput: '', loading: false, error: '' })}
                              className="btn-ghost"
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.76rem',
                                color: 'var(--text-dim)',
                              }}
                              title="Delete hospital (Cascade)"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Block / Unblock Confirmation */}
        {blockModal.open && blockModal.hospital && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(5, 8, 15, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                {blockModal.hospital.is_blocked ? '🔓' : '⛔'}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                {blockModal.hospital.is_blocked ? 'Unblock Hospital?' : 'Suspend Hospital Tenant?'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {blockModal.hospital.is_blocked
                  ? `Are you sure you want to unblock "${blockModal.hospital.name}"? Staff and doctors from this hospital will immediately regain access to their tracking system.`
                  : `Are you sure you want to block "${blockModal.hospital.name}"? All existing sessions will be invalidated and users will receive a suspension message upon login.`}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={() => setBlockModal({ open: false, hospital: null, loading: false })}
                  disabled={blockModal.loading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={blockModal.loading}
                  style={{
                    backgroundColor: blockModal.hospital.is_blocked ? '#10b981' : '#f43f5e',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {blockModal.loading
                    ? 'Processing...'
                    : blockModal.hospital.is_blocked
                    ? 'Yes, Unblock'
                    : 'Yes, Suspend Hospital'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Hospital Confirmation (Cascade Warning) */}
        {deleteModal.open && deleteModal.hospital && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(5, 8, 15, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div style={{
              width: '100%',
              maxWidth: 520,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.2)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginBottom: '0.5rem' }}>
                Permanent Cascade Deletion
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                You are about to permanently delete <strong>{deleteModal.hospital.name}</strong> (ID #{deleteModal.hospital.id}).
                This will irretrievably erase:
              </p>
              <ul style={{ fontSize: '0.8rem', color: '#fca5a5', paddingLeft: '1.25rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                <li>All <strong>{deleteModal.hospital.patient_count || 0} patient records</strong> and immunization history</li>
                <li>All <strong>{deleteModal.hospital.user_count || 0} doctor and staff user accounts</strong></li>
                <li>All subscription periods and payment receipts</li>
                <li>All notification schedules and hospital configurations</li>
              </ul>

              {deleteModal.error && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}>
                  {deleteModal.error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  To confirm, type <strong style={{ color: '#ffffff' }}>{deleteModal.hospital.name}</strong> below:
                </label>
                <input
                  type="text"
                  placeholder={deleteModal.hospital.name}
                  value={deleteModal.confirmInput}
                  onChange={(e) => setDeleteModal(prev => ({ ...prev, confirmInput: e.target.value, error: '' }))}
                  className="input-field"
                  style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={() => setDeleteModal({ open: false, hospital: null, confirmInput: '', loading: false, error: '' })}
                  disabled={deleteModal.loading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteHospital}
                  disabled={deleteModal.loading || deleteModal.confirmInput.trim().toLowerCase() !== deleteModal.hospital.name.trim().toLowerCase()}
                  style={{
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: deleteModal.confirmInput.trim().toLowerCase() === deleteModal.hospital.name.trim().toLowerCase() ? 1 : 0.5,
                  }}
                >
                  {deleteModal.loading ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
