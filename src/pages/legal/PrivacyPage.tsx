/** /privacy — plain-language privacy policy. */
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LegalPage, List, POLICY_UPDATED, Section } from './LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      description="How Scholarship One handles your data: what we collect, what we never collect, and how to delete your account. We do not sell your information."
      title="Privacy Policy"
      updated={POLICY_UPDATED}
      intro="Short version: we collect the little we need to run your account, we do not sell it, and you can delete it whenever you want."
    >
      <Section heading="What we collect">
        <p className="m-0">Only three things:</p>
        <List
          items={[
            <>
              <strong>Your email address</strong>, if you create an account. It identifies your account and is where
              deadline reminders go.
            </>,
            <>
              <strong>Your profile answers</strong> — major, state, year, background, and similar details you enter to
              get matched. You choose every one of these, and you can leave any of them blank.
            </>,
            <>
              <strong>Your saved scholarships</strong>, along with any notes, checklist progress, and application status
              you record.
            </>,
          ]}
        />
        <p className="m-0">
          If you never create an account, none of this reaches our servers. It stays in your browser's local storage on
          your own device.
        </p>
      </Section>

      <Section heading="What we do not collect">
        <List
          items={[
            'No advertising or tracking cookies, and no third-party analytics scripts.',
            'No Social Security numbers, financial account details, or payment information — the site never asks for them, and you should never enter them.',
            'No location tracking beyond the state you choose to type in yourself.',
            'No browsing history from other sites.',
          ]}
        />
      </Section>

      <Section heading="Why we collect it">
        <p className="m-0">
          Your profile ranks scholarships against your situation. Your email lets you sign in and receive the deadline
          reminders you asked for. That is the whole list. We do not build advertising profiles, and we have nothing to
          sell to a data broker.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p className="m-0">
          <strong>We do not sell your personal information, and we never have.</strong> We share it only with the
          services required to operate:
        </p>
        <List
          items={[
            <>
              <strong>Cloudflare</strong> hosts the site and database.
            </>,
            <>
              <strong>Brevo</strong> delivers sign-in links and deadline reminder emails.
            </>,
          ]}
        />
        <p className="m-0">
          We will also disclose information if the law genuinely requires it. Beyond that, nobody else gets it.
        </p>
      </Section>

      <Section heading="Cookies">
        <p className="m-0">
          One cookie, and it only exists once you sign in. It holds a random session identifier — no personal details
          are stored in it. It is marked HttpOnly and Secure, so scripts cannot read it and it only travels over HTTPS.
          Signing out deletes it. There are no advertising or tracking cookies on this site.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p className="m-0">
          Account data stays until you delete it. Sign-in sessions expire after 60 days. Sign-in links expire after 15
          minutes and password reset links after an hour, and each works only once. Messages you send through the
          contact form are kept so we can reply and follow up.
        </p>
      </Section>

      <Section heading="Your choices">
        <List
          items={[
            'Use the site signed out — nothing leaves your device.',
            'See everything we hold on you by downloading a backup from the app.',
            'Correct anything by editing your profile.',
            'Delete your account and everything attached to it, at any time, by emailing us.',
            'Turn off deadline reminder emails without deleting your account.',
          ]}
        />
        <p className="m-0">
          To delete your account, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on the
          account. We will remove it and confirm when it is done.
        </p>
      </Section>

      <Section heading="Children and students under 18">
        <p className="m-0">
          You must be at least 13 to create an account. If you are under 18, read this page with a parent or guardian
          and get their permission first. If we learn we hold an account for someone under 13, we delete it. A parent or
          guardian who believes their child under 13 created an account should email us and we will remove it promptly.
        </p>
      </Section>

      <Section heading="Security">
        <p className="m-0">
          Passwords are never stored as written. Each one is put through PBKDF2 with a random salt unique to your
          account, and only the result is kept — we cannot read your password, and neither could anyone who obtained the
          database. All traffic runs over HTTPS. No system is perfect, so please use a password you do not reuse
          anywhere else.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p className="m-0">
          If this policy changes in a way that affects you, we will update the date at the top and, for anything
          significant, email account holders. Continuing to use the site after a change means you accept the updated
          policy.
        </p>
      </Section>

      <Section heading="Contact">
        <p className="m-0">
          Questions about privacy, or want your data removed? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the <Link to="/contact">contact form</Link>.
        </p>
      </Section>
    </LegalPage>
  )
}
