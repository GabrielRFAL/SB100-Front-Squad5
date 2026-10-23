import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useResponseMode } from '../response-mode/ResponseModeContext';
import { RESPONSE_MODE_CONFIG, RESPONSE_MODES, type ResponseMode } from '../response-mode/types';

interface ResponseModeSelectorProps {
  compact?: boolean;
}

export function ResponseModeSelector({ compact = false }: ResponseModeSelectorProps) {
  const { responseMode, setResponseMode } = useResponseMode();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(RESPONSE_MODES.indexOf(responseMode));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedConfig = RESPONSE_MODE_CONFIG[responseMode];

  useEffect(() => {
    setFocusedIndex(RESPONSE_MODES.indexOf(responseMode));
  }, [responseMode]);

  useEffect(() => {
    if (isOpen) optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const selectMode = (mode: ResponseMode) => {
    setResponseMode(mode);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((index + 1) % RESPONSE_MODES.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((index - 1 + RESPONSE_MODES.length) % RESPONSE_MODES.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusedIndex(RESPONSE_MODES.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectMode(RESPONSE_MODES[index]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="relative min-w-0">
      <span className="sr-only" id="response-mode-label">Modo de resposta</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="response-mode-label response-mode-value"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-9 items-center justify-between gap-2 whitespace-nowrap rounded-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${compact ? 'w-auto bg-transparent px-3 py-1.5 hover:bg-slate-200' : 'w-full border border-slate-200 bg-white px-3 py-2 hover:border-emerald-300'}`}
      >
        <span className="min-w-0">
          {!compact && <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Modo de resposta</span>}
          <span id="response-mode-value" className={`block truncate font-semibold text-slate-900 ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            {selectedConfig.label}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="response-mode-label"
          className="absolute right-0 bottom-full z-20 mb-2 w-[min(340px,calc(100vw-2rem))] min-w-[280px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          {RESPONSE_MODES.map((mode, index) => {
            const config = RESPONSE_MODE_CONFIG[mode];
            const isSelected = responseMode === mode;
            return (
              <button
                key={mode}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectMode(mode)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${isSelected ? 'bg-emerald-50 text-emerald-950' : 'text-slate-800 hover:bg-slate-50'}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {config.label}
                    {config.recommended && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Recomendado</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{config.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
