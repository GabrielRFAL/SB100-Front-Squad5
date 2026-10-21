import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RESPONSE_MODE_STORAGE_KEY,
  getResponseMode,
  parseResponseMode,
  setResponseMode,
  type StorageAdapter,
} from './storage.ts';
import { RESPONSE_MODE_CONFIG } from './types.ts';

class MemoryStorage implements StorageAdapter {
  value: string | null = null;

  getItem() {
    return this.value;
  }

  setItem(_key: string, value: string) {
    this.value = value;
  }
}

test('usa deterministic como padrão e aceita somente modos conhecidos', () => {
  assert.equal(parseResponseMode(null), 'deterministic');
  assert.equal(parseResponseMode('moderate'), 'moderate');
  assert.equal(parseResponseMode('creative'), 'creative');
  assert.equal(parseResponseMode('invalid'), 'deterministic');
});

test('mantem o mapeamento centralizado das temperaturas sugeridas', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(RESPONSE_MODE_CONFIG).map(([id, config]) => [id, config.suggestedTemperature])),
    { deterministic: 0.1, moderate: 0.5, creative: 0.9 },
  );
});

test('persiste e recupera o modo sem afetar outras chaves', () => {
  const storage = new MemoryStorage();

  assert.equal(setResponseMode('creative', storage), true);
  assert.equal(storage.value, 'creative');
  assert.equal(getResponseMode(storage), 'creative');
  assert.equal(RESPONSE_MODE_STORAGE_KEY, 'sb100_response_mode');
});

test('valor corrompido ou falha de armazenamento retorna deterministic', () => {
  const storage = new MemoryStorage();
  storage.value = '{corrompido';
  assert.equal(getResponseMode(storage), 'deterministic');
});
