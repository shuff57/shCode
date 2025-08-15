import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <Link href="/" className="font-bold">Lesson Coding App</Link>
      <nav className="space-x-4">
        <Link href="/">Lessons</Link>
        <a href="#">Theme</a>
        <a href="#">Profile</a>
      </nav>
    </header>
  );
}
