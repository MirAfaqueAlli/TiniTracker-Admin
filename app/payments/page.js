'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

function formatCurrency(val) {
  if (val === undefined || val === null) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
}

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

export default function PaymentsRevenuePage() {
  const [revenueData, setRevenueData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');

  // Record Payment Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    hospital_id: '',
    amount: '',
    currency: 'INR',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'UPI',
    reference: '',
    notes: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [revRes, payRes, hospRes] = await Promise.all([
        api.get('/revenue'),
        api.get('/payments'),
        api.get('/hospitals'),
      ]);

      setRevenueData(revRes.data);
      setPayments(payRes.data.payments || []);
      setHospitals(hospRes.data.hospitals || []);
    } catch (err) {
      console.error('[Payments] Failed to load payments and revenue data:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to load financial data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Record Payment Submit
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!recordForm.hospital_id || !recordForm.amount) {
      showToast('Please select a hospital and enter the amount', 'error');
      return;
    }

    setRecordLoading(true);
    try {
      await api.post('/payments', recordForm);
      showToast('Payment recorded successfully');
      setShowRecordModal(false);
      setRecordForm({
        hospital_id: '',
        amount: '',
        currency: 'INR',
        payment_date: new Date().toISOString().slice(0, 10),
        method: 'UPI',
        reference: '',
        notes: '',
      });
      loadData(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record payment', 'error');
    } finally {
      setRecordLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ['Receipt ID', 'Hospital Name', 'Amount (INR)', 'Payment Date', 'Method', 'Reference / UTR', 'Notes', 'Recorded Date'];
    const rows = filteredPayments.map(p => [
      p.id,
      `"${(p.Hospital?.name || '').replace(/"/g, '""')}"`,
      p.amount,
      p.payment_date || '',
      p.method || '',
      `"${(p.reference || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      p.createdAt ? p.createdAt.slice(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tinitracker_payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.Hospital?.name?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        String(p.amount).includes(q);

      if (!matchSearch) return false;

      if (methodFilter !== 'ALL' && p.method !== methodFilter) return false;
      if (hospitalFilter !== 'ALL' && String(p.hospital_id) !== hospitalFilter) return false;

      return true;
    });
  }, [payments, search, methodFilter, hospitalFilter]);

  // Compute highest month for bar chart normalization
  const monthlyTrend = revenueData?.monthlyTrend || [];
  const maxMonthValue = Math.max(...monthlyTrend.map(m => m.total), 1000);

  return (
    <AdminLayout onRefreshData={() => loadData(true)} isRefreshing={refreshing}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
              <span style={{ fontSize: '1.5rem' }}>💰</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Payments & Revenue Intelligence
              </h1>
              <span className="badge badge-emerald" style={{ marginLeft: '4px' }}>
                Financial Ledger
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Platform collections across all hospitals, cash flow trajectories, payment receipts, and reconciliation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowRecordModal(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <span>+</span>
              <span>Record Payment</span>
            </button>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
              📥 Export CSV
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-panel gradient-card-kpi" style={{ padding: '1.5rem', '--kpi-glow': 'rgba(6, 182, 212, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Revenue (All Time)
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              {loading ? '—' : formatCurrency(revenueData?.totalRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Cumulative platform billing
            </div>
          </div>

          <div className="glass-panel gradient-card-kpi" style={{ padding: '1.5rem', '--kpi-glow': 'rgba(16, 185, 129, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              This Month's Collections
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
              {loading ? '—' : formatCurrency(revenueData?.thisMonthRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Current monthly run-rate
            </div>
          </div>

          <div className="glass-panel gradient-card-kpi" style={{ padding: '1.5rem', '--kpi-glow': 'rgba(99, 102, 241, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Annual Revenue (YTD)
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#a5b4fc', marginTop: '4px' }}>
              {loading ? '—' : formatCurrency(revenueData?.thisYearRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Calendar year to date
            </div>
          </div>

          <div className="glass-panel gradient-card-kpi" style={{ padding: '1.5rem', '--kpi-glow': 'rgba(245, 158, 11, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Overdue / Unpaid Tenants
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: (revenueData?.overdueHospitals?.length || 0) > 0 ? '#fbbf24' : '#34d399', marginTop: '4px' }}>
              {loading ? '—' : revenueData?.overdueHospitals?.length || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Expired subscriptions pending renewal
            </div>
          </div>
        </div>

        {/* Middle Two-Column Section: Visual Revenue Chart + Payment Methods Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          {/* Left: 12-Month Inflow Trend Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  12-Month Cash Inflow Trajectory
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Monthly billing collections recorded across all tenant nodes.
                </p>
              </div>
              <span className="badge badge-cyan">Annual Trajectory</span>
            </div>

            {/* Visual Bar Chart */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '8px',
              height: '180px',
              paddingTop: '20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              {monthlyTrend.map((m, idx) => {
                const heightPercent = maxMonthValue > 0 ? Math.max(8, (m.total / maxMonthValue) * 100) : 8;
                return (
                  <div key={idx} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}>
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: m.total > 0 ? '#38bdf8' : 'transparent',
                    }}>
                      {m.total > 0 ? `₹${Math.round(m.total / 1000)}k` : ''}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        maxWidth: '28px',
                        height: `${heightPercent}%`,
                        borderRadius: '6px 6px 2px 2px',
                        background: m.total > 0
                          ? 'linear-gradient(180deg, #06b6d4, #6366f1)'
                          : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: m.total > 0 ? '0 0 12px rgba(6, 182, 212, 0.3)' : 'none',
                        transition: 'height 0.4s ease',
                      }}
                      title={`${m.label}: ${formatCurrency(m.total)} (${m.count} txns)`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Month labels under bars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
              {monthlyTrend.map((m, idx) => (
                <div key={idx} style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '0.65rem',
                  color: 'var(--text-dim)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}>
                  {m.label.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Payment Channels & Top Contributing Hospitals */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Settlement Channels
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Breakdown by payment remittance gateway or instrument.
                </p>
              </div>
              <span className="badge badge-emerald">Channels</span>
            </div>

            {(revenueData?.methodBreakdown || []).length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>💳</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No settlement channels recorded yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(revenueData?.methodBreakdown || []).map((mb, idx) => {
                  const pct = revenueData.totalRevenue > 0 ? Math.round((mb.total / revenueData.totalRevenue) * 100) : 0;
                  return (
                    <div key={idx} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#ffffff' }}>
                          {mb.method}
                        </span>
                        <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.88rem' }}>
                          {formatCurrency(mb.total)} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 6, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#06b6d4' }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {mb.count} transaction(s) recorded
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Global Payments Ledger Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Header & Filter Controls */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Global Payments Ledger
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Complete transaction record of all remittances received from hospital tenants.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-indigo">
                  {filteredPayments.length} Receipts
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search hospital, ref, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px', height: '38px' }}
                />
              </div>

              {/* Hospital Filter */}
              <div>
                <select
                  className="input-field"
                  value={hospitalFilter}
                  onChange={(e) => setHospitalFilter(e.target.value)}
                  style={{ height: '38px' }}
                >
                  <option value="ALL">All Hospital Tenants</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={String(h.id)}>{h.name}</option>
                  ))}
                </select>
              </div>

              {/* Method Filter */}
              <div>
                <select
                  className="input-field"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  style={{ height: '38px' }}
                >
                  <option value="ALL">All Payment Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Receipt #</th>
                  <th style={{ padding: '1rem' }}>Hospital Tenant</th>
                  <th style={{ padding: '1rem' }}>Remittance Amount</th>
                  <th style={{ padding: '1rem' }}>Payment Date</th>
                  <th style={{ padding: '1rem' }}>Channel</th>
                  <th style={{ padding: '1rem' }}>Reference / UTR</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Internal Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        No payment records found.
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        Click "+ Record Payment" above to log manual collections.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          #{p.id}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <Link
                          href={`/hospitals/${p.hospital_id}`}
                          style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                        >
                          {p.Hospital?.name || `Hospital #${p.hospital_id}`}
                        </Link>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                          {formatCurrency(p.amount)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                          {p.currency || 'INR'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem', color: '#ffffff', fontWeight: 600 }}>
                        {formatDate(p.payment_date)}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-emerald">
                          {p.method || 'UPI'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.reference || '—'}
                      </td>

                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Record Payment */}
        {showRecordModal && (
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
              maxWidth: 500,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Record Payment
                </h3>
                <button onClick={() => setShowRecordModal(false)} className="btn-ghost">✕</button>
              </div>

              <form onSubmit={handleRecordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Target Hospital Tenant *</label>
                  <select
                    required
                    className="input-field"
                    value={recordForm.hospital_id}
                    onChange={(e) => setRecordForm({ ...recordForm, hospital_id: e.target.value })}
                  >
                    <option value="">Select Hospital...</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} (#{h.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">Remittance Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      placeholder="e.g. 25000"
                      className="input-field"
                      value={recordForm.amount}
                      onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Currency</label>
                    <input
                      type="text"
                      className="input-field"
                      value={recordForm.currency}
                      onChange={(e) => setRecordForm({ ...recordForm, currency: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">Payment Date *</label>
                    <input
                      type="date"
                      required
                      className="input-field"
                      value={recordForm.payment_date}
                      onChange={(e) => setRecordForm({ ...recordForm, payment_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Channel / Instrument</label>
                    <select
                      className="input-field"
                      value={recordForm.method}
                      onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="razorpay">Razorpay Gateway</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Reference / UTR / Txn Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR2026090123"
                    className="input-field"
                    value={recordForm.reference}
                    onChange={(e) => setRecordForm({ ...recordForm, reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Annual renewal fee"
                    className="input-field"
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowRecordModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={recordLoading} className="btn-primary">
                    {recordLoading ? 'Recording...' : 'Record Payment Receipt'}
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
