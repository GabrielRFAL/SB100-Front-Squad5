import { isResponseMode, type ResponseMode } from './types.ts';

export const RESPONSE_MODE_STORAGE_KEY = 'sb100_response_mode';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseResponseMode(rawValue: string | null): ResponseMode {
  return isResponseMode(rawValue) ? rawValue : 'deterministic';
}

export function getResponseMode(storage: StorageAdapter): ResponseMode {
  try {
    return parseResponseMode(storage.getItem(RESPONSE_MODE_STORAGE_KEY));
  } catch {
    return 'deterministic';
  }
}

export function setResponseMode(mode: ResponseMode, storage: StorageAdapter): boolean {
  try {
    storage.setItem(RESPONSE_MODE_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
