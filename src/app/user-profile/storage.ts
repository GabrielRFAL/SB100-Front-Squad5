import {
  isUserProfile,
  type ClassificationMethod,
  type UserProfile,
  type UserProfileRecord,
} from './types.ts';

export const USER_PROFILE_STORAGE_KEY = 'user_profile';
export const USER_PROFILE_STORAGE_VERSION = 1;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createProfileRecord(
  profile: UserProfile,
  classificationMethod: ClassificationMethod,
  classifiedAt = new Date(),
): UserProfileRecord {
  return {
    version: USER_PROFILE_STORAGE_VERSION,
    profile,
    classifiedAt: classifiedAt.toISOString(),
    classificationMethod,
  };
}

export function parseProfileRecord(rawValue: string | null): UserProfileRecord | null {
  if (!rawValue) return null;

  try {
    const value: unknown = JSON.parse(rawValue);
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Record<string, unknown>;
    if (
      candidate.version !== USER_PROFILE_STORAGE_VERSION
      || !isUserProfile(candidate.profile)
      || typeof candidate.classifiedAt !== 'string'
      || Number.isNaN(Date.parse(candidate.classifiedAt))
      || (candidate.classificationMethod !== 'decision_tree'
        && candidate.classificationMethod !== 'visitor')
      || (candidate.profile === 'visitante') !== (candidate.classificationMethod === 'visitor')
    ) {
      return null;
    }

    return {
      version: USER_PROFILE_STORAGE_VERSION,
      profile: candidate.profile,
      classifiedAt: candidate.classifiedAt,
      classificationMethod: candidate.classificationMethod,
    };
  } catch {
    return null;
  }
}

export function readUserProfile(storage: StorageAdapter): UserProfileRecord | null {
  try {
    return parseProfileRecord(storage.getItem(USER_PROFILE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeUserProfile(record: UserProfileRecord, storage: StorageAdapter): boolean {
  try {
    storage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
