import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSandboxRequest, validateSandboxConfig } from './config.ts';
import { createStructuredLog, sanitizeLogMessage } from './logging.ts';
import { runSandboxGeneration } from './client.ts';

test('monta payload somente com parâmetros suportados', () => {
  const request = buildSandboxRequest({
    pergunta: 'Como melhorar o solo?',
    profile: 'visitante',
    temperature: 0.7,
  });

  assert.deepEqual(request, {
    pergunta: 'Como melhorar o solo?',
    profile: 'visitante',
    temperature: 0.7,
  });
  assert.equal('top_p' in request, false);
  assert.equal('top_k' in request, false);
});

test('valida temperature, timeout e tentativas', () => {
  assert.equal(validateSandboxConfig({ temperature: 0.1, timeoutMs: 10000, maxAttempts: 3 }), null);
  assert.match(validateSandboxConfig({ temperature: Number.NaN, timeoutMs: 10000, maxAttempts: 3 }) ?? '', /temperature/);
  assert.match(validateSandboxConfig({ temperature: 0.1, timeoutMs: 100, maxAttempts: 3 }) ?? '', /timeout/);
  assert.match(validateSandboxConfig({ temperature: 0.1, timeoutMs: 10000, maxAttempts: 0 }) ?? '', /tentativas/);
});

test('faz retry em 503 e preserva o sample_id nos eventos', async () => {
  const responses = [
    new Response('temporarily unavailable', { status: 503 }),
    new Response('data: primeiro\n\ndata: segundo\n\n', { status: 200 }),
  ];
  const events: Array<Record<string, unknown>> = [];

  const result = await runSandboxGeneration({
    baseUrl: 'https://example.test',
    request: buildSandboxRequest({ pergunta: 'teste', temperature: 0.1 }),
    sampleId: 'sample-test',
    timeoutMs: 1000,
    maxAttempts: 2,
    fetchImpl: async () => responses.shift() ?? new Response('', { status: 500 }),
    sleep: async () => undefined,
    random: () => 0,
    onLog: (event) => events.push(event),
  });

  assert.equal(result.text, 'primeirosegundo');
  assert.equal(result.attempts, 2);
  assert.equal(events.every((event) => event.sample_id === 'sample-test'), true);
  assert.equal(events.some((event) => event.event === 'retry_scheduled'), true);
});

test('não faz retry depois de receber resposta parcial', async () => {
  let calls = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: parcial\n\n'));
      controller.error(new Error('stream interrompido'));
    },
  });
  await assert.rejects(
    runSandboxGeneration({
      baseUrl: 'https://example.test',
      request: buildSandboxRequest({ pergunta: 'teste', temperature: 0.1 }),
      sampleId: 'partial-test',
      timeoutMs: 1000,
      maxAttempts: 3,
      fetchImpl: async () => {
        calls += 1;
        return new Response(body, { status: 200 });
      },
      sleep: async () => undefined,
      onLog: () => undefined,
    }),
  );
  assert.equal(calls, 1);
});

test('sanitiza mensagens e cria logs JSON sem segredos', () => {
  assert.equal(sanitizeLogMessage('Authorization: Bearer abc\npassword=secret'), '[dados sensíveis omitidos]');
  const event = createStructuredLog({ event: 'request_sent', sampleId: 's1', attempt: 1, message: 'ok' });
  assert.equal(event.sample_id, 's1');
  assert.equal(typeof JSON.stringify(event), 'string');
});
