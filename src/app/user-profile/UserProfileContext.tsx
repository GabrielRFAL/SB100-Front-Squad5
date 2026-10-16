import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { UserProfileModal } from './UserProfileModal';
import {
  getUserProfile,
  profileFromStorageEvent,
  setUserProfile,
  USER_PROFILE_CHANGE_EVENT,
} from './profileStore';
import type { ClassificationMethod, UserProfile, UserProfileRecord } from './types';

interface UserProfileContextValue {
  profileRecord: UserProfileRecord | null;
  hasValidProfile: boolean;
  openProfileClassification: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profileRecord, setProfileRecord] = useState<UserProfileRecord | null>(() => getUserProfile());
  const [isModalOpen, setIsModalOpen] = useState(() => profileRecord === null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  const openProfileClassification = useCallback(() => {
    setStorageNotice(null);
    setIsModalOpen(true);
  }, []);

  const completeClassification = useCallback((
    profile: UserProfile,
    method: ClassificationMethod,
  ) => {
    const result = setUserProfile(profile, method);
    setProfileRecord(result.record);
    setIsModalOpen(false);
    setStorageNotice(result.persisted
      ? null
      : 'O perfil será mantido somente durante esta sessão porque o armazenamento do navegador está indisponível.');
  }, []);

  const cancelClassification = useCallback(() => {
    if (profileRecord) setIsModalOpen(false);
  }, [profileRecord]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      const updatedProfile = profileFromStorageEvent(event);
      if (updatedProfile === undefined) return;

      setProfileRecord(updatedProfile);
      setIsModalOpen(updatedProfile === null);
    };

    const handleSameTabChange = (event: Event) => {
      const updatedProfile = (event as CustomEvent<UserProfileRecord>).detail;
      setProfileRecord(updatedProfile);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(USER_PROFILE_CHANGE_EVENT, handleSameTabChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(USER_PROFILE_CHANGE_EVENT, handleSameTabChange);
    };
  }, []);

  const value = useMemo<UserProfileContextValue>(() => ({
    profileRecord,
    hasValidProfile: profileRecord !== null,
    openProfileClassification,
  }), [openProfileClassification, profileRecord]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
      <UserProfileModal
        open={isModalOpen}
        isRequired={profileRecord === null}
        onCancel={cancelClassification}
        onComplete={completeClassification}
      />
      {storageNotice && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg"
          role="status"
        >
          {storageNotice}
        </div>
      )}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile deve ser usado dentro de UserProfileProvider.');
  }
  return context;
}
