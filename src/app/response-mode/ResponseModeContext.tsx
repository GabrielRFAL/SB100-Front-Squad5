import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getStoredResponseMode,
  responseModeFromStorageEvent,
  RESPONSE_MODE_CHANGE_EVENT,
  updateResponseMode,
} from './responseModeStore';
import type { ResponseMode } from './types';

interface ResponseModeContextValue {
  responseMode: ResponseMode;
  setResponseMode: (mode: ResponseMode) => void;
}

const ResponseModeContext = createContext<ResponseModeContextValue | null>(null);

export function ResponseModeProvider({ children }: { children: ReactNode }) {
  const [responseMode, setResponseModeState] = useState<ResponseMode>(() => getStoredResponseMode());

  const setResponseMode = useCallback((mode: ResponseMode) => {
    setResponseModeState(mode);
    updateResponseMode(mode);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      const updatedMode = responseModeFromStorageEvent(event);
      if (updatedMode !== undefined) setResponseModeState(updatedMode);
    };

    const handleSameTabChange = (event: Event) => {
      const updatedMode = (event as CustomEvent<ResponseMode>).detail;
      setResponseModeState(updatedMode);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(RESPONSE_MODE_CHANGE_EVENT, handleSameTabChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(RESPONSE_MODE_CHANGE_EVENT, handleSameTabChange);
    };
  }, []);

  const value = useMemo(() => ({ responseMode, setResponseMode }), [responseMode, setResponseMode]);

  return <ResponseModeContext.Provider value={value}>{children}</ResponseModeContext.Provider>;
}

export function useResponseMode(): ResponseModeContextValue {
  const context = useContext(ResponseModeContext);
  if (!context) {
    throw new Error('useResponseMode deve ser usado dentro de ResponseModeProvider.');
  }
  return context;
}
