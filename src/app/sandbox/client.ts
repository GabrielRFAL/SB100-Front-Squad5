import type { SandboxRequest } from './config';
import { createStructuredLog, type SandboxLogEvent } from './logging.ts';

export interface SandboxGenerationResult {
  text: string;
  attempts: number;
  latencyMs: number;
  httpStatus?: number;
  status: 'completed' | 'failed' | 'cancelled';
}

interface RunOptions {
  baseUrl: string;
  request: SandboxRequest;
  sampleId: string;
  timeoutMs: number;
  maxAttempts: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  onToken?: (text: string) => void;
  onLog: (event: SandboxLogEvent) => void;
}

class SandboxRequestError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function isRetryableStatus(status: number): boolean {
  return [429, 502, 503, 504].includes(status);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function parseStreamLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
  if (!payload || payload === '[DONE]') return null;
  try {
    const value: unknown = JSON.parse(payload);
    if (typeof value === 'object' && value !== null && 'tipo' in value) {
      const event = value as { tipo?: unknown; conteudo?: unknown };
      return event.tipo === 'token' ? String(event.conteudo ?? '') : null;
    }
    return typeof value === 'string' ? value : null;
  } catch {
    return payload;
  }
}

async function readResponseStream(
  body: ReadableStream<Uint8Array>,
  onToken: (text: string) => void,
): Promise<{ text: string; receivedPartial: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let receivedPartial = false;
  const consume = (line: string) => {
    const token = parseStreamLine(line);
    if (token === null) return;
    text += token;
    receivedPartial = true;
    onToken(token);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    lines.forEach(consume);
  }
  buffer += decoder.decode();
  consume(buffer);
  return { text, receivedPartial };
}

export async function runSandboxGeneration(options: RunOptions): Promise<SandboxGenerationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const startedAt = performance.now();
  let lastStatus: number | undefined;

  options.onLog(createStructuredLog({ event: 'generation_started', sampleId: options.sampleId }));

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException('Cancelado pelo usuário', 'AbortError');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
    const abortExternal = () => controller.abort();
    options.signal?.addEventListener('abort', abortExternal, { once: true });
    const endpoint = `${options.baseUrl.replace(/\/$/, '')}/perguntar/stream`;
    const attemptStarted = performance.now();
    let receivedPartial = false;

    try {
      options.onLog(createStructuredLog({ event: 'request_sent', sampleId: options.sampleId, attempt, endpoint }));
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.request),
        signal: controller.signal,
      });
      lastStatus = response.status;
      if (!response.ok) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter && /^\d+$/.test(retryAfter)
          ? Math.min(8_000, Number(retryAfter) * 1_000)
          : undefined;
        throw new SandboxRequestError(response.status, `HTTP ${response.status}`, retryAfterMs);
      }
      if (!response.body) throw new Error('A API não retornou um stream.');
      options.onLog(createStructuredLog({ event: 'stream_started', sampleId: options.sampleId, attempt, httpStatus: response.status }));
      const stream = await readResponseStream(response.body, (token) => {
        receivedPartial = true;
        options.onToken?.(token);
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      options.onLog(createStructuredLog({ event: 'generation_completed', sampleId: options.sampleId, attempt, httpStatus: response.status, latencyMs }));
      return { text: stream.text, attempts: attempt, latencyMs, httpStatus: response.status, status: 'completed' };
    } catch (error) {
      const timedOut = controller.signal.aborted && !options.signal?.aborted;
      if (options.signal?.aborted || isAbortError(error) && !timedOut) {
        options.onLog(createStructuredLog({ event: 'request_cancelled', sampleId: options.sampleId, attempt, level: 'warn', latencyMs: Math.round(performance.now() - attemptStarted) }));
        throw new DOMException('Geração cancelada.', 'AbortError');
      }
      if (timedOut) options.onLog(createStructuredLog({ event: 'request_timeout', sampleId: options.sampleId, attempt, level: 'warn' }));
      const retryable = !receivedPartial && (timedOut || error instanceof TypeError || error instanceof SandboxRequestError && isRetryableStatus(error.status));
      if (retryable && attempt < options.maxAttempts) {
        const retryAfter = error instanceof SandboxRequestError ? error.retryAfterMs : undefined;
        const delay = Math.min(8_000, (retryAfter ?? 500 * 2 ** (attempt - 1)) + Math.round(random() * 250));
        options.onLog(createStructuredLog({ event: 'retry_scheduled', sampleId: options.sampleId, attempt, level: 'warn', message: `Nova tentativa em ${delay} ms.` }));
        await sleep(delay);
        continue;
      }
      const latencyMs = Math.round(performance.now() - startedAt);
      options.onLog(createStructuredLog({ event: 'generation_failed', sampleId: options.sampleId, attempt, level: 'error', httpStatus: error instanceof SandboxRequestError ? error.status : undefined, latencyMs, errorType: timedOut ? 'timeout' : 'request_error', message: error instanceof Error ? error.message : 'Falha na geração.' }));
      throw error;
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', abortExternal);
    }
  }
  throw new Error(`Falha na geração${lastStatus ? ` (HTTP ${lastStatus})` : ''}.`);
}
