'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AdminsPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'support',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admins');
      setAdmins(res.data.admins || []);
    } catch (err) {
      console.error('[Admins] Failed to fetch admin list:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to load provider admins');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/admins', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        password: form.password,
      });

      setShowAddModal(false);
      setForm({ name: '', email: '', role: 'support', password: '' });
      setSuccess('Provider admin account created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      fetchAdmins();
    } catch (err) {
      console.error('[Admins] Failed to create admin:', err.response?.data?.error || err.message);
      setFormError(err.response?.data?.error || 'Failed to create provider admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateAdmin(e) {
    e.preventDefault();
    setFormError('');

    try {
      setSubmitting(true);
      const payload = {
        name: editingAdmin.name.trim(),
        role: editingAdmin.role,
      };
      if (editingAdmin.newPassword) {
        if (editingAdmin.newPassword.length < 6) {
          setFormError('Password must be at least 6 characters');
          setSubmitting(false);
          return;
        }
        payload.password = editingAdmin.newPassword;
      }

      await api.patch(`/admins/${editingAdmin.id}`, payload);
      setEditingAdmin(null);
      setSuccess('Admin account updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      fetchAdmins();
    } catch (err) {
      console.error('[Admins] Failed to update admin:', err.response?.data?.error || err.message);
      setFormError(err.response?.data?.error || 'Failed to update admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleBlock(target) {
    if (target.id === currentAdmin?.id) {
      alert('You cannot suspend your own account');
      return;
    }

    const action = target.is_blocked ? 'reactivate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} ${target.name}'s account?`)) return;

    try {
      await api.post(`/admins/${target.id}/block`);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} admin`);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      await api.delete(`/admins/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSuccess('Provider admin deleted successfully');
      setTimeout(() => setSuccess(''), 4000);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete provider admin');
    } finally {
      setSubmitting(false);
    }
  }

  const superadminCount = admins.filter(a => a.role === 'superadmin').length;
  const supportCount = admins.filter(a => a.role === 'support').length;

  return (
    <AdminLayout title="Provider Admins" subtitle="Master accounts with platform administrative and operational access">
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
            Provider Administrative Team
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Manage master credentials, assign operational roles, and enforce security policies.
          </p>
        </div>

        {currentAdmin?.role === 'superadmin' && (
          <button
            onClick={() => {
              setForm({ name: '', email: '', role: 'support', password: '' });
              setFormError('');
              setShowAddModal(true);
            }}
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
            <span>+</span>
            <span>Add Provider Admin</span>
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Admins
            </span>
            <span style={{ fontSize: '1.25rem' }}>🔑</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            {admins.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Authorized portal operators
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Superadmins
            </span>
            <span style={{ fontSize: '1.25rem' }}>👑</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem' }}>
            {superadminCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Full system control & billing authority
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Support Staff
            </span>
            <span style={{ fontSize: '1.25rem' }}>🛠️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }}>
            {supportCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Assistance & triage permissions
          </div>
        </div>
      </div>

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

      {/* Admins Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading provider administrators...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ADMINISTRATOR
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ROLE
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ACCOUNT STATUS
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  PROVISIONED ON
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((adminItem) => {
                const isSelf = adminItem.id === currentAdmin?.id;
                const isSuper = adminItem.role === 'superadmin';
                const isBlocked = Boolean(adminItem.is_blocked);

                return (
                  <tr
                    key={adminItem.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                      opacity: isBlocked ? 0.6 : 1,
                    }}
                  >
                    {/* Administrator Name & Email */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isSuper
                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1))'
                            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))',
                          border: isSuper ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: isSuper ? '#fbbf24' : '#38bdf8',
                        }}>
                          {adminItem.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                              {adminItem.name}
                            </strong>
                            {isSelf && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                              }}>
                                YOU
                              </span>
                            )}
                            {adminItem.is_env_managed && (
                              <span
                                title="Credentials configured via environment variables (.env / .env.local)"
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                ⚡ ENV MANAGED
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}>
                            {adminItem.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isSuper ? 'rgba(251, 191, 36, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: isSuper ? '#fbbf24' : '#38bdf8',
                        border: isSuper ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                      }}>
                        {isSuper ? '👑 Superadmin' : '🛠️ Support'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isBlocked ? '#f87171' : '#34d399',
                        border: isBlocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      }}>
                        {isBlocked ? '● Suspended' : '● Active'}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {new Date(adminItem.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {currentAdmin?.role === 'superadmin' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingAdmin({ ...adminItem, newPassword: '' });
                                setFormError('');
                              }}
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {adminItem.is_env_managed ? (
                              <span
                                title="Configured via environment variables (.env / .env.local). Modify or remove in .env file directly."
                                style={{
                                  padding: '4px 9px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  color: 'var(--text-dim)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                🔒 In .env
                              </span>
                            ) : (
                              <>
                                {!isSelf && (
                                  <button
                                    onClick={() => handleToggleBlock(adminItem)}
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      background: isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                      border: `1px solid ${isBlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                      borderRadius: '6px',
                                      color: isBlocked ? '#34d399' : '#fbbf24',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isBlocked ? 'Reactivate' : 'Suspend'}
                                  </button>
                                )}

                                {!isSelf && (
                                  <button
                                    onClick={() => setDeleteTarget(adminItem)}
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
                                    🗑️
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
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
            maxWidth: '480px',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>
                  + Add Provider Administrator
                </h3>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  Create authorized operator credentials for this provider portal.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleCreateAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ADMINISTRATOR NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Support Operations"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  LOGIN EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  placeholder="e.g. jdoe@tinitracker.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ADMINISTRATIVE ROLE *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'support' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: form.role === 'support' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      background: form.role === 'support' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.role === 'support' ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    🛠️ Support Operator
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'superadmin' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: form.role === 'superadmin' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                      background: form.role === 'superadmin' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.role === 'superadmin' ? '#fbbf24' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    👑 Superadmin
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  INITIAL PASSWORD (MIN 6 CHARACTERS) *
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {submitting ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
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
            maxWidth: '480px',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>
                ✏️ Edit Admin: {editingAdmin.name}
              </h3>
              <button
                onClick={() => setEditingAdmin(null)}
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

            <form onSubmit={handleUpdateAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ADMINISTRATOR NAME
                </label>
                <input
                  type="text"
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ROLE ASSIGNMENT
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingAdmin({ ...editingAdmin, role: 'support' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: editingAdmin.role === 'support' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      background: editingAdmin.role === 'support' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: editingAdmin.role === 'support' ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    🛠️ Support
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingAdmin({ ...editingAdmin, role: 'superadmin' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: editingAdmin.role === 'superadmin' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                      background: editingAdmin.role === 'superadmin' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: editingAdmin.role === 'superadmin' ? '#fbbf24' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    👑 Superadmin
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  RESET PASSWORD (LEAVE EMPTY TO KEEP CURRENT)
                </label>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)..."
                  value={editingAdmin.newPassword || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, newPassword: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
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
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
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
              🗑️ Delete Provider Admin?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
              Are you sure you want to permanently delete <strong>"{deleteTarget.name}" ({deleteTarget.email})</strong>?
              They will immediately lose all access to this control center.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
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
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {submitting ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
