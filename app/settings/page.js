'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial and current settings form
  const [initialData, setInitialData] = useState(null);
  const [form, setForm] = useState({
    platform_name: '',
    support_email: '',
    support_phone: '',
    maintenance_mode: false,
    maintenance_notice: '',
    allow_hospital_registration: true,
    default_trial_days: 14,
    starter_plan_price: 2499,
    pro_plan_price: 4999,
    enterprise_plan_price: 9999,
    enable_whatsapp_engine: true,
    enable_sms_fallback: false,
    enable_audit_logging: true,
    enable_session_timeout: true,
    session_timeout_minutes: 60,
  });

  // Active section tab
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/settings');
      const data = res.data.settings;
      if (data) {
        const mapped = {
          platform_name: data.platform_name || 'TiniTracker Healthcare Platform',
          support_email: data.support_email || 'support@tinitracker.in',
          support_phone: data.support_phone || '+91 98765 43210',
          maintenance_mode: Boolean(data.maintenance_mode),
          maintenance_notice: data.maintenance_notice || 'The platform is undergoing brief routine maintenance. Service will resume shortly.',
          allow_hospital_registration: Boolean(data.allow_hospital_registration),
          default_trial_days: data.default_trial_days ?? 14,
          starter_plan_price: data.starter_plan_price ?? 2499,
          pro_plan_price: data.pro_plan_price ?? 4999,
          enterprise_plan_price: data.enterprise_plan_price ?? 9999,
          enable_whatsapp_engine: Boolean(data.enable_whatsapp_engine),
          enable_sms_fallback: Boolean(data.enable_sms_fallback),
          enable_audit_logging: Boolean(data.enable_audit_logging),
          enable_session_timeout: Boolean(data.enable_session_timeout),
          session_timeout_minutes: data.session_timeout_minutes ?? 60,
        };
        setForm(mapped);
        setInitialData(mapped);
      }
    } catch (err) {
      console.error('[Settings] Failed to fetch platform settings:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }

  // Check if form is dirty
  const isDirty = initialData && JSON.stringify(initialData) !== JSON.stringify(form);

  async function handleSave(e) {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (admin?.role !== 'superadmin') {
      setError('Only Superadmins have permission to modify platform settings');
      return;
    }

    try {
      setSaving(true);
      const res = await api.patch('/settings', form);
      const updated = res.data.settings;
      if (updated) {
        const mapped = {
          platform_name: updated.platform_name,
          support_email: updated.support_email,
          support_phone: updated.support_phone,
          maintenance_mode: Boolean(updated.maintenance_mode),
          maintenance_notice: updated.maintenance_notice || '',
          allow_hospital_registration: Boolean(updated.allow_hospital_registration),
          default_trial_days: updated.default_trial_days,
          starter_plan_price: updated.starter_plan_price,
          pro_plan_price: updated.pro_plan_price,
          enterprise_plan_price: updated.enterprise_plan_price,
          enable_whatsapp_engine: Boolean(updated.enable_whatsapp_engine),
          enable_sms_fallback: Boolean(updated.enable_sms_fallback),
          enable_audit_logging: Boolean(updated.enable_audit_logging),
          enable_session_timeout: Boolean(updated.enable_session_timeout),
          session_timeout_minutes: updated.session_timeout_minutes,
        };
        setForm(mapped);
        setInitialData(mapped);
      }
      setSuccess('Platform settings have been updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('[Settings] Failed to save platform settings:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to save platform settings');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (initialData) {
      setForm(initialData);
      setError('');
      setSuccess('');
    }
  }

  return (
    <AdminLayout title="System Settings" subtitle="Global platform configuration, pricing tiers, and system access policies">
      {/* Top Header */}
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
            Platform Governance & Settings
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Control system-wide operational rules, tenant trial defaults, plan pricing models, and service engines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isDirty && (
            <button
              onClick={handleDiscard}
              disabled={saving}
              style={{
                padding: '9px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Discard Changes
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !isDirty || admin?.role !== 'superadmin'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: isDirty
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'rgba(255, 255, 255, 0.08)',
              color: isDirty ? '#fff' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: '10px',
              border: 'none',
              cursor: isDirty && admin?.role === 'superadmin' ? 'pointer' : 'not-allowed',
              boxShadow: isDirty ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{saving ? '⏳ Saving...' : '💾 Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Maintenance Mode Emergency Alert Banner if Enabled */}
      {form.maintenance_mode && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚨</span>
            <div>
              <strong style={{ color: '#f87171', fontSize: '0.9rem', display: 'block' }}>
                Emergency Maintenance Mode is Active
              </strong>
              <span style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.8rem' }}>
                Tenants visiting the platform are displayed your scheduled downtime advisory notice.
              </span>
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, maintenance_mode: false })}
            style={{
              padding: '6px 12px',
              background: '#ef4444',
              border: 'none',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Disable Now
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          color: '#34d399',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
        }}>
          ✓ {success}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'general', label: 'General & Support', icon: '🏢' },
          { id: 'access', label: 'Access & Maintenance', icon: '🛡️' },
          { id: 'pricing', label: 'Subscription Plans', icon: '💳' },
          { id: 'engines', label: 'Engines & Feature Flags', icon: '⚙️' },
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
          Loading platform configurations...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* TAB 1: GENERAL & SUPPORT */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 1rem 0' }}>
                  🏢 Platform Identity & Support Info
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      PLATFORM BRAND NAME
                    </label>
                    <input
                      type="text"
                      value={form.platform_name}
                      onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                      Displayed on tenant login screens and notification footers.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      CENTRAL SUPPORT EMAIL
                    </label>
                    <input
                      type="email"
                      value={form.support_email}
                      onChange={(e) => setForm({ ...form, support_email: e.target.value })}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                      Hospital administrators receive onboarding and invoice communications from this email.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      CENTRAL HELPLINE / PHONE
                    </label>
                    <input
                      type="text"
                      value={form.support_phone}
                      onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                      Provider operations phone number for urgent hospital escalations.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      DEFAULT ONBOARDING TRIAL PERIOD (DAYS)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={form.default_trial_days}
                      onChange={(e) => setForm({ ...form, default_trial_days: Number(e.target.value) })}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                      Automatic trial period granted whenever a new hospital is provisioned.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS & MAINTENANCE */}
          {activeTab === 'access' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Maintenance Mode Card */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      🚨 System Maintenance Mode
                    </h3>
                    <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      When activated, tenant portals show a maintenance barrier while superadmins retain full access.
                    </p>
                  </div>

                  <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.maintenance_mode}
                      onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: form.maintenance_mode ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                      transition: '0.3s',
                      borderRadius: '34px',
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '20px',
                        width: '20px',
                        left: form.maintenance_mode ? '26px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.3s',
                        borderRadius: '50%',
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    MAINTENANCE ADVISORY MESSAGE (SHOWN TO TENANTS)
                  </label>
                  <textarea
                    rows={3}
                    value={form.maintenance_notice}
                    onChange={(e) => setForm({ ...form, maintenance_notice: e.target.value })}
                    placeholder="Enter scheduled maintenance details, expected uptime, and helpline notice..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Tenant Registration & Security Card */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 1rem 0' }}>
                  🔒 Tenant Self-Registration & Security
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Allow Registration Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        Allow Tenant Self-Registration
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        If enabled, new hospital clinics can sign up from the public marketing site. If disabled, only superadmins can onboard hospitals.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.allow_hospital_registration}
                        onChange={(e) => setForm({ ...form, allow_hospital_registration: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: form.allow_hospital_registration ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                        transition: '0.3s',
                        borderRadius: '34px',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: form.allow_hospital_registration ? '26px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%',
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Auto Session Inactivity Timeout */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        Session Inactivity Timeout
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Automatically log out idle administrative staff after a specified interval for HIPAA/clinical compliance.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min={15}
                        max={480}
                        value={form.session_timeout_minutes}
                        onChange={(e) => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })}
                        style={{
                          width: '70px',
                          padding: '6px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING PLANS */}
          {activeTab === 'pricing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem 0' }}>
                  💳 Subscription Tiers & Default Pricing
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
                  Set default monthly recurring billing amounts referenced in invoices and subscription renewals.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* Starter Tier */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>STARTER TIER</span>
                      <span>🌱</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                      Single-clinic setups, up to 100 active patients.
                    </div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      MONTHLY PRICE (₹ INR)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        value={form.starter_plan_price}
                        onChange={(e) => setForm({ ...form, starter_plan_price: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 24px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Professional Tier */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc' }}>PROFESSIONAL TIER</span>
                      <span>🚀</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                      Multi-doctor clinics with automated WhatsApp triggers.
                    </div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      MONTHLY PRICE (₹ INR)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        value={form.pro_plan_price}
                        onChange={(e) => setForm({ ...form, pro_plan_price: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 24px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Enterprise Tier */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(251, 191, 36, 0.05)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>ENTERPRISE TIER</span>
                      <span>👑</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                      Full hospital networks, unlimited stages & priority SLA.
                    </div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      MONTHLY PRICE (₹ INR)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        value={form.enterprise_plan_price}
                        onChange={(e) => setForm({ ...form, enterprise_plan_price: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 24px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENGINES & FEATURE FLAGS */}
          {activeTab === 'engines' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem 0' }}>
                  ⚙️ Platform Engines & Microservices
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                  Toggle underlying system capabilities without redeploying code.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* WhatsApp Notification Engine */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        WhatsApp Notification Engine
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Dispatches automated maternal care reminders and checkup alerts via WhatsApp Cloud API.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.enable_whatsapp_engine}
                        onChange={(e) => setForm({ ...form, enable_whatsapp_engine: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: form.enable_whatsapp_engine ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                        transition: '0.3s',
                        borderRadius: '34px',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: form.enable_whatsapp_engine ? '26px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%',
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* SMS Fallback Gateway */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        SMS Fallback Gateway
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        When WhatsApp delivery fails or is rejected, fallback via Twilio/Fast2SMS.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.enable_sms_fallback}
                        onChange={(e) => setForm({ ...form, enable_sms_fallback: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: form.enable_sms_fallback ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                        transition: '0.3s',
                        borderRadius: '34px',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: form.enable_sms_fallback ? '26px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%',
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Global Audit Trail */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        Immutable Audit Logging Engine
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Logs all hospital modifications, plan renewals, clinical actions, and administrative logins.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.enable_audit_logging}
                        onChange={(e) => setForm({ ...form, enable_audit_logging: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: form.enable_audit_logging ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                        transition: '0.3s',
                        borderRadius: '34px',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: form.enable_audit_logging ? '26px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%',
                        }} />
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </AdminLayout>
  );
}
