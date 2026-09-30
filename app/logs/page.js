'use client';
import { useState, useEffect, useCallback } from 'react';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  try {
    const diff = (new Date() - new Date(timestamp)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return '';
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHospitals = useCallback(async () => {
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data.hospitals || []);
    } catch (err) {
      console.error('[Logs] Failed to load hospitals for log filter:', err.response?.data?.error || err.message);
    }
  }, []);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = {
        page,
        limit,
        type: typeFilter,
      };
      if (hospitalFilter !== 'ALL') params.hospital_id = hospitalFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error('[Logs] Failed to fetch activity logs:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, typeFilter, hospitalFilter, fromDate, toDate, search]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Event ID', 'Category', 'Description', 'Hospital Name', 'Hospital ID', 'Actor', 'Timestamp'];
    const rows = logs.map(l => [
      l.id,
      l.type,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.hospital?.name || '').replace(/"/g, '""')}"`,
      l.hospital?.id || '',
      `"${(l.user?.name || '').replace(/"/g, '""')}"`,
      l.time || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tinitracker_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'hospital': return 'badge-indigo';
      case 'payment': return 'badge-cyan';
      case 'subscription': return 'badge-emerald';
      case 'registration': return 'badge-purple';
      case 'stage': return 'badge-amber';
      default: return 'badge-muted';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'hospital': return '🏥';
      case 'payment': return '₹';
      case 'subscription': return '💳';
      case 'registration': return '👶';
      case 'stage': return '✓';
      default: return '📋';
    }
  };

  return (
    <AdminLayout onRefreshData={() => fetchLogs(true)} isRefreshing={refreshing}>
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

        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Platform Audit & Activity Trail
              </h1>
              <span className="badge badge-indigo" style={{ marginLeft: '4px' }}>
                {total} Total Events
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Cross-hospital chronological ledger capturing tenant lifecycle, revenue collections, and clinical events.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
              📥 Export CSV
            </button>
            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search event, hospital, user..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{ paddingLeft: '38px', height: '38px' }}
              />
            </div>

            {/* Event Category Filter */}
            <div>
              <select
                className="input-field"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                style={{ height: '38px' }}
              >
                <option value="all">All Event Categories</option>
                <option value="hospital">Hospital Lifecycle</option>
                <option value="subscription">Subscriptions</option>
                <option value="payment">Financial & Payments</option>
                <option value="registration">Patient Registrations</option>
                <option value="stage">Clinical Visits & Stages</option>
              </select>
            </div>

            {/* Hospital Filter */}
            <div>
              <select
                className="input-field"
                value={hospitalFilter}
                onChange={(e) => {
                  setHospitalFilter(e.target.value);
                  setPage(1);
                }}
                style={{ height: '38px' }}
              >
                <option value="ALL">All Hospital Tenants</option>
                {hospitals.map(h => (
                  <option key={h.id} value={String(h.id)}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{ height: '38px' }}
                title="From Date"
              />
            </div>

            {/* To Date */}
            <div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{ height: '38px' }}
                title="To Date"
              />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem', width: '190px' }}>Timestamp</th>
                  <th style={{ padding: '1rem', width: '130px' }}>Category</th>
                  <th style={{ padding: '1rem' }}>Activity & Details</th>
                  <th style={{ padding: '1rem' }}>Hospital Tenant</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Streaming audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        No audit events match your criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8rem' }}>
                          {formatDate(log.time)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {getRelativeTime(log.time)}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${getBadgeClass(log.type)}`}>
                          <span>{getIcon(log.type)}</span>
                          <span style={{ textTransform: 'capitalize' }}>{log.type}</span>
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>
                          {log.description}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Event ref: {log.id}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {log.hospital?.id ? (
                          <Link
                            href={`/hospitals/${log.hospital.id}`}
                            style={{ fontWeight: 600, color: '#a5b4fc', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#a5b4fc'}
                          >
                            {log.hospital.name}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Global Platform</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                          {log.user?.name || 'System Auto'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                          {log.user?.role || 'Service'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Showing page <strong>{page}</strong> of <strong>{pages}</strong> ({total} events)
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
