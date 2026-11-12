import './globals.css';
import './themes.css';
import Header from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import ReportIssueButton from '../components/ReportIssueButton';
import StaleBuildGuard from '../components/StaleBuildGuard';
import OwnerNotices from '../components/OwnerNotices';
import LibrarySync from '../components/LibrarySync';
import PrefsSync from '../components/PrefsSync';
import WhatsNewModal from '../components/WhatsNewModal';
import { PREFS_BOOT_SCRIPT } from '../lib/prefs';
import { ReactNode } from 'react';

export const metadata = {
  title: 'shCode',
  description: 'Interactive coding lessons with version control and autograding',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The chosen theme, accent and font (#73, #77) are applied before first paint, so a light theme never
            flashes dark. The account's choice is cached here by lib/prefs.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: PREFS_BOOT_SCRIPT,
          }}
        />
      </head>
      <body>
        {/* First: installs the X-Work-Owner header before any page fetch (lib/owner-fetch.ts). */}
        <OwnerNotices />
        <StaleBuildGuard />
        <LibrarySync />
        <PrefsSync />
        <AnnouncementBanner />
        <Header />
        {children}
        <ReportIssueButton />
        {/* What's New: opens by itself for unseen recent news on a few pages (lib/whats-new-state.ts). */}
        <WhatsNewModal />
      </body>
    </html>
  );
}
