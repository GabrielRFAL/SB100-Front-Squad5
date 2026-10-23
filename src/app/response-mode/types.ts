export const RESPONSE_MODES = ['deterministic', 'moderate', 'creative'] as const;

export type ResponseMode = (typeof RESPONSE_MODES)[number];

export interface ResponseModeConfig {
  id: ResponseMode;
  label: string;
  description: string;
  suggestedTemperature: number;
  recommended?: boolean;
}

export const RESPONSE_MODE_CONFIG: Record<ResponseMode, ResponseModeConfig> = {
  deterministic: {
    id: 'deterministic',
    label: 'Determinístico',
    description: 'Respostas mais consistentes, objetivas e previsíveis.',
    suggestedTemperature: 0.1,
    recommended: true,
  },
  moderate: {
    id: 'moderate',
    label: 'Moderado',
    description: 'Equilíbrio entre consistência e flexibilidade.',
    suggestedTemperature: 0.5,
  },
  creative: {
    id: 'creative',
    label: 'Criativo',
    description: 'Respostas mais variadas para explorar ideias e possibilidades.',
    suggestedTemperature: 0.9,
  },
};

export function isResponseMode(value: unknown): value is ResponseMode {
  return typeof value === 'string' && RESPONSE_MODES.includes(value as ResponseMode);
}
