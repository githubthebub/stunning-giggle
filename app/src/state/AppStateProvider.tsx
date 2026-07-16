/**
 * App-wide state: the validated content bundle, the on-device profile, and the
 * crisis-scan controller.
 *
 * The crisis controller is deliberately global: ANY screen with a free-text
 * input calls `checkText(...)`, and if the maintained keyword list matches, the
 * calm crisis overlay is shown immediately (see App.tsx). The scan runs fully
 * on-device.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appContent, type AppContent } from '../data/contentLoader';
import { scanForCrisis } from '../features/safety/crisisScan';
import { getProfile, type Profile } from '../storage/repositories';

type AppStateValue = {
  ready: boolean;
  content: AppContent;
  profile: Profile | null;
  reloadProfile: () => Promise<void>;

  crisisVisible: boolean;
  /** Scan text; shows the crisis overlay on a match. Returns whether it matched. */
  checkText: (text: string) => boolean;
  showCrisis: () => void;
  dismissCrisis: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crisisVisible, setCrisisVisible] = useState(false);

  const reloadProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await getProfile();
      if (mounted) {
        setProfile(p);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const showCrisis = useCallback(() => setCrisisVisible(true), []);
  const dismissCrisis = useCallback(() => setCrisisVisible(false), []);

  const checkText = useCallback((text: string): boolean => {
    const { matched } = scanForCrisis(text, appContent.crisisKeywords.keywords);
    if (matched) setCrisisVisible(true);
    return matched;
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      content: appContent,
      profile,
      reloadProfile,
      crisisVisible,
      checkText,
      showCrisis,
      dismissCrisis,
    }),
    [ready, profile, reloadProfile, crisisVisible, checkText, showCrisis, dismissCrisis],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
