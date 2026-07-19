/**
 * Shared layout for all routes: Shell + optional onboarding + page outlet.
 */
import { Outlet, useLocation } from 'react-router-dom'
import { Shell } from '../Shell'
import { OnboardingModal } from '../OnboardingModal'
import { AccountSync } from '../AccountSync'
import { AccountNudge } from '../AccountNudge'
import { useScholarship } from '../../state/ScholarshipContext'
import { siteConfig } from '../../config/site'

/**
 * Informational routes. Onboarding and the account nudge are suppressed here:
 * someone who clicked "Privacy Policy" wants to read the policy, and a modal
 * asking about their major sits on top of it and blocks the page. It also
 * matters legally — the terms have to be readable without dismissing a wizard.
 */
const INFORMATIONAL_ROUTES = new Set(['/about', '/terms', '/privacy', '/contact'])

/** Route chrome — one place for nav, search, chat, onboarding. */
export function AppLayout() {
  const location = useLocation()
  const store = useScholarship()
  const isLanding = location.pathname === '/'
  const isInformational = INFORMATIONAL_ROUTES.has(location.pathname)

  return (
    <Shell
      config={siteConfig}
      profile={store.profile}
      onProfileChange={store.setProfile}
      chatPrompt={store.chatPrompt}
      onChatPromptConsumed={store.clearChatPrompt}
      onPinMatches={store.handlePinMatches}
      forceChatOpen={store.forceChatOpen}
      onHeaderSearch={store.runSearch}
      headerSearchValue={store.headerQuery}
      showWorkspaceNav={!isLanding}
      onStartOver={store.restartOnboarding}
    >
      <AccountSync />
      {!isLanding && !isInformational ? <AccountNudge /> : null}
      {store.showOnboarding && !isInformational ? (
        <OnboardingModal
          profile={store.profile}
          onComplete={store.completeOnboarding}
          onSkip={store.skipOnboarding}
        />
      ) : null}
      <Outlet />
    </Shell>
  )
}
