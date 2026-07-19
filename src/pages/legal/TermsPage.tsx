/** /terms — plain-language terms of use. */
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LegalPage, List, OPERATOR_JURISDICTION, POLICY_UPDATED, Section } from './LegalLayout'

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      description="The rules for using Scholarship One: who can use it, what you can and cannot do, content removal, and limitation of liability. Written to be readable."
      title="Terms and Conditions"
      updated={POLICY_UPDATED}
      intro="These are the rules for using Scholarship One. We have kept them short and readable, because terms nobody can understand protect nobody."
    >
      <Section heading="Agreeing to these terms">
        <p className="m-0">
          Using Scholarship One means you accept these terms. If you do not agree with them, please do not use the site.
        </p>
      </Section>

      <Section heading="Who can use Scholarship One">
        <List
          items={[
            'You must be at least 13 years old.',
            'If you are under 18, you need a parent or guardian to review these terms and give permission.',
            'You may hold one account, and the email address on it must be one you control.',
            'If you are using the site on behalf of someone else, such as a school counsellor or a parent, you are responsible for what happens under that account.',
          ]}
        />
      </Section>

      <Section heading="What Scholarship One does — and does not do">
        <p className="m-0">
          We help you find scholarships and keep track of your applications. Every award listed links to its official
          page, and we do not invent scholarships or deadlines.
        </p>
        <p className="m-0">
          <strong>We are not affiliated with the organisations that award these scholarships.</strong> We do not decide
          who wins anything, we cannot influence any decision, and using this site does not improve your odds. Deadlines
          and eligibility rules change without telling us, so{' '}
          <strong>always confirm the details on the official page before you apply.</strong> If our listing and the
          official page disagree, the official page is right.
        </p>
        <p className="m-0">
          We never charge you, and we will never ask you to pay to apply for a scholarship. If any scholarship asks you
          for a fee, treat that as a warning sign.
        </p>
      </Section>

      <Section heading="What you can do">
        <List
          items={[
            'Search, save, and track as many scholarships as you like, for free.',
            'Export your own data whenever you want.',
            'Share a link to a scholarship with anyone.',
            'Use what you find here for your own applications, or to help a student you work with.',
          ]}
        />
      </Section>

      <Section heading="What you cannot do">
        <List
          items={[
            'Scrape, bulk-download, or republish our catalogue as your own product.',
            'Break into, overload, or probe the site for weaknesses, or try to reach another user’s account.',
            'Upload anything unlawful, hateful, harassing, or infringing, including in notes and contact messages.',
            'Impersonate somebody else, or create accounts with addresses you do not control.',
            'Use automated tools to hammer the service or get around rate limits.',
            'Resell access, or use the site to run a competing service.',
          ]}
        />
      </Section>

      <Section heading="Your content">
        <p className="m-0">
          Notes, profile details, and anything else you enter stay yours. We only use them to run the service for you.
          You are responsible for what you write.
        </p>
      </Section>

      <Section heading="Our right to remove content and accounts">
        <p className="m-0">
          We may remove content or suspend an account that breaks these terms, that is being used to harm somebody, or
          that puts the service at risk. Where it is reasonable to do so, we will tell you why and give you a chance to
          respond. For serious cases, such as attacks on the service or unlawful content, we may act immediately. You
          can close your account whenever you like.
        </p>
      </Section>

      <Section heading="Availability">
        <p className="m-0">
          Scholarship One is offered as it is. We do our best to keep it running and accurate, but we cannot promise it
          will always be available, error-free, or complete. We may change or discontinue features. Keep your own copy
          of anything important — the app can export a backup at any time.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p className="m-0">
          To the extent the law allows, we are not liable for any loss that follows from using the site. That includes a
          missed deadline, a scholarship you did not win, information that turned out to be out of date, or data that
          was lost. Because the service is free, our total liability to you is limited to zero dollars.
        </p>
        <p className="m-0">
          Some places do not allow these limits, so if you live somewhere that gives you stronger rights, you keep them.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p className="m-0">
          We may update these terms. When we do, we change the date at the top of this page, and for significant changes
          we email account holders. If you keep using the site after a change takes effect, you accept the new terms. If
          you do not, stop using the site and close your account.
        </p>
      </Section>

      <Section heading="Governing law">
        <p className="m-0">
          Scholarship One is operated by an individual based in {OPERATOR_JURISDICTION}, and these terms are governed by
          the laws of that jurisdiction, without regard to conflict-of-law rules.
        </p>
      </Section>

      <Section heading="Contact">
        <p className="m-0">
          Questions about these terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the{' '}
          <Link to="/contact">contact form</Link>. Our <Link to="/privacy">Privacy Policy</Link> explains how we handle
          your information.
        </p>
      </Section>
    </LegalPage>
  )
}
