export const CONVERSATION_HISTORY_KEY = 'sb100_conversation_history';
export const CONVERSATION_HISTORY_VERSION = 1;

export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HistoryMessage {
  id: string;
  text: string;
  isUser: boolean;
  chunks?: Array<{ id: string; score: number; file: string; chunk_index: number; preview: string }>;
  referencias_principais?: string[];
  hallucination_flag?: number;
}

export interface ConversationRecord {
  version: 1;
  id: string;
  title: string;
  updatedAt: string;
  messages: HistoryMessage[];
}

function isHistoryMessage(value: unknown): value is HistoryMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && typeof candidate.isUser === 'boolean';
}

function isConversationRecord(value: unknown): value is ConversationRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === CONVERSATION_HISTORY_VERSION
    && typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.updatedAt === 'string'
    && !Number.isNaN(Date.parse(candidate.updatedAt))
    && Array.isArray(candidate.messages)
    && candidate.messages.every(isHistoryMessage);
}

export function parseConversationHistory(rawValue: string | null): ConversationRecord[] {
  if (!rawValue) return [];
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!Array.isArray(value)) return [];
    return value.filter(isConversationRecord).slice(0, 50);
  } catch {
    return [];
  }
}

export function readConversationHistory(storage: HistoryStorage): ConversationRecord[] {
  try {
    return parseConversationHistory(storage.getItem(CONVERSATION_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function writeConversationHistory(records: ConversationRecord[], storage: HistoryStorage): boolean {
  try {
    storage.setItem(CONVERSATION_HISTORY_KEY, JSON.stringify(records.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}
