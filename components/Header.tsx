import Link from 'next/link';
import HeaderNav from './HeaderNav';
import HeaderLessonNav from './HeaderLessonNav';

export default function Header() {
  return (
    <header style={{ background: 'var(--header-bg)', color: 'var(--header-fg)' }}>
      <div className="site-header-row flex items-center justify-between p-4">
        <Link href="/" className="font-bold">shCode</Link>
        <HeaderNav />
      </div>
      <HeaderLessonNav />
    </header>
  );
}
