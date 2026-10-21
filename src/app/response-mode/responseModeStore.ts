import {
  getResponseMode,
  RESPONSE_MODE_STORAGE_KEY,
  setResponseMode,
} from './storage';
import type { ResponseMode } from './types';

export const RESPONSE_MODE_CHANGE_EVENT = 'sb100:response-mode-change';

let sessionResponseMode: ResponseMode = 'deterministic';

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredResponseMode(): ResponseMode {
  const storage = getBrowserStorage();
  if (!storage) return sessionResponseMode;

  sessionResponseMode = getResponseMode(storage);
  return sessionResponseMode;
}

export function updateResponseMode(mode: ResponseMode): boolean {
  const storage = getBrowserStorage();
  const persisted = storage ? setResponseMode(mode, storage) : false;
  sessionResponseMode = mode;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ResponseMode>(RESPONSE_MODE_CHANGE_EVENT, {
      detail: mode,
    }));
  }

  return persisted;
}

export function responseModeFromStorageEvent(event: StorageEvent): ResponseMode | undefined {
  if (event.key !== RESPONSE_MODE_STORAGE_KEY) return undefined;
  return getResponseMode({
    getItem: () => event.newValue,
    setItem: () => undefined,
  });
}
