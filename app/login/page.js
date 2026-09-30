'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, token, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    }
  }, [token, router]);

  // Check for expired session parameter
  useEffect(() => {
    if (searchParams.get('expired')) {
      setError('Your provider admin session has expired. Please sign in again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both your administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('[Login] Authentication failed:', err.response?.data?.error || err.message);
      const msg = err.response?.data?.error || err.message || 'Invalid administrator credentials';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 40%)
      `,
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Main Login Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 440,
        padding: '2.5rem',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)',
        position: 'relative',
        zIndex: 10,
        animation: 'fadeIn 0.3s ease',
      }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60,
            height: 60,
            margin: '0 auto 1.25rem',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}>
            <img
              src="/tinitraker-logo.png"
              alt="TiniTracker"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginBottom: '0.35rem',
          }}>
            TiniTracker Provider Admin
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}>
            Platform control center for TiniTracker multi-hospital deployments.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fb7185',
            fontSize: '0.825rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label" htmlFor="email-input">Administrator Email</label>
            <input
              id="email-input"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@tinitracker.in"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" htmlFor="password-input" style={{ marginBottom: 0 }}>Password</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Provider JWT Vault</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your security credential"
                className="input-field"
                style={{ paddingRight: '45px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.785rem',
            color: 'var(--text-dim)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-primary)' }} />
              <span>Remember session</span>
            </label>
            <span>v1.0 Provider Core</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '12px',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                }}>⌛</span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Secure Sign In</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          lineHeight: 1.5,
        }}>
          🔒 Enterprise Tier Multi-Tenant Governance. Authorized provider administrators only.
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
