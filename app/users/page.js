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

export default function PlatformUsersPage() {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Password Reset Modal
  const [resetModal, setResetModal] = useState({ open: false, user: null, newPassword: '', forceChange: true, loading: false });

  // Block Modal
  const [blockModal, setBlockModal] = useState({ open: false, user: null, loading: false });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null, loading: false });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [uRes, hRes] = await Promise.all([
        api.get('/users'),
        api.get('/hospitals'),
      ]);
      setUsers(uRes.data.users || []);
      setHospitals(hRes.data.hospitals || []);
    } catch (err) {
      console.error('[Users] Failed to load users:', err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { user, newPassword, forceChange } = resetModal;
    if (!user || !newPassword) return;

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setResetModal(prev => ({ ...prev, loading: true }));
    try {
      await api.patch(`/users/${user.id}`, {
        new_password: newPassword,
        force_password_change: forceChange,
      });
      showToast(`Password updated for ${user.name}`);
      setResetModal({ open: false, user: null, newPassword: '', forceChange: true, loading: false });
      loadData(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset password', 'error');
      setResetModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle Toggle User Block
  const handleToggleBlock = async () => {
    const { user } = blockModal;
    if (!user) return;

    setBlockModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/users/${user.id}/block`, {
        is_blocked: !user.is_blocked,
      });
      showToast(res.data.message || 'User status updated');
      setBlockModal({ open: false, user: null, loading: false });
      loadData(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user status', 'error');
      setBlockModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    const { user } = deleteModal;
    if (!user) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/users/${user.id}`);
      showToast(`User account "${user.name}" removed`);
      setDeleteModal({ open: false, user: null, loading: false });
      loadData(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Hospital Name', 'Hospital ID', 'Status', 'Reset Required', 'Joined Date'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      u.role || 'staff',
      `"${(u.Hospital?.name || '').replace(/"/g, '""')}"`,
      u.hospital_id,
      u.is_blocked ? 'Suspended' : 'Active',
      u.force_password_change ? 'Yes' : 'No',
      u.createdAt ? u.createdAt.slice(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tinitracker_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.Hospital?.name?.toLowerCase().includes(q) ||
        String(u.id).includes(q);

      if (!matchSearch) return false;

      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (hospitalFilter !== 'ALL' && String(u.hospital_id) !== hospitalFilter) return false;

      if (statusFilter === 'BLOCKED') {
        if (!u.is_blocked) return false;
      } else if (statusFilter === 'ACTIVE') {
        if (u.is_blocked) return false;
      } else if (statusFilter === 'RESET_REQUIRED') {
        if (!u.force_password_change) return false;
      }

      return true;
    });
  }, [users, search, roleFilter, hospitalFilter, statusFilter]);

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const clinicalCount = users.filter(u => u.role?.startsWith('doctor') || u.role === 'nurse').length;
  const blockedCount = users.filter(u => u.is_blocked).length;

  return (
    <AdminLayout onRefreshData={() => loadData(true)} isRefreshing={refreshing}>
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
              <span style={{ fontSize: '1.5rem' }}>👥</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Cross-Hospital User Directory
              </h1>
              <span className="badge badge-indigo" style={{ marginLeft: '4px' }}>
                {totalUsers} Accounts
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Unified governance over all hospital administrators, doctors, pediatricians, and staff accounts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

        {/* Metric Chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Platform Users
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {totalUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Across {hospitals.length} hospital nodes
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Hospital Administrators
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>
              {adminCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Tenant superusers
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Clinical Staff & Doctors
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {clinicalCount || (totalUsers - adminCount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Pediatricians & care managers
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Suspended Accounts
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: blockedCount > 0 ? '#fb7185' : '#34d399', marginTop: '2px' }}>
              {blockedCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Access restricted
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search user name, email, hospital..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>

            {/* Hospital Filter */}
            <div>
              <select
                className="input-field"
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                style={{ height: '40px' }}
              >
                <option value="ALL">All Hospital Tenants</option>
                {hospitals.map(h => (
                  <option key={h.id} value={String(h.id)}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                className="input-field"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ height: '40px' }}
              >
                <option value="ALL">All User Roles</option>
                <option value="admin">Administrators</option>
                <option value="staff">Staff Members</option>
                <option value="doctor_pregnancy">Doctor (Pregnancy)</option>
                <option value="doctor_immunization">Doctor (Immunization)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '40px' }}
              >
                <option value="ALL">All Security Statuses</option>
                <option value="ACTIVE">Active Users</option>
                <option value="BLOCKED">Suspended Accounts</option>
                <option value="RESET_REQUIRED">Password Reset Required</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem' }}>User Profile</th>
                  <th style={{ padding: '1rem' }}>Hospital Tenant</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Security & Status</th>
                  <th style={{ padding: '1rem' }}>Registered Date</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        No users match your criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: u.is_blocked ? 'rgba(244, 63, 94, 0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            backgroundColor: u.is_blocked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: u.is_blocked ? '#fb7185' : '#a5b4fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            flexShrink: 0,
                          }}>
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <Link
                          href={`/hospitals/${u.hospital_id}`}
                          style={{ fontWeight: 600, color: '#a5b4fc', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#a5b4fc'}
                        >
                          {u.Hospital?.name || `Hospital #${u.hospital_id}`}
                        </Link>
                        {u.Hospital?.is_blocked && (
                          <span style={{ fontSize: '0.68rem', color: '#fb7185', display: 'block', marginTop: '2px' }}>
                            (Hospital Suspended)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-indigo' : u.role?.startsWith('doctor') ? 'badge-cyan' : 'badge-muted'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {u.is_blocked ? (
                          <span className="badge badge-rose">⛔ Suspended</span>
                        ) : u.force_password_change ? (
                          <span className="badge badge-amber">⚠️ Reset Pending</span>
                        ) : (
                          <span className="badge badge-emerald">✓ Active</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => setResetModal({ open: true, user: u, newPassword: '', forceChange: true, loading: false })}
                            className="btn-secondary"
                            style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                            title="Reset password for this user"
                          >
                            🔑 Reset Pwd
                          </button>

                          <button
                            onClick={() => setBlockModal({ open: true, user: u, loading: false })}
                            className="btn-ghost"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.74rem',
                              color: u.is_blocked ? '#34d399' : '#fb7185',
                            }}
                            title={u.is_blocked ? 'Unblock user' : 'Suspend user'}
                          >
                            {u.is_blocked ? 'Unblock' : 'Suspend'}
                          </button>

                          <button
                            onClick={() => setDeleteModal({ open: true, user: u, loading: false })}
                            className="btn-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.74rem', color: 'var(--text-dim)' }}
                            title="Delete user"
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Reset Password */}
        {resetModal.open && resetModal.user && (
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
              maxWidth: 440,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Reset User Password
                </h3>
                <button onClick={() => setResetModal({ open: false, user: null, newPassword: '', forceChange: true, loading: false })} className="btn-ghost">✕</button>
              </div>

              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Enter a new password for <strong style={{ color: '#ffffff' }}>{resetModal.user.name}</strong> ({resetModal.user.email}).
              </p>

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">New Temporary Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    className="input-field"
                    value={resetModal.newPassword}
                    onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.825rem' }}>
                    <input
                      type="checkbox"
                      checked={resetModal.forceChange}
                      onChange={(e) => setResetModal({ ...resetModal, forceChange: e.target.checked })}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>Require password change on their next login</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setResetModal({ open: false, user: null, newPassword: '', forceChange: true, loading: false })} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetModal.loading} className="btn-primary">
                    {resetModal.loading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Block User */}
        {blockModal.open && blockModal.user && (
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
              maxWidth: 440,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                {blockModal.user.is_blocked ? '🔓' : '⛔'}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                {blockModal.user.is_blocked ? 'Unblock User Account?' : 'Suspend User Account?'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {blockModal.user.is_blocked
                  ? `Are you sure you want to restore access for "${blockModal.user.name}"?`
                  : `Are you sure you want to suspend "${blockModal.user.name}"? They will not be able to log into ${blockModal.user.Hospital?.name || 'their hospital'}.`}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setBlockModal({ open: false, user: null, loading: false })} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={blockModal.loading}
                  style={{
                    backgroundColor: blockModal.user.is_blocked ? '#10b981' : '#f43f5e',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {blockModal.loading ? 'Updating...' : blockModal.user.is_blocked ? 'Yes, Unblock' : 'Yes, Suspend User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete User */}
        {deleteModal.open && deleteModal.user && (
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
              maxWidth: 440,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fb7185', marginBottom: '0.5rem' }}>
                Delete User Account?
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Are you sure you want to permanently delete <strong style={{ color: '#ffffff' }}>{deleteModal.user.name}</strong> ({deleteModal.user.email})? This action cannot be reversed.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setDeleteModal({ open: false, user: null, loading: false })} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteModal.loading}
                  style={{
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {deleteModal.loading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
