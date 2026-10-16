import assert from 'node:assert/strict';
import test from 'node:test';

import { readNdjsonStream } from './streaming.ts';

const enc = new TextEncoder();

function streamFrom(parts: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}

test('junta uma linha dividida entre chunks', async () => {
  const bytes = enc.encode('{"tipo":"token","conteudo":"olá"}\n');
  const eventos: unknown[] = [];

  await readNdjsonStream(streamFrom([bytes.slice(0, 10), bytes.slice(10)]), (event) => {
    eventos.push(event);
  });

  assert.deepEqual(eventos, [{ tipo: 'token', conteudo: 'olá' }]);
});

test('entrega várias linhas do mesmo chunk na ordem', async () => {
  const eventos: unknown[] = [];

  await readNdjsonStream(
    streamFrom([enc.encode('{"tipo":"token","conteudo":"a"}\n{"tipo":"status"}\n')]),
    (event) => eventos.push(event),
  );

  assert.deepEqual(eventos, [
    { tipo: 'token', conteudo: 'a' },
    { tipo: 'status' },
  ]);
});

test('entrega a última linha sem quebra de linha final', async () => {
  const eventos: unknown[] = [];

  await readNdjsonStream(streamFrom([enc.encode('{"tipo":"metadata"}')]), (event) => {
    eventos.push(event);
  });

  assert.deepEqual(eventos, [{ tipo: 'metadata' }]);
});

test('ignora uma linha inválida e continua processando o stream', async () => {
  const eventos: unknown[] = [];
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    await readNdjsonStream(
      streamFrom([
        enc.encode('{"tipo":"token"}\nnot-json\n{"tipo":"metadata"}\n'),
      ]),
      (event) => eventos.push(event),
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(eventos, [{ tipo: 'token' }, { tipo: 'metadata' }]);
  assert.equal(warnings.length, 1);
});

test('preserva caractere multibyte dividido entre chunks', async () => {
  const bytes = enc.encode('{"tipo":"token","conteudo":"ã"}\n');
  const index = bytes.indexOf(0xc3);
  const eventos: unknown[] = [];

  await readNdjsonStream(streamFrom([bytes.slice(0, index + 1), bytes.slice(index + 1)]), (event) => {
    eventos.push(event);
  });

  assert.deepEqual(eventos, [{ tipo: 'token', conteudo: 'ã' }]);
});

test('propaga erros do handler sem tratá-los como linha inválida', async () => {
  const originalWarn = console.warn;
  console.warn = () => {
    throw new Error('O handler não deve acionar o aviso');
  };

  try {
    await assert.rejects(
      readNdjsonStream(
        streamFrom([enc.encode('{"tipo":"token"}\n')]),
        () => {
          throw new Error('Falha no handler');
        },
      ),
      { message: 'Falha no handler' },
    );
  } finally {
    console.warn = originalWarn;
  }
});
