'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

function formatCurrency(val) {
  if (val === undefined || val === null) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function HospitalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', whatsapp_sender_id: '', whatsapp_api_url: '', whatsapp_api_key: '' });
  const [editLoading, setEditLoading] = useState(false);

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({ plan: 'monthly', starts_at: new Date().toISOString().slice(0, 10), durationMonths: 1, notes: '' });
  const [renewLoading, setRenewLoading] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', currency: 'INR', method: 'UPI', reference: '', payment_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDetail = useCallback(async (isSilent = false) => {
    if (!id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get(`/hospitals/${id}`);
      const h = res.data.hospital;
      setHospital(h);
      setEditForm({
        name: h.name || '',
        address: h.address || '',
        phone: h.phone || '',
        whatsapp_sender_id: h.whatsapp_sender_id || '',
        whatsapp_api_url: h.whatsapp_api_url || '',
        whatsapp_api_key: '',
      });
    } catch (err) {
      console.error('[Hospital Detail] Failed to load hospital:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to load hospital details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Handle Edit Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name,
        address: editForm.address,
        phone: editForm.phone,
        whatsapp_sender_id: editForm.whatsapp_sender_id,
        whatsapp_api_url: editForm.whatsapp_api_url,
      };
      if (editForm.whatsapp_api_key) {
        payload.whatsapp_api_key = editForm.whatsapp_api_key;
      }
      await api.patch(`/hospitals/${id}`, payload);
      showToast('Hospital profile updated successfully');
      setShowEditModal(false);
      fetchDetail(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Block / Unblock Toggle
  const handleToggleBlock = async () => {
    if (!hospital) return;
    setBlockLoading(true);
    try {
      const res = await api.post(`/hospitals/${id}/block`, {
        is_blocked: !hospital.is_blocked,
      });
      showToast(res.data.message || 'Hospital status updated');
      setShowBlockModal(false);
      fetchDetail(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setBlockLoading(false);
    }
  };

  // Handle Delete Hospital
  const handleDeleteHospital = async () => {
    if (!hospital) return;
    if (deleteConfirm.trim().toLowerCase() !== hospital.name.trim().toLowerCase()) {
      setDeleteError('Please type the exact hospital name to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/hospitals/${id}`);
      router.push('/hospitals');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete hospital');
      setDeleteLoading(false);
    }
  };

  // Handle Create / Renew Subscription
  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setRenewLoading(true);
    try {
      const start = new Date(renewForm.starts_at);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(renewForm.durationMonths));
      const ends_at = end.toISOString().slice(0, 10);

      await api.post(`/hospitals/${id}/subscriptions`, {
        plan: renewForm.plan,
        starts_at: renewForm.starts_at,
        ends_at,
        notes: renewForm.notes,
      });

      showToast('New subscription activated successfully');
      setShowRenewModal(false);
      fetchDetail(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create subscription', 'error');
    } finally {
      setRenewLoading(false);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    try {
      await api.post(`/hospitals/${id}/payments`, {
        amount: paymentForm.amount,
        currency: paymentForm.currency,
        payment_date: paymentForm.payment_date,
        method: paymentForm.method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
        subscription_id: hospital.active_subscription?.id || null,
      });

      showToast('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchDetail(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record payment', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading hospital details...
        </div>
      </AdminLayout>
    );
  }

  if (!hospital) {
    return (
      <AdminLayout>
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Hospital Not Found</div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            The requested hospital identifier #{id} does not exist or was deleted.
          </p>
          <Link href="/hospitals" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
            ← Back to Hospitals Directory
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const sub = hospital.active_subscription || hospital.latest_subscription;
  const today = new Date().toISOString().slice(0, 10);
  const isExpiringSoon = sub && !sub.expired && sub.ends_at <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Compute days left
  let daysLeft = 0;
  if (sub && sub.ends_at) {
    const diff = (new Date(sub.ends_at) - new Date(today)) / (1000 * 60 * 60 * 24);
    daysLeft = Math.max(0, Math.ceil(diff));
  }

  const totalPayments = (hospital.payments || []).reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

  return (
    <AdminLayout onRefreshData={() => fetchDetail(true)} isRefreshing={refreshing}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
          }}>
            {toast.message}
          </div>
        )}

        {/* Back Link */}
        <div>
          <Link
            href="/hospitals"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-cyan)',
              fontSize: '0.825rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ← Back to Hospitals Directory
          </Link>
        </div>

        {/* Hero Header Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '18px',
                background: hospital.is_blocked
                  ? 'linear-gradient(135deg, #f43f5e, #be123c)'
                  : 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: hospital.is_blocked ? '0 8px 24px rgba(244, 63, 94, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.4)',
                flexShrink: 0,
              }}>
                {hospital.is_blocked ? '⛔' : '🏥'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                    {hospital.name}
                  </h1>
                  <span className="badge badge-muted">
                    ID #{hospital.id}
                  </span>
                  {hospital.is_blocked ? (
                    <span className="badge badge-rose">⛔ Suspended</span>
                  ) : sub?.ends_at < today ? (
                    <span className="badge badge-amber">⚠️ Expired</span>
                  ) : (
                    <span className="badge badge-emerald">✓ Operational</span>
                  )}
                </div>

                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  📍 {hospital.address || 'Address not registered'}
                  {hospital.phone && ` · 📞 ${hospital.phone}`}
                  <span> · Joined {formatDate(hospital.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button Group */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowEditModal(true)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              >
                ✏️ Edit Profile
              </button>

              <button
                onClick={() => setShowRenewModal(true)}
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              >
                🔄 New Subscription
              </button>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
              >
                💳 Record Payment
              </button>

              <button
                onClick={() => setShowBlockModal(true)}
                className="btn-ghost"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  color: hospital.is_blocked ? '#34d399' : '#fb7185',
                }}
              >
                {hospital.is_blocked ? '🔓 Unblock' : '⛔ Suspend'}
              </button>

              <button
                onClick={() => {
                  setDeleteConfirm('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
                className="btn-ghost"
                style={{ padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-dim)' }}
                title="Delete Hospital"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Tracked Patients
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f472b6', marginTop: '2px' }}>
                👶 {hospital.patient_count || 0}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Staff Accounts
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>
                👥 {hospital.user_count || 0}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Current Plan
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                {sub ? sub.plan?.replace('_', ' ') : 'None'}
              </div>
              <div style={{ fontSize: '0.72rem', color: daysLeft <= 7 ? '#fb7185' : '#34d399' }}>
                {sub?.ends_at ? `${daysLeft} days remaining` : 'No active cycle'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Revenue Collected
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {formatCurrency(totalPayments)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
        }}>
          {[
            { id: 'overview', label: 'Overview & Config' },
            { id: 'users', label: `Staff & Users (${hospital.users?.length || 0})` },
            { id: 'subscriptions', label: `Subscriptions (${hospital.subscriptions?.length || 0})` },
            { id: 'payments', label: `Payments (${hospital.payments?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Integrations */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* Box: Hospital Profile */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem' }}>
                Tenant Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Hospital Name</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{hospital.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Registered Address</span>
                  <span style={{ fontWeight: 600, color: '#ffffff', textAlign: 'right', maxWidth: '60%' }}>{hospital.address || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Primary Phone</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{hospital.phone || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Tenant Created</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{formatDate(hospital.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Suspension Status</span>
                  <span style={{ fontWeight: 600, color: hospital.is_blocked ? '#fb7185' : '#34d399' }}>
                    {hospital.is_blocked ? 'Suspended (Access Denied)' : 'Active (Login Enabled)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Box: WhatsApp Gateway Settings */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  WhatsApp Gateway Integration
                </h3>
                <span className={`badge ${hospital.whatsapp_api_url ? 'badge-emerald' : 'badge-muted'}`}>
                  {hospital.whatsapp_api_url ? 'Configured' : 'Using System Default'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Gateway API URL</span>
                  <span style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {hospital.whatsapp_api_url || 'https://wapi.rextrox.in/v2/send'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Sender ID</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{hospital.whatsapp_sender_id || 'System Shared Sender'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>API Provider</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{hospital.whatsapp_api_provider || 'Rextrox'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>API Key Security</span>
                  <span style={{ fontWeight: 600, color: hospital.whatsapp_api_key ? '#34d399' : 'var(--text-dim)' }}>
                    {hospital.whatsapp_api_key ? '•••••••• (Encrypted in DB)' : 'Inherited from Env'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users & Staff */}
        {activeTab === 'users' && (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Staff & Administrative Accounts
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  All users provisioned under {hospital.name}.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Staff Member</th>
                    <th style={{ padding: '1rem' }}>Email Address</th>
                    <th style={{ padding: '1rem' }}>Role</th>
                    <th style={{ padding: '1rem' }}>Security Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {(hospital.users || []).map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{u.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>User ID #{u.id}</div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-indigo' : u.role === 'doctor' ? 'badge-cyan' : 'badge-muted'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {u.force_password_change ? (
                          <span style={{ fontSize: '0.74rem', color: '#fbbf24' }}>⚠️ Password reset pending</span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#34d399' }}>✓ Verified active</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Subscriptions History */}
        {activeTab === 'subscriptions' && (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Subscription History & Terms
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Chronological record of contracted subscription periods for this hospital.
                </p>
              </div>
              <button
                onClick={() => setShowRenewModal(true)}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                + Add Subscription Period
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Plan Tier</th>
                    <th style={{ padding: '1rem' }}>Effective Period</th>
                    <th style={{ padding: '1rem' }}>Operational Status</th>
                    <th style={{ padding: '1rem' }}>Notes / Context</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {(hospital.subscriptions || []).map((s) => {
                    const isExp = s.ends_at < today;
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>
                            {s.plan?.replace('_', ' ')}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Sub ID #{s.id}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {formatDate(s.starts_at)} → {formatDate(s.ends_at)}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge ${!s.is_active ? 'badge-muted' : isExp ? 'badge-rose' : 'badge-emerald'}`}>
                            {!s.is_active ? 'Deactivated' : isExp ? 'Expired' : 'Active Cycle'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {s.notes || 'Standard onboarding period'}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                          {formatDate(s.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Payments */}
        {activeTab === 'payments' && (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Payment Receipts & Invoicing
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Total collected: <strong style={{ color: '#38bdf8' }}>{formatCurrency(totalPayments)}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                + Record Payment
              </button>
            </div>

            {(hospital.payments || []).length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  No payments recorded for this hospital yet.
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-secondary"
                  style={{ marginTop: '1rem', padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Record First Payment
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem 1.5rem' }}>Amount</th>
                      <th style={{ padding: '1rem' }}>Payment Date</th>
                      <th style={{ padding: '1rem' }}>Method</th>
                      <th style={{ padding: '1rem' }}>Reference / UTR</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hospital.payments || []).map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem' }}>
                            {formatCurrency(p.amount)}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '4px' }}>{p.currency || 'INR'}</span>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Edit Hospital Profile */}
        {showEditModal && (
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
              maxWidth: 540,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Edit Hospital Profile
                </h3>
                <button onClick={() => setShowEditModal(false)} className="btn-ghost">✕</button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Address / City</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Contact Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <label className="input-label">WhatsApp Gateway URL</label>
                  <input
                    type="url"
                    placeholder="https://wapi.rextrox.in/v2/send"
                    className="input-field"
                    value={editForm.whatsapp_api_url}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp_api_url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">WhatsApp API Key (leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="Enter new key only if updating"
                    className="input-field"
                    value={editForm.whatsapp_api_key}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp_api_key: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={editLoading} className="btn-primary">
                    {editLoading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Renew / New Subscription */}
        {showRenewModal && (
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
                  Activate / Renew Subscription
                </h3>
                <button onClick={() => setShowRenewModal(false)} className="btn-ghost">✕</button>
              </div>

              <form onSubmit={handleCreateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Plan Tier</label>
                  <select
                    className="input-field"
                    value={renewForm.plan}
                    onChange={(e) => setRenewForm({ ...renewForm, plan: e.target.value })}
                  >
                    <option value="free_trial">Free Trial</option>
                    <option value="monthly">Monthly Standard</option>
                    <option value="quarterly">Quarterly Pro</option>
                    <option value="yearly">Annual Enterprise</option>
                    <option value="custom">Custom Contract</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">Start Date</label>
                    <input
                      type="date"
                      required
                      className="input-field"
                      value={renewForm.starts_at}
                      onChange={(e) => setRenewForm({ ...renewForm, starts_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Duration (Months)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      className="input-field"
                      value={renewForm.durationMonths}
                      onChange={(e) => setRenewForm({ ...renewForm, durationMonths: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Internal Contract Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Approved by Sales Lead, PO #1234"
                    className="input-field"
                    value={renewForm.notes}
                    onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowRenewModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={renewLoading} className="btn-primary">
                    {renewLoading ? 'Activating...' : 'Activate Subscription'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Payment */}
        {showPaymentModal && (
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
                  Record Payment
                </h3>
                <button onClick={() => setShowPaymentModal(false)} className="btn-ghost">✕</button>
              </div>

              <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      placeholder="e.g. 15000"
                      className="input-field"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Currency</label>
                    <input
                      type="text"
                      className="input-field"
                      value={paymentForm.currency}
                      onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
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
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Method</label>
                    <select
                      className="input-field"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="cash">Cash Receipt</option>
                      <option value="cheque">Cheque</option>
                      <option value="razorpay">Razorpay Gateway</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Reference / UTR / Transaction ID</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR1982736412"
                    className="input-field"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 50% advance for annual renewal"
                    className="input-field"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={paymentLoading} className="btn-primary">
                    {paymentLoading ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Block Confirmation */}
        {showBlockModal && (
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
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                {hospital.is_blocked ? '🔓' : '⛔'}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                {hospital.is_blocked ? 'Restore Hospital Access?' : 'Suspend Hospital Tenant?'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {hospital.is_blocked
                  ? `Unblocking "${hospital.name}" will re-enable system access for all registered staff and pediatricians.`
                  : `Suspending "${hospital.name}" will immediately prevent all staff logins to the platform until restored.`}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setShowBlockModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={blockLoading}
                  style={{
                    backgroundColor: hospital.is_blocked ? '#10b981' : '#f43f5e',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {blockLoading ? 'Updating...' : hospital.is_blocked ? 'Yes, Unblock' : 'Yes, Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {showDeleteModal && (
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
              maxWidth: 500,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginBottom: '0.5rem' }}>
                Delete Hospital Permanently
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                This action cannot be undone. All patient records ({hospital.patient_count || 0}), user logins ({hospital.user_count || 0}), and subscriptions will be deleted immediately.
              </p>

              {deleteError && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  Type <strong style={{ color: '#ffffff' }}>{hospital.name}</strong> to confirm:
                </label>
                <input
                  type="text"
                  placeholder={hospital.name}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="input-field"
                  style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDeleteHospital}
                  disabled={deleteLoading || deleteConfirm.trim().toLowerCase() !== hospital.name.trim().toLowerCase()}
                  style={{
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: deleteConfirm.trim().toLowerCase() === hospital.name.trim().toLowerCase() ? 1 : 0.5,
                  }}
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
