import { useState } from 'react';

import { ResponseModeSelector } from './ResponseModeSelector';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  suggestions?: string[];
}

export function ChatInput({ onSendMessage, disabled = false, suggestions = [] }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-4xl px-2 py-3 sm:px-4">
      {suggestions.length > 0 && <div className="mb-3 flex min-w-0 max-w-full snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Sugestões de perguntas">{suggestions.map((suggestion, index) => <button key={suggestion} type="button" disabled={disabled} onClick={() => onSendMessage(suggestion)} className={`${index > 0 ? 'hidden sm:block' : ''} max-w-[calc(100vw-3rem)] shrink-0 snap-start truncate rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50 sm:max-w-none`}>{suggestion}</button>)}</div>}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Digite sua pergunta"
          placeholder="Digite sua pergunta..."
          className="w-full rounded-full border border-slate-200 bg-slate-100 py-3 pl-4 pr-[120px] text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-400 focus:bg-white focus:outline-none sm:pr-[220px]"
          disabled={disabled}
        />
        <div className="absolute inset-y-0 right-[88px] flex items-center sm:right-[78px]">
          <ResponseModeSelector compact />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#4b633d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3f5230] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
