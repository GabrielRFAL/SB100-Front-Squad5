export type SandboxLogLevel = 'info' | 'warn' | 'error';

export interface SandboxLogEvent {
  timestamp: string;
  level: SandboxLogLevel;
  event: string;
  sample_id: string;
  attempt?: number;
  endpoint?: string;
  http_status?: number;
  latency_ms?: number;
  error_type?: string;
  message?: string;
}

export function sanitizeLogMessage(message: string): string {
  return /authorization\s*:|bearer\s+|password\s*=|api[_-]?key\s*=/i.test(message)
    ? '[dados sensíveis omitidos]'
    : message.replace(/[\r\n]+/g, ' ').slice(0, 240);
}

export function createStructuredLog(input: {
  event: string;
  sampleId: string;
  level?: SandboxLogLevel;
  attempt?: number;
  endpoint?: string;
  httpStatus?: number;
  latencyMs?: number;
  errorType?: string;
  message?: string;
}): SandboxLogEvent {
  return {
    timestamp: new Date().toISOString(),
    level: input.level ?? 'info',
    event: input.event,
    sample_id: input.sampleId,
    ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
    ...(input.endpoint ? { endpoint: input.endpoint } : {}),
    ...(input.httpStatus === undefined ? {} : { http_status: input.httpStatus }),
    ...(input.latencyMs === undefined ? {} : { latency_ms: input.latencyMs }),
    ...(input.errorType ? { error_type: input.errorType } : {}),
    ...(input.message ? { message: sanitizeLogMessage(input.message) } : {}),
  };
}
