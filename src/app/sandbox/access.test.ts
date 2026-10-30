import assert from 'node:assert/strict';
import test from 'node:test';

import { isSandboxEnabled } from './access.ts';

test('habilita o sandbox localmente sem exigir variável', () => {
  assert.equal(isSandboxEnabled({ dev: true, flag: undefined }), true);
});

test('habilita o sandbox em deployment somente com flag explícita', () => {
  assert.equal(isSandboxEnabled({ dev: false, flag: 'true' }), true);
  assert.equal(isSandboxEnabled({ dev: false, flag: 'false' }), false);
  assert.equal(isSandboxEnabled({ dev: false, flag: undefined }), false);
});
