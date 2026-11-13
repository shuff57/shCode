import Link from 'next/link';
import ContactForm from '../../components/ContactForm';
import LegalLinks from '../../components/LegalLinks';

export const metadata = {
  title: 'Contact - shCode',
  description: 'Send the shCode team a message.',
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <h1>Contact</h1>
      <p>Send us a message below. We reply within two business days, to the email address you give.</p>

      <ContactForm />

      <h2>What to write about</h2>
      <ul>
        <li>Questions about shCode or your account.</li>
        <li>
          Privacy requests: access, correction or deletion of your data (see the{' '}
          <Link href="/privacy">Privacy Policy</Link>). Use the email address on your account so we can find it.
        </li>
        <li>
          Problems with a lesson or the checker: use the &ldquo;Report an issue&rdquo; button on any page, or send a
          message here.
        </li>
      </ul>

      <LegalLinks />
    </main>
  );
}
