import test from 'node:test';
import assert from 'node:assert/strict';

import { parseConversationHistory, writeConversationHistory } from './conversation-history.ts';

const record = {
  version: 1 as const,
  id: 'conversation-1',
  title: 'Como interpretar o solo?',
  updatedAt: '2026-11-26T12:00:00.000Z',
  messages: [{ id: '1', text: 'Como interpretar o solo?', isUser: true }],
};

test('valida e recupera o histórico de conversas', () => {
  assert.deepEqual(parseConversationHistory(JSON.stringify([record])), [record]);
  assert.deepEqual(parseConversationHistory('{"versao": "invalida"}'), []);
});

test('persiste o histórico usando a chave própria', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  assert.equal(writeConversationHistory([record], storage), true);
  assert.match(values.get('sb100_conversation_history') ?? '', /conversation-1/);
});
