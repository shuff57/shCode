import Link from 'next/link';
import AuthButton from './AuthButton';
import HeaderNav from './HeaderNav';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <Link href="/" className="font-bold">shCode</Link>
      <nav className="flex items-center gap-4">
        <HeaderNav />
        <AuthButton />
      </nav>
    </header>
  );
}
