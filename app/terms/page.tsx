import LegalLinks from '../../components/LegalLinks';

export const metadata = {
  title: 'Terms of Service - shCode',
  description: 'The terms for using shCode.',
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: October 26, 2026</p>

      <p>
        shCode (&ldquo;the Service&rdquo;) is published by LHD, operated by Steven Huff in California, USA
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service you agree to these terms.
        If you use shCode through a class, your teacher&rsquo;s and school&rsquo;s rules also apply.
      </p>

      <h2>What the Service is</h2>
      <p>
        shCode is a browser-based set of coding lessons for JavaScript and moSHion 3D modelling. It includes a code
        editor, automatic checking of your work, a saved history of your versions, and optional AI help from CODY. It is free to
        use, is in public beta, and changes over time.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>Give accurate information and keep your password private. You are responsible for activity on your account.</li>
        <li>You must be at least 13 to create an account yourself, and you confirm this when you sign up.</li>
        <li>If you are under 18, you use shCode as part of a class run by your teacher or school.</li>
      </ul>

      <h2>Your work</h2>
      <p>
        You own the code, writing and images you create. You give us permission to store and process them, and to show
        them to you, your teacher or teachers, and the checking tools, only to run the Service. Your teacher can see your
        submissions, saved versions and grades. Only upload things you have the right to use. An uploaded image can be
        opened by anyone who has its link, so do not upload anything personal.
      </p>

      <h2>Grading and AI help</h2>
      <p>
        The automatic checker and the AI help can be wrong. Your teacher decides your grade and how AI help may be used
        in your class. CODY may have daily limits, and its answers are hints, not a replacement for your own work.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not attack or probe the Service, the checker or the code sandbox. Do not access another person&rsquo;s account or
        work, share answer keys, or tamper with grades or due dates. Do not harass others, upload unlawful content, or
        scrape the Service at scale. We may suspend accounts that break these rules.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind. We do not
        promise uninterrupted or error-free service, and we may change or discontinue features.
      </p>

      <h2>Limit of liability</h2>
      <p>
        To the extent the law allows, LHD is not liable for indirect or consequential damages, and our total liability for
        any claim is limited to the amount you paid us for shCode in the previous 12 months, which for this free Service is
        nothing. Nothing here limits rights you have under law that cannot be waived.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using the Service at any time and ask us to delete your account (see the Privacy Policy). We may
        suspend or end accounts that break these terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules.
        Disputes will be handled in the state or federal courts located in California, unless the law of your location
        requires otherwise.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we make material changes we will update the date above and ask you to confirm the new terms the next time you
        sign in.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{' '}
        <a href="mailto:support@lefthanddev.com?subject=Terms%20question">support@lefthanddev.com</a>.
      </p>

      <LegalLinks />
    </main>
  );
}
