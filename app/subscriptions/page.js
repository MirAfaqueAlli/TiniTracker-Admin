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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected subscription IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Edit / Extend Modal
  const [editModal, setEditModal] = useState({ open: false, sub: null, plan: '', ends_at: '', is_active: true, notes: '', loading: false });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Upgrade requests state
  const [requests, setRequests] = useState([]);
  const [approvingId, setApprovingId] = useState(null);

  const fetchSubscriptions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions || []);
    } catch (err) {
      console.error('[Subscriptions] Failed to load subscriptions:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/subscriptions/requests?status=pending');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('[Subscriptions] Failed to load upgrade requests:', err.response?.data?.error || err.message);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchRequests();
  }, [fetchSubscriptions, fetchRequests]);

  const handleApproveRequest = async (reqId) => {
    setApprovingId(reqId);
    try {
      const res = await api.post(`/subscriptions/requests/${reqId}/approve`);
      showToast(res.data.message || 'Upgrade request approved and plan activated!');
      fetchRequests();
      fetchSubscriptions(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve request', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (reqId) => {
    if (!confirm('Are you sure you want to decline this upgrade request?')) return;
    try {
      await api.post(`/subscriptions/requests/${reqId}/reject`);
      showToast('Upgrade request declined');
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to decline request', 'error');
    }
  };

  // Handle Quick +30 Days Extend
  const handleQuickExtend = async (subId) => {
    try {
      await api.patch(`/subscriptions/${subId}`, { add_days: 30 });
      showToast('Extended subscription by 30 days');
      fetchSubscriptions(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to extend', 'error');
    }
  };

  // Handle Save Edit Modal
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const { sub, plan, ends_at, is_active, notes } = editModal;
    if (!sub) return;

    setEditModal(prev => ({ ...prev, loading: true }));
    try {
      await api.patch(`/subscriptions/${sub.id}`, {
        plan,
        ends_at,
        is_active,
        notes,
      });
      showToast('Subscription updated successfully');
      setEditModal({ open: false, sub: null, plan: '', ends_at: '', is_active: true, notes: '', loading: false });
      fetchSubscriptions(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update subscription', 'error');
      setEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle Bulk Extension
  const handleBulkExtend = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/subscriptions/bulk-extend', {
        subscription_ids: selectedIds,
        days: bulkDays,
      });
      showToast(res.data.message || `Extended ${selectedIds.length} subscriptions`);
      setSelectedIds([]);
      fetchSubscriptions(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to execute bulk extension', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Multi-select helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredSubscriptions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubscriptions.map(s => s.id));
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (subscriptions.length === 0) return;
    const headers = ['Sub ID', 'Hospital Name', 'Plan', 'Starts At', 'Ends At', 'Days Left', 'Active', 'Notes', 'Created Date'];
    const rows = filteredSubscriptions.map(s => [
      s.id,
      `"${(s.hospital?.name || '').replace(/"/g, '""')}"`,
      s.plan,
      s.starts_at || '',
      s.ends_at || '',
      s.days_left ?? '',
      s.is_active ? 'Yes' : 'No',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      s.createdAt ? s.createdAt.slice(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tinitracker_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const today = new Date().toISOString().slice(0, 10);
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.hospital?.name?.toLowerCase().includes(q) ||
        s.plan?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q) ||
        String(s.hospital_id).includes(q);

      if (!matchSearch) return false;

      if (planFilter !== 'ALL' && s.plan !== planFilter) return false;

      if (statusFilter === 'ACTIVE') {
        if (!s.is_active || s.expired) return false;
      } else if (statusFilter === 'EXPIRING_SOON') {
        if (!s.is_active || s.expired || s.days_left > 30) return false;
      } else if (statusFilter === 'EXPIRED') {
        if (!s.expired) return false;
      } else if (statusFilter === 'INACTIVE') {
        if (s.is_active) return false;
      }

      return true;
    });
  }, [subscriptions, search, planFilter, statusFilter]);

  const activeCount = subscriptions.filter(s => s.is_active && !s.expired).length;
  const expiringSoonCount = subscriptions.filter(s => s.is_active && !s.expired && s.days_left <= 30).length;
  const expiredCount = subscriptions.filter(s => s.expired || !s.is_active).length;

  return (
    <AdminLayout onRefreshData={() => fetchSubscriptions(true)} isRefreshing={refreshing}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Toast */}
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
          }}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.5rem' }}>💳</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Subscriptions & Billing Governance
              </h1>
              <span className="badge badge-indigo" style={{ marginLeft: '4px' }}>
                {subscriptions.length} Cycles
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Manage multi-tenant licensing tiers, cycle expiration dates, grace periods, and bulk renewal operations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
              📥 Export CSV
            </button>
            <button
              onClick={() => fetchSubscriptions(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Subscriptions
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {activeCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Contracted and in good standing
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Expiring Soon (&lt; 30d)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
              {expiringSoonCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Follow-up required
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Expired / Inactive
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: expiredCount > 0 ? '#fb7185' : 'var(--text-muted)', marginTop: '2px' }}>
              {expiredCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Lapsed terms
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Multi-Select Active
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: selectedIds.length > 0 ? '#a5b4fc' : 'var(--text-dim)', marginTop: '2px' }}>
              {selectedIds.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Ready for batch renewal
            </div>
          </div>
        </div>

        {/* Pending Upgrade Requests Section */}
        {requests.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>⚡</span>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fef3c7', margin: 0 }}>
                    Pending Hospital Upgrade Requests ({requests.length})
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#fde68a', margin: '2px 0 0' }}>
                    Hospital administrators on free trial have submitted upgrade requests awaiting provider activation.
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.25)',
                color: '#fef08a',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}>
                Action Required
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requests.map((req) => (
                <div key={req.id} style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                        {req.hospital_name || req.Hospital?.name || 'Hospital'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}>
                        {req.current_plan} → {req.requested_plan?.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                      }}>
                        {req.billing_cycle?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Requested by <strong>{req.user_name}</strong> ({req.user_email})
                      {req.contact_phone && ` • Phone: ${req.contact_phone}`}
                    </div>

                    {req.notes && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#cbd5e1',
                        fontStyle: 'italic',
                        marginTop: '2px',
                      }}>
                        "{req.notes}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      disabled={approvingId === req.id}
                      className="btn-primary"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.78rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                      }}
                    >
                      {approvingId === req.id ? 'Activating...' : 'Approve & Activate Plan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Action Bar (Visible when 1+ selected) */}
        {selectedIds.length > 0 && (
          <div style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.3rem' }}>⚡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                  {selectedIds.length} Subscription(s) Selected
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Extend all selected subscriptions in a single atomic batch operation.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Extend by:</span>
                <select
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '130px', padding: '6px 10px', height: '36px' }}
                >
                  <option value={15}>+ 15 Days</option>
                  <option value={30}>+ 30 Days (1 Mo)</option>
                  <option value={60}>+ 60 Days (2 Mo)</option>
                  <option value={90}>+ 90 Days (Quarter)</option>
                  <option value={180}>+ 180 Days (Half Yr)</option>
                  <option value={365}>+ 365 Days (1 Yr)</option>
                </select>
              </div>

              <button
                onClick={handleBulkExtend}
                disabled={bulkLoading}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                {bulkLoading ? 'Extending...' : `Apply +${bulkDays} Days Extension`}
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="btn-ghost"
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search hospital, plan, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '38px', height: '42px' }}
              />
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
                <option value="ALL">All Lifecycle Statuses</option>
                <option value="ACTIVE">Active & Operational</option>
                <option value="EXPIRING_SOON">Expiring in &lt; 30 Days</option>
                <option value="EXPIRED">Expired Subscriptions</option>
                <option value="INACTIVE">Deactivated Manually</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredSubscriptions.length > 0 && selectedIds.length === filteredSubscriptions.length}
                      onChange={selectAll}
                      style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '1rem 1.25rem' }}>Hospital Tenant</th>
                  <th style={{ padding: '1rem' }}>Plan Tier</th>
                  <th style={{ padding: '1rem' }}>Validity Period</th>
                  <th style={{ padding: '1rem' }}>Status & Days Left</th>
                  <th style={{ padding: '1rem' }}>Notes</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading subscriptions ledger...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        No subscriptions matched your search or filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((s) => {
                    const isSelected = selectedIds.includes(s.id);
                    const isExp = s.expired;
                    const isSoon = !isExp && s.days_left <= 30;

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <Link
                            href={`/hospitals/${s.hospital_id}`}
                            style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                          >
                            {s.hospital?.name || `Hospital #${s.hospital_id}`}
                          </Link>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {s.hospital?.address || 'No address registered'}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                            {s.plan?.replace('_', ' ')}
                          </span>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.82rem' }}>
                            {formatDate(s.starts_at)} → {formatDate(s.ends_at)}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div>
                            <span className={`badge ${!s.is_active ? 'badge-muted' : isExp ? 'badge-rose' : isSoon ? 'badge-amber' : 'badge-emerald'}`}>
                              {!s.is_active ? 'Deactivated' : isExp ? 'Expired' : isSoon ? `${s.days_left}d left` : 'Active'}
                            </span>
                            {s.is_active && !isExp && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                                Ends {formatDate(s.ends_at)}
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                          {s.notes || '—'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleQuickExtend(s.id)}
                              className="btn-secondary"
                              style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                              title="Instantly extend end date by 30 days"
                            >
                              +30 Days
                            </button>

                            <button
                              onClick={() => setEditModal({
                                open: true,
                                sub: s,
                                plan: s.plan,
                                ends_at: s.ends_at || '',
                                is_active: s.is_active,
                                notes: s.notes || '',
                                loading: false,
                              })}
                              className="btn-ghost"
                              style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                              title="Edit subscription parameters"
                            >
                              ✏️ Edit
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

        {/* Modal: Edit Subscription */}
        {editModal.open && editModal.sub && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            backgroundColor: 'rgba(4, 7, 13, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <div style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Edit Subscription #{editModal.sub.id}
                </h3>
                <button
                  onClick={() => setEditModal({ open: false, sub: null, plan: '', ends_at: '', is_active: true, notes: '', loading: false })}
                  className="btn-ghost"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Plan Tier</label>
                  <select
                    className="input-field"
                    value={editModal.plan}
                    onChange={(e) => setEditModal({ ...editModal, plan: e.target.value })}
                  >
                    <option value="free_trial">Free Trial</option>
                    <option value="monthly">Monthly Standard</option>
                    <option value="quarterly">Quarterly Pro</option>
                    <option value="yearly">Annual Enterprise</option>
                    <option value="custom">Custom Contract</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Contract End Date</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={editModal.ends_at}
                    onChange={(e) => setEditModal({ ...editModal, ends_at: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem' }}>
                    <input
                      type="checkbox"
                      checked={editModal.is_active}
                      onChange={(e) => setEditModal({ ...editModal, is_active: e.target.checked })}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Active Status</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>(Unchecking deactivates the plan)</span>
                  </label>
                </div>

                <div>
                  <label className="input-label">Notes</label>
                  <textarea
                    rows={3}
                    className="input-field"
                    value={editModal.notes}
                    onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditModal({ open: false, sub: null, plan: '', ends_at: '', is_active: true, notes: '', loading: false })}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={editModal.loading} className="btn-primary">
                    {editModal.loading ? 'Saving...' : 'Save Subscription'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
