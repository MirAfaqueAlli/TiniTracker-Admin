'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { api, API_BASE } from '@/lib/api';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [hospitals, setHospitals] = useState([]);

  // Active Report Tab
  const [activeTab, setActiveTab] = useState('adoption');

  // Filter state for export
  const [exportHospital, setExportHospital] = useState('ALL');
  const [exportingType, setExportingType] = useState(null);

  useEffect(() => {
    fetchSummary();
    fetchHospitalsList();
  }, []);

  async function fetchSummary() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/summary');
      setData(res.data);
    } catch (err) {
      console.error('[Reports] Failed to load reports summary:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to load reports summary');
    } finally {
      setLoading(false);
    }
  }

  async function fetchHospitalsList() {
    try {
      const res = await api.get('/hospitals?limit=100');
      setHospitals(res.data.hospitals || []);
    } catch (err) {
      console.error('[Reports] Failed to load hospitals list:', err.response?.data?.error || err.message);
    }
  }

  function handleDownloadExport(type, format = 'csv') {
    setExportingType(type);
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('provider_admin_token') || localStorage.getItem('provider_token'))
        : '';

      const queryParams = new URLSearchParams({
        type,
        format,
        hospital_id: exportHospital,
      });

      // Direct download trigger with bearer auth via fetch/blob
      const url = `${API_BASE}/api/provider/reports/export?${queryParams.toString()}`;

      fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Export download failed');
          return res.blob();
        })
        .then((blob) => {
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `tinitracker_${type}_report_${new Date().toISOString().slice(0, 10)}.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        })
        .catch((err) => {
          alert(err.message || 'Download failed');
        })
        .finally(() => {
          setExportingType(null);
        });
    } catch (err) {
      console.error('[Reports] Export setup failed:', err.message);
      setExportingType(null);
    }
  }

  const kpis = data?.kpis || {};
  const hospitalPerformance = data?.hospitalPerformance || [];
  const paymentMethods = data?.paymentMethods || [];
  const planDistribution = data?.planDistribution || [];

  return (
    <AdminLayout title="Reports & Analytics Hub" subtitle="Cross-tenant executive intelligence, compliance metrics, and master exports">
      {/* Top Header & Quick Actions */}
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
            Executive Intelligence & Export Hub
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Audited cross-tenant performance, financial settlements, and regulatory compliance reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🖨️</span>
            <span>Print Report</span>
          </button>

          <button
            onClick={fetchSummary}
            style={{
              padding: '9px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
            title="Refresh analytics data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Metric Cards (KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Lifetime Platform Revenue
            </span>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '0.5rem' }}>
            ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Verified hospital subscription settlements
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Hospital Tenants
            </span>
            <span style={{ fontSize: '1.25rem' }}>🏥</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }}>
            {kpis.activeHospitals || 0}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500, marginLeft: '6px' }}>
              / {kpis.totalHospitals || 0} active
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {kpis.suspendedHospitals || 0} suspended accounts
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Patients & Care Visits
            </span>
            <span style={{ fontSize: '1.25rem' }}>🤰</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#a5b4fc', marginTop: '0.5rem' }}>
            {kpis.totalPatients || 0}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500, marginLeft: '6px' }}>
              ({kpis.totalStages || 0} stages)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Across all network hospital facilities
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Subscription Health
            </span>
            <span style={{ fontSize: '1.25rem' }}>💳</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem' }}>
            {kpis.activeSubscriptions || 0}
            <span style={{ fontSize: '0.9rem', color: '#f87171', fontWeight: 500, marginLeft: '6px' }}>
              ({kpis.expiringSoonSubscriptions || 0} ≤30d)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Active subscription contracts
          </div>
        </div>
      </div>

      {/* MASTER DATA EXPORT HUB (1-Click CSV/JSON Exports) */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        marginBottom: '1.75rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥</span>
              <span>1-Click Master Data Export Hub</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Export clean, unredacted tabular reports in CSV or JSON format for business intelligence, audits, or external finance systems.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Filter Tenant:</span>
            <select
              value={exportHospital}
              onChange={(e) => setExportHospital(e.target.value)}
              style={{
                padding: '7px 12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">🌐 All Network Hospitals</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  🏥 {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5 Export Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {[
            {
              id: 'hospitals',
              title: 'Hospitals Registry',
              desc: 'Tenants, locations, contacts, onboarding date',
              icon: '🏥',
            },
            {
              id: 'revenue',
              title: 'Financial Ledger',
              desc: 'Receipts, UTR/Cheque, amount, payment method',
              icon: '💰',
            },
            {
              id: 'subscriptions',
              title: 'Subscriptions Schedule',
              desc: 'Tiers, expiry dates, renewal urgency flags',
              icon: '💳',
            },
            {
              id: 'patients_summary',
              title: 'Patients Summary',
              desc: 'Maternal registry, UHID, EDD, high-risk flag',
              icon: '🤰',
            },
            {
              id: 'audit_logs',
              title: 'System Audit Log',
              desc: 'Security events, actor names, timestamps',
              icon: '📋',
            },
          ].map((item) => (
            <div
              key={item.id}
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '1.25rem', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', marginBottom: '1rem' }}>
                  {item.desc}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleDownloadExport(item.id, 'csv')}
                  disabled={exportingType === item.id}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: exportingType === item.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{exportingType === item.id ? '⏳' : '📄'}</span>
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => handleDownloadExport(item.id, 'json')}
                  disabled={exportingType === item.id}
                  style={{
                    padding: '7px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: exportingType === item.id ? 'not-allowed' : 'pointer',
                  }}
                  title="Download raw JSON dataset"
                >
                  JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'adoption', label: 'Tenant Adoption & Care Visits', icon: '🏥' },
          { id: 'financial', label: 'Financial Settlement Ledger', icon: '💰' },
          { id: 'churn', label: 'Subscription Expiry & Churn Radar', icon: '⚡' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Compiling cross-tenant analytics and reports...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          <div>⚠️ {error}</div>
          <button
            onClick={fetchSummary}
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
      ) : (
        <>
          {/* TAB 1: TENANT ADOPTION & CARE PERFORMANCE */}
          {activeTab === 'adoption' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                  Hospital Tenant Utilization & Clinical Stage Throughput
                </h3>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Audited throughput across maternal registrations, clinical milestones completed, staff logins, and billing totals.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        HOSPITAL TENANT
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        PLAN & STATUS
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        PATIENTS
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        CARE STAGES TRACKED
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        ACTIVE STAFF
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        TOTAL BILLED
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalPerformance.map((h) => {
                      const isBlocked = h.is_blocked;
                      return (
                        <tr
                          key={h.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            opacity: isBlocked ? 0.6 : 1,
                          }}
                        >
                          {/* Hospital Name & Location */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                              {h.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              📍 {h.address || 'Location Not Specified'} • 📞 {h.phone || 'No phone'}
                            </div>
                          </td>

                          {/* Plan & Status */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                              }}>
                                {h.plan}
                              </span>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: h.subscriptionStatus === 'active' ? '#34d399' : '#f87171',
                              }}>
                                {h.subscriptionStatus === 'active' ? '● Active' : '● Expired'}
                              </span>
                            </div>
                          </td>

                          {/* Patients */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem' }}>
                              {h.patientCount}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              Maternal Profiles
                            </div>
                          </td>

                          {/* Care Stages */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                              {h.completedStages} / {h.totalStages} stages
                            </div>
                            <div style={{
                              width: '100px',
                              height: '4px',
                              borderRadius: '2px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              marginTop: '6px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${h.stageCompletionRate}%`,
                                height: '100%',
                                background: '#34d399',
                              }} />
                            </div>
                          </td>

                          {/* Staff */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                              👥 {h.staffCount} users
                            </div>
                          </td>

                          {/* Billed */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: h.totalRevenuePaid > 0 ? '#34d399' : 'var(--text-dim)', fontSize: '0.9rem' }}>
                              ₹{Number(h.totalRevenuePaid).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <Link
                              href={`/hospitals/${h.id}`}
                              style={{
                                display: 'inline-block',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Manage →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL SETTLEMENTS & BREAKDOWN */}
          {activeTab === 'financial' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Payment Channels Card */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 1rem 0' }}>
                  💳 Payment Settlement Channels
                </h3>

                {paymentMethods.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                    No payment transactions recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {paymentMethods.map((pm) => {
                      const totalRev = Number(kpis.totalRevenue || 1);
                      const pct = Math.round((pm.total / totalRev) * 100);
                      return (
                        <div key={pm.method}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <strong style={{ color: '#fff', textTransform: 'uppercase' }}>
                              {pm.method}
                            </strong>
                            <span style={{ color: '#34d399', fontWeight: 700 }}>
                              ₹{pm.total.toLocaleString('en-IN')} ({pm.count} txns)
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subscription Plans Distribution */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 1rem 0' }}>
                  📊 Subscription Tiers Distribution
                </h3>

                {planDistribution.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                    No subscription plans active.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {planDistribution.map((pd) => (
                      <div
                        key={pd.plan}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>👑</span>
                          <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{pd.plan}</strong>
                        </div>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#a5b4fc',
                        }}>
                          {pd.count} Hospitals
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION EXPIRY & CHURN RADAR */}
          {activeTab === 'churn' && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    ⚡ Churn & Renewal Vulnerability Radar
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Hospitals with subscriptions expiring within 30 days requiring operational renewal or invoice dispatch.
                  </p>
                </div>

                <Link
                  href="/subscriptions"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                  }}
                >
                  Manage Subscriptions →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {hospitalPerformance.filter(h => h.daysRemaining !== null && h.daysRemaining <= 30).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#34d399' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✓</div>
                    All hospital subscriptions are healthy with over 30 days remaining!
                  </div>
                ) : (
                  hospitalPerformance
                    .filter(h => h.daysRemaining !== null && h.daysRemaining <= 30)
                    .map((h) => {
                      const isCritical = h.daysRemaining <= 7;
                      return (
                        <div
                          key={h.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{h.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              Plan: {h.plan} • Primary Phone: {h.phone || 'N/A'} • End Date: {h.endDate ? new Date(h.endDate).toLocaleDateString('en-IN') : 'N/A'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: isCritical ? '#f87171' : '#fbbf24',
                            }}>
                              {h.daysRemaining <= 0 ? 'EXPIRED' : `Expires in ${h.daysRemaining} days`}
                            </span>

                            <Link
                              href={`/hospitals/${h.id}`}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--border-subtle)',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Renew Tenant →
                            </Link>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
