import type { UserProfile } from '../user-profile/types';

export const SANDBOX_DEFAULTS = {
  temperature: 0.1,
  timeoutMs: 30_000,
  maxAttempts: 3,
  ragTopK: 20,
} as const;

export interface SandboxRequest {
  pergunta: string;
  profile?: UserProfile;
  temperature: number;
}

export interface SandboxConfigInput {
  temperature: number;
  timeoutMs: number;
  maxAttempts: number;
}

export function buildSandboxRequest(input: {
  pergunta: string;
  profile?: UserProfile;
  temperature: number;
}): SandboxRequest {
  const request: SandboxRequest = {
    pergunta: input.pergunta.trim(),
    temperature: input.temperature,
  };
  if (input.profile) request.profile = input.profile;
  return request;
}

export function validateSandboxConfig(config: SandboxConfigInput): string | null {
  if (!Number.isFinite(config.temperature) || config.temperature < 0 || config.temperature > 2) {
    return 'temperature deve ser um número entre 0 e 2 (limite oficial não documentado pelo backend).';
  }
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1_000 || config.timeoutMs > 120_000) {
    return 'O timeout deve estar entre 1.000 e 120.000 ms.';
  }
  if (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1 || config.maxAttempts > 5) {
    return 'O limite de tentativas deve estar entre 1 e 5.';
  }
  return null;
}
