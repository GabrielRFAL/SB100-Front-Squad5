import { useState } from 'react';

import { ResponseModeSelector } from './ResponseModeSelector';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-3">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Digite sua pergunta"
          placeholder="Digite sua pergunta..."
          className="w-full rounded-full border border-slate-200 bg-slate-100 py-3 pl-4 pr-[190px] text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-400 focus:bg-white focus:outline-none sm:pr-[220px]"
          disabled={disabled}
        />
        <div className="absolute right-[78px] top-1/2 -translate-y-1/2">
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
