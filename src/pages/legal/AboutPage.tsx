/** /about — what this is and who runs it. */
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LegalPage, List, OPERATOR_JURISDICTION, Section } from './LegalLayout'

export default function AboutPage() {
  return (
    <LegalPage
      path="/about"
      description="Why Scholarship One exists: real awards with official links, no sponsored placements, no selling your details, and no sign-up wall to search."
      title="About Us"
      intro="Scholarship One helps students find awards they can actually win, and keep track of the applications they start."
    >
      <Section heading="Why this exists">
        <p className="m-0">
          Scholarship searching is a mess. The big directories bury real awards under sponsored listings, ask for your
          phone number before showing results, and pad their counts with scholarships that closed years ago. Students
          give up somewhere around the fifth sign-up wall.
        </p>
        <p className="m-0">
          This site is the opposite of that. Search without an account, see real awards with links to their official
          pages, and decide for yourself. No sponsored placements, no selling your details, no fake urgency.
        </p>
      </Section>

      <Section heading="How matching works">
        <p className="m-0">
          You tell us your major, state, year, and background. Every award in the catalogue is scored against that, and
          the list reorders so the ones that fit come first. Each result explains <em>why</em> it matched, so you can
          judge whether the match is real rather than trusting a number.
        </p>
        <p className="m-0">
          Nothing is hidden behind an account. Signing in only adds syncing across devices and deadline reminders.
        </p>
      </Section>

      <Section heading="Where the listings come from">
        <p className="m-0">
          Every scholarship is checked against its official page before it goes in, and every card links straight there.
          We do not invent awards, amounts, or deadlines.
        </p>
        <p className="m-0">
          That said, programs change their rules and dates without announcing it.{' '}
          <strong>Always confirm the details on the official page before applying.</strong> Found something out of date?{' '}
          <Link to="/contact">Tell us</Link> and we will fix it.
        </p>
      </Section>

      <Section heading="What we will never do">
        <List
          items={[
            'Sell your information, or hand it to a data broker.',
            'Charge you, or take a cut of any award.',
            'Ask for a Social Security number or bank details.',
            'Put sponsored scholarships at the top and pretend they matched.',
            'Pad the catalogue with dead programs to inflate a number.',
          ]}
        />
      </Section>

      <Section heading="Who runs it">
        <p className="m-0">
          Scholarship One is built and operated by one person, based in {OPERATOR_JURISDICTION}. It is not a company,
          and it has no investors expecting a return on your attention. That is exactly why it can stay free of the
          things above.
        </p>
        <p className="m-0">
          Questions, corrections, or a scholarship worth adding? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the <Link to="/contact">contact form</Link>. A
          real person reads it.
        </p>
      </Section>
    </LegalPage>
  )
}
