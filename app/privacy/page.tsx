import LegalLinks from '../../components/LegalLinks';

export const metadata = {
  title: 'Privacy Policy - shCode',
  description: 'What shCode collects, why, and who handles it.',
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: October 26, 2026</p>

      <p>
        <strong>Short version:</strong> shCode collects the minimum needed to run accounts, classes and grading, does not
        sell personal information, and shows no ads. It uses no advertising or third-party analytics trackers.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> email address, an optional first and last name, your role (student, teacher or
          admin), a salted, hashed password (we never store your plain password), and when you accepted these terms.
        </li>
        <li>
          <strong>Class records:</strong> which classes you belong to or teach, due dates and announcements.
        </li>
        <li>
          <strong>Your work:</strong> the code and files you write, your saved versions and their messages, lesson drafts,
          quiz answers, submissions, attempt counts, and the scores and grades from the checker and your teacher.
        </li>
        <li>
          <strong>Uploads:</strong> images you upload for your projects. Each has a long, unguessable link, and anyone who
          has the link can open it, so do not upload anything personal.
        </li>
        <li>
          <strong>AI help:</strong> when you ask for help, your question and the relevant lesson or code are sent to an AI
          provider to write a hint. Questions that appear to contain personal details such as an email address, phone number
          or card number are blocked before anything is sent. We keep only a count of how many help requests each student
          makes per day, not the questions or the answers.
        </li>
        <li>
          <strong>Problem reports:</strong> if you report a problem, we store the text, any screenshot you attach, and your
          email. Do not include other people&rsquo;s personal information in a screenshot.
        </li>
        <li>
          <strong>Security records:</strong> counts of failed sign-in attempts per email, and counts of requests per IP
          address, used to stop abuse.
        </li>
        <li>
          <strong>Session cookie:</strong> one secure, HTTP-only cookie that keeps you signed in for up to 7 days. It is
          strictly necessary. There are no advertising cookies and no cross-site tracking.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run your account and classes, save and grade your work, show it to you and your teachers, provide AI help, keep
        the Service secure, answer support requests, and fix problems. We do not use personal information for advertising
        and do not sell or rent it.
      </p>

      <h2>Who else handles it</h2>
      <ul>
        <li><strong>Cloudflare:</strong> hosting, the database, file storage, security logs, and the AI (Workers AI) that writes help hints and gives feedback on written answers.</li>
      </ul>
      <p>
        These providers process data only to provide their service to us. We may also disclose information if the law
        requires it or to protect the safety of users.
      </p>

      <h2>Students and schools</h2>
      <p>
        When a school or teacher gives students access to shCode, the school remains in control of its students&rsquo;
        education records and we act on the school&rsquo;s behalf. We use student information only to provide the Service,
        never for targeted advertising or for building profiles for non-educational purposes. You must be at least 13 to
        create an account yourself. Teachers and schools can request access, correction or deletion of their students&rsquo;
        data at any time.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep account data while your account is active. Email us to delete your account and your work; we will do so
        within 30 days, except records we must keep for legal reasons.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask to see, correct, export or delete your personal information by emailing us. Residents of California and
        other regions may have additional rights under local law; we honor those requests whatever your location.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed with PBKDF2 and unique salts, sessions use signed secure cookies, and all traffic is encrypted
        over HTTPS. No system is perfectly secure; if a breach affecting your information occurs we will notify you as the
        law requires.
      </p>

      <h2>Changes</h2>
      <p>
        We will post updates here with a new date, and ask you to confirm material changes the next time you sign in.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests:{' '}
        <a href="mailto:support@lefthanddev.com?subject=Privacy%20request">support@lefthanddev.com</a>.
      </p>

      <LegalLinks />
    </main>
  );
}
