import Link from 'next/link';

/** Terms / Privacy / Contact links, shown in the home footer and on the legal pages. */
export default function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
