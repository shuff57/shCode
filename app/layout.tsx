import './globals.css';
import Header from '../components/Header';
import { ReactNode } from 'react';

export const metadata = {
  title: 'shCode',
  description: 'Interactive coding lessons with version control and autograding',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
