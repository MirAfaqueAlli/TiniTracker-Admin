import './globals.css';
import AppProviders from '@/components/AppProviders';

export const metadata = {
  title: 'TiniTracker Provider Admin — Platform Control Center',
  description: 'Enterprise superadmin dashboard for TiniTracker maternal & infant health tracking infrastructure.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
