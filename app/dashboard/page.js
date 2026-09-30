'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/lib/auth';
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

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('[Dashboard] Failed to load dashboard metrics:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || err.message || 'Unable to retrieve dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const kpis = stats?.kpis || {};
  const plans = stats?.plansBreakdown || {};
  const expiringSoon = stats?.expiringSoon || [];
  const activity = stats?.recentActivity || [];

  // Compute total for plans percentage
  const totalWithPlans = (kpis.totalHospitals || 0);

  return (
    <AdminLayout onRefreshData={() => fetchStats(true)} isRefreshing={refreshing}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header Greeting Banner */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              <span>🛡️ Platform Governance</span>
              <span>•</span>
              <span>Asia-South-1</span>
            </div>
            <h1 style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}>
              Welcome back, <span className="gradient-text">{admin?.name || 'Administrator'}</span>
            </h1>
          
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastUpdated && (
              <div style={{
                fontSize: '0.76rem',
                color: 'var(--text-dim)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                Updated: <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{lastUpdated}</span>
              </div>
            )}
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="btn-secondary"
              style={{ padding: '8px 14px' }}
            >
              <span>{refreshing ? 'Syncing...' : 'Sync Metrics'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Error loading platform data</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(251, 113, 133, 0.8)' }}>{error}</div>
              </div>
            </div>
            <button onClick={() => fetchStats(false)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              Retry
            </button>
          </div>
        )}

        {/* Primary 4-Stat High-Impact KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}>
          {/* Card 1: Total Hospitals */}
          <div className="glass-panel glass-panel-hover gradient-card-kpi" style={{
            padding: '1.5rem',
            '--kpi-glow': 'rgba(99, 102, 241, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Registered Hospitals
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                  {loading ? '—' : kpis.totalHospitals || 0}
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}>
                🏥
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-emerald">
                {kpis.totalHospitals > 0
                  ? `${Math.round(((kpis.activeHospitals || 0) / kpis.totalHospitals) * 100)}% Operational`
                  : 'No tenants'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {kpis.activeHospitals || 0} active subscriptions
              </span>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="glass-panel glass-panel-hover gradient-card-kpi" style={{
            padding: '1.5rem',
            '--kpi-glow': 'rgba(16, 185, 129, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Subscriptions
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                  {loading ? '—' : kpis.activeHospitals || 0}
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                ✓
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-cyan">
                {kpis.expiredHospitals || 0} Inactive / Expired
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Healthy platform status
              </span>
            </div>
          </div>

          {/* Card 3: Expiring Soon */}
          <div className="glass-panel glass-panel-hover gradient-card-kpi" style={{
            padding: '1.5rem',
            '--kpi-glow': 'rgba(245, 158, 11, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Expiring in &lt; 30 Days
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                  {loading ? '—' : kpis.expiringSoonCount || 0}
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}>
                ⏰
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-amber">
                Needs Follow-up
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Renewal notifications due
              </span>
            </div>
          </div>

          {/* Card 4: Platform Revenue */}
          <div className="glass-panel glass-panel-hover gradient-card-kpi" style={{
            padding: '1.5rem',
            '--kpi-glow': 'rgba(6, 182, 212, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Monthly Revenue
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                  {loading ? '—' : formatCurrency(kpis.thisMonthRevenue)}
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}>
                ₹
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-cyan">
                Total: {formatCurrency(kpis.totalRevenue)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                All-time collections
              </span>
            </div>
          </div>
        </div>

        {/* Secondary KPI Row: Platform Activity Volume */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {/* Card: Total Tracked Patients */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              backgroundColor: 'rgba(236, 72, 153, 0.12)',
              color: '#f472b6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              flexShrink: 0,
            }}>
              👶
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Patients Tracked
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                {loading ? '—' : Number(kpis.totalPatients || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Maternal & infant care journeys across all nodes
              </div>
            </div>
          </div>

          {/* Card: Registered Staff & Doctors */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              color: '#a78bfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              flexShrink: 0,
            }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Registered Platform Users
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                {loading ? '—' : Number(kpis.totalUsers || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Administrators, pediatricians & nursing staff
              </div>
            </div>
          </div>

          {/* Card: Current Fiscal Year Revenue */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              flexShrink: 0,
            }}>
              📈
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Annual Revenue (YTD)
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                {loading ? '—' : formatCurrency(kpis.thisYearRevenue)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Total collections recorded this calendar year
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plan Distribution Section */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Subscription Tier Distribution
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Breakdown of active hospital tenants by contracted subscription tier.
              </p>
            </div>
            <span className="badge badge-indigo">
              {totalWithPlans} Total Tenants
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div style={{
            height: 12,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-pill)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '1.5rem',
          }}>
            {totalWithPlans > 0 ? (
              <>
                <div style={{
                  width: `${((plans.free_trial || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#6366f1',
                  transition: 'width 0.5s ease',
                }} title={`Free Trial: ${plans.free_trial || 0}`} />
                <div style={{
                  width: `${((plans.monthly || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#06b6d4',
                  transition: 'width 0.5s ease',
                }} title={`Monthly: ${plans.monthly || 0}`} />
                <div style={{
                  width: `${((plans.quarterly || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#10b981',
                  transition: 'width 0.5s ease',
                }} title={`Quarterly: ${plans.quarterly || 0}`} />
                <div style={{
                  width: `${((plans.yearly || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#8b5cf6',
                  transition: 'width 0.5s ease',
                }} title={`Yearly: ${plans.yearly || 0}`} />
                <div style={{
                  width: `${((plans.custom || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#f59e0b',
                  transition: 'width 0.5s ease',
                }} title={`Custom: ${plans.custom || 0}`} />
                <div style={{
                  width: `${((plans.none || 0) / totalWithPlans) * 100}%`,
                  backgroundColor: '#64748b',
                  transition: 'width 0.5s ease',
                }} title={`Unsubscribed: ${plans.none || 0}`} />
              </>
            ) : (
              <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            )}
          </div>

          {/* Plan badges grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
          }}>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6366f1' }} />
                Free Trial
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {plans.free_trial || 0}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#67e8f9' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#06b6d4' }} />
                Monthly Standard
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {plans.monthly || 0}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#6ee7b7' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                Quarterly Pro
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {plans.quarterly || 0}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#c4b5fd' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                Annual Enterprise
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {plans.yearly || 0}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#fcd34d' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                Custom Tier
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {plans.custom || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Section: Expiring Soon Table + Recent Activity */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Left Column: Hospitals Expiring Soon */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Expiring Subscriptions
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Tenants with less than 30 days remaining on their active cycle.
                </p>
              </div>
              <span className="badge badge-amber">
                {expiringSoon.length} Pending
              </span>
            </div>

            {expiringSoon.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--text-dim)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  All clear! No renewals due within 30 days.
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Active hospital tenants are in good standing.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {expiringSoon.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}>
                    <div>
                      <Link
                        href={`/hospitals/${item.id}`}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#ffffff',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                      >
                        {item.name} →
                      </Link>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.city || 'India'} · {item.plan?.replace('_', ' ')} · Until {formatDate(item.ends_at)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${item.daysLeft <= 7 ? 'badge-rose' : 'badge-amber'}`}>
                        {item.daysLeft === 0 ? 'Expires today' : `${item.daysLeft} days left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Platform Activity Stream */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Recent Platform Stream
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Audit log of recently registered hospitals and payment receipts.
                </p>
              </div>
              <span className="badge badge-cyan">
                Live Audit
              </span>
            </div>

            {activity.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--text-dim)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  No recent activity logged yet.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activity.map((event) => (
                  <div key={event.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.65rem 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      backgroundColor: event.type === 'payment_received'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                      color: event.type === 'payment_received' ? '#34d399' : '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      flexShrink: 0,
                    }}>
                      {event.type === 'payment_received' ? '₹' : '🏥'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#ffffff' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {event.subtitle}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {getRelativeTime(event.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

       
      </div>
    </AdminLayout>
  );
}
