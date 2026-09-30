'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CreateHospitalModal from './CreateHospitalModal';

export default function AdminLayout({ children, onRefreshData, isRefreshing }) {
  const router = useRouter();
  const { admin, token, loading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/login');
    }
  }, [loading, token, router]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        gap: '1rem',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
          animation: 'pulseGlow 1.5s infinite ease-in-out',
        }}>
          🛡️
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Authenticating Provider Session...
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex' }}>
      {/* Fixed Left Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Sticky Topbar */}
        <Topbar
          onRefresh={onRefreshData}
          isRefreshing={isRefreshing}
          onOpenCreateHospital={() => setShowCreateModal(true)}
        />

        {/* Dynamic Page Content */}
        <main style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
        }}>
          {children}
        </main>
      </div>

      {/* Global Create Hospital Modal */}
      <CreateHospitalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          onRefreshData?.();
        }}
      />
    </div>
  );
}
