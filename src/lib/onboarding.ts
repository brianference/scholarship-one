const KEY = 'scholarship-one-onboarding-v1'

export type OnboardingState = {
  completed: boolean
  skipped: boolean
  completedAt?: number
}

export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: false, skipped: false }
    return JSON.parse(raw) as OnboardingState
  } catch {
    return { completed: false, skipped: false }
  }
}

export function saveOnboarding(state: OnboardingState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function completeOnboarding(): void {
  saveOnboarding({ completed: true, skipped: false, completedAt: Date.now() })
}

export function skipOnboarding(): void {
  saveOnboarding({ completed: true, skipped: true, completedAt: Date.now() })
}

export function shouldShowOnboarding(): boolean {
  const s = loadOnboarding()
  return !s.completed && !s.skipped
}
