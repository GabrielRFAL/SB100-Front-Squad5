import assert from 'node:assert/strict';
import test from 'node:test';

import {
  USER_PROFILE_STORAGE_KEY,
  createProfileRecord,
  parseProfileRecord,
  readUserProfile,
  writeUserProfile,
  type StorageAdapter,
} from './storage.ts';

class MemoryStorage implements StorageAdapter {
  value: string | null = null;
  readError = false;
  writeError = false;

  getItem() {
    if (this.readError) throw new Error('blocked read');
    return this.value;
  }

  setItem(_key: string, value: string) {
    if (this.writeError) throw new Error('blocked write');
    this.value = value;
  }
}

test('retorna null quando nao existe perfil salvo', () => {
  assert.equal(readUserProfile(new MemoryStorage()), null);
});

test('valida e le um perfil persistido', () => {
  const storage = new MemoryStorage();
  const record = createProfileRecord('cooperativa', 'decision_tree', new Date('2026-10-08T12:00:00.000Z'));
  storage.value = JSON.stringify(record);

  assert.deepEqual(readUserProfile(storage), record);
});

test('rejeita perfil invalido, JSON corrompido e versao incompatível', () => {
  assert.equal(parseProfileRecord('{'), null);
  assert.equal(parseProfileRecord(JSON.stringify({ version: 1, profile: 'admin' })), null);
  assert.equal(parseProfileRecord(JSON.stringify({
    version: 2,
    profile: 'visitante',
    classifiedAt: '2026-10-08T12:00:00.000Z',
    classificationMethod: 'visitor',
  })), null);
});

test('trata falha de leitura sem interromper a aplicacao', () => {
  const storage = new MemoryStorage();
  storage.readError = true;
  assert.equal(readUserProfile(storage), null);
});

test('informa falha de gravacao e preserva o registro criado', () => {
  const storage = new MemoryStorage();
  storage.writeError = true;
  const record = createProfileRecord('tecnico', 'decision_tree');

  assert.equal(writeUserProfile(record, storage), false);
  assert.equal(record.profile, 'tecnico');
});

test('persiste visitante com o metodo correto e permite releitura', () => {
  const storage = new MemoryStorage();
  const record = createProfileRecord('visitante', 'visitor');

  assert.equal(writeUserProfile(record, storage), true);
  assert.equal(readUserProfile(storage)?.classificationMethod, 'visitor');
  assert.equal(USER_PROFILE_STORAGE_KEY, 'user_profile');
});
