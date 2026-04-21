import Link from 'next/link';
import AuthButton from './AuthButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <Link href="/" className="font-bold">shCode</Link>
      <nav className="flex items-center gap-4">
        <Link href="/">Lessons</Link>
        <AuthButton />
      </nav>
    </header>
  );
}
