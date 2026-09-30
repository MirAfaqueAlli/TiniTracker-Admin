'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function CreateHospitalModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    hospital_name: '',
    city: '',
    phone: '',
    whatsapp_gateway_url: '',
    whatsapp_api_key: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    plan: 'free_trial',
    trial_days: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.hospital_name || !form.admin_name || !form.admin_email || !form.admin_password) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    if (form.admin_password.length < 6) {
      setError('Admin password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/hospitals', form);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('[CreateHospital] Failed to create hospital:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to create hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(4, 7, 13, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%',
        maxWidth: 620,
        maxHeight: '92vh',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        padding: '2rem',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Onboard New Hospital
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Set up hospital tenant, primary administrator, and initial subscription plan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: '1.25rem', padding: '4px 8px', borderRadius: '8px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fb7185',
            fontSize: '0.84rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section: Hospital Profile */}
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent-cyan)',
              marginBottom: '0.75rem',
            }}>
              1. Hospital Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
              <div>
                <label className="input-label">Hospital Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Multi-Specialty Hospital"
                  className="input-field"
                  value={form.hospital_name}
                  onChange={handleChange('hospital_name')}
                />
              </div>
              <div>
                <label className="input-label">City / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  className="input-field"
                  value={form.city}
                  onChange={handleChange('city')}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <label className="input-label">Contact Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="input-field"
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </div>
          </div>

          {/* Section: Primary Admin Credentials */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent-primary)',
              marginBottom: '0.75rem',
            }}>
              2. Hospital Administrator Account
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label className="input-label">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="input-field"
                  value={form.admin_name}
                  onChange={handleChange('admin_name')}
                />
              </div>
              <div>
                <label className="input-label">Admin Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@hospital.org"
                  className="input-field"
                  value={form.admin_email}
                  onChange={handleChange('admin_email')}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <label className="input-label">Initial Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Temporary password"
                  className="input-field"
                  style={{ paddingRight: '45px' }}
                  value={form.admin_password}
                  onChange={handleChange('admin_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Admin will be prompted to reset password on their first login.
              </p>
            </div>
          </div>

          {/* Section: Subscription Plan */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent-emerald)',
              marginBottom: '0.75rem',
            }}>
              3. Subscription & Billing Tier
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label className="input-label">Initial Plan Tier</label>
                <select
                  className="input-field"
                  value={form.plan}
                  onChange={handleChange('plan')}
                >
                  <option value="free_trial">Free Trial</option>
                  <option value="monthly">Monthly Standard</option>
                  <option value="quarterly">Quarterly Pro</option>
                  <option value="yearly">Annual Enterprise</option>
                  <option value="custom">Custom Contract</option>
                </select>
              </div>
              <div>
                <label className="input-label">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  className="input-field"
                  value={form.trial_days}
                  onChange={handleChange('trial_days')}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.25rem',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating Hospital...' : '✓ Complete Onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
