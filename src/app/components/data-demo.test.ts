import test from 'node:test';
import assert from 'node:assert/strict';

import { AGRONOMIC_ROWS, filterAgronomicRows, rowsToCsv } from './data-demo.ts';

test('filtra a demonstração por cultura sem alterar a fonte original', () => {
  const result = filterAgronomicRows(AGRONOMIC_ROWS, 'Citros');
  assert.equal(result.length, 3);
  assert.equal(AGRONOMIC_ROWS.length, 9);
});

test('gera CSV com os dados atualmente exibidos', () => {
  const csv = rowsToCsv(filterAgronomicRows(AGRONOMIC_ROWS, 'Café'));
  assert.match(csv, /Cultura,Região/);
  assert.match(csv, /Café,Sul,2024,26,5.6/);
});
