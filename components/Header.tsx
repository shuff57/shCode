import Link from 'next/link';
import AuthButton from './AuthButton';
import HeaderNav from './HeaderNav';
import HeaderLessonNav from './HeaderLessonNav';

export default function Header() {
  return (
    <header className="bg-gray-800 text-white">
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="font-bold">shCode</Link>
        <nav className="flex items-center gap-4">
          <HeaderNav />
          <AuthButton />
        </nav>
      </div>
      <HeaderLessonNav />
    </header>
  );
}
