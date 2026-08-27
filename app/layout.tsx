import './globals.css';
import Header from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import ReportIssueButton from '../components/ReportIssueButton';
import { ReactNode } from 'react';

export const metadata = {
  title: 'shCode',
  description: 'Interactive coding lessons with version control and autograding',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnnouncementBanner />
        <Header />
        {children}
        <ReportIssueButton />
      </body>
    </html>
  );
}
