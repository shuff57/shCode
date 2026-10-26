import LegalLinks from '../../components/LegalLinks';

export const metadata = {
  title: 'Contact - shCode',
  description: 'How to reach the shCode team.',
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <h1>Contact</h1>
      <p>
        <a href="mailto:support@lefthanddev.com">support@lefthanddev.com</a>
        <br />
        We reply within two business days.
      </p>

      <h2>What to write about</h2>
      <ul>
        <li>
          <a href="mailto:support@lefthanddev.com?subject=Question">Questions</a> about shCode or your account.
        </li>
        <li>
          <a href="mailto:support@lefthanddev.com?subject=Privacy%20request">Privacy requests</a>: access, correction or
          deletion of your data (see the <a href="/privacy">Privacy Policy</a>).
        </li>
        <li>
          Problems with a lesson or the checker: use the &ldquo;Report an issue&rdquo; button on any page, or email us.
        </li>
      </ul>

      <LegalLinks />
    </main>
  );
}
