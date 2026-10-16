import {
  createProfileRecord,
  parseProfileRecord,
  USER_PROFILE_STORAGE_KEY,
  writeUserProfile,
} from './storage';
import type { ClassificationMethod, UserProfile, UserProfileRecord } from './types';

export const USER_PROFILE_CHANGE_EVENT = 'sb100:user-profile-change';

let sessionProfile: UserProfileRecord | null = null;

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getUserProfile(): UserProfileRecord | null {
  const storage = getBrowserStorage();
  if (!storage) return sessionProfile;

  try {
    const rawValue = storage.getItem(USER_PROFILE_STORAGE_KEY);
    if (rawValue === null) return sessionProfile;

    const storedProfile = parseProfileRecord(rawValue);
    if (storedProfile) sessionProfile = storedProfile;
    return storedProfile;
  } catch {
    return sessionProfile;
  }
}

export function setUserProfile(
  profile: UserProfile,
  classificationMethod: ClassificationMethod,
): { record: UserProfileRecord; persisted: boolean } {
  const record = createProfileRecord(profile, classificationMethod);
  const storage = getBrowserStorage();
  const persisted = storage ? writeUserProfile(record, storage) : false;
  sessionProfile = record;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<UserProfileRecord>(USER_PROFILE_CHANGE_EVENT, {
      detail: record,
    }));
  }

  return { record, persisted };
}

export function profileFromStorageEvent(event: StorageEvent): UserProfileRecord | null | undefined {
  if (event.key !== USER_PROFILE_STORAGE_KEY) return undefined;
  return parseProfileRecord(event.newValue);
}

