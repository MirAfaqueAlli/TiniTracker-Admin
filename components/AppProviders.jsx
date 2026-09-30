'use client';
import { AuthProvider } from '@/lib/auth';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
