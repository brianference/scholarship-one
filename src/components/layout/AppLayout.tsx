/**
 * Shared layout for all routes: Shell + optional onboarding + page outlet.
 */
import { Outlet, useLocation } from 'react-router-dom'
import { Shell } from '../Shell'
import { OnboardingModal } from '../OnboardingModal'
import { AccountSync } from '../AccountSync'
import { useScholarship } from '../../state/ScholarshipContext'
import { siteConfig } from '../../config/site'

/** Route chrome — one place for nav, search, chat, onboarding. */
export function AppLayout() {
  const location = useLocation()
  const store = useScholarship()
  const isLanding = location.pathname === '/'

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
      {store.showOnboarding ? (
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
