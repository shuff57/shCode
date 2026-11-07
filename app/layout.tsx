import './globals.css';
import './themes.css';
import Header from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import ReportIssueButton from '../components/ReportIssueButton';
import StaleBuildGuard from '../components/StaleBuildGuard';
import LibrarySync from '../components/LibrarySync';
import { ReactNode } from 'react';

export const metadata = {
  title: 'shCode',
  description: 'Interactive coding lessons with version control and autograding',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The chosen theme (#73) is applied before first paint, so a light theme never
            flashes dark. The account's choice is cached here by lib/prefs.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('shcode.theme');if(t&&t!=='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body>
        <StaleBuildGuard />
        <LibrarySync />
        <AnnouncementBanner />
        <Header />
        {children}
        <ReportIssueButton />
      </body>
    </html>
  );
}
