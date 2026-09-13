import './globals.css';
import Header from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import ReportIssueButton from '../components/ReportIssueButton';
import StaleBuildGuard from '../components/StaleBuildGuard';
import { ReactNode } from 'react';

export const metadata = {
  title: 'shCode',
  description: 'Interactive coding lessons with version control and autograding',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StaleBuildGuard />
        <AnnouncementBanner />
        <Header />
        {children}
        <ReportIssueButton />
      </body>
    </html>
  );
}
