export const USER_PROFILES = [
  'produtor_rural',
  'cooperativa',
  'empresa',
  'pesquisador_universitario',
  'tecnico',
  'instituicao_publica',
  'visitante',
] as const;

export type UserProfile = (typeof USER_PROFILES)[number];
export type ClassificationMethod = 'decision_tree' | 'visitor';

export interface UserProfileRecord {
  version: 1;
  profile: UserProfile;
  classifiedAt: string;
  classificationMethod: ClassificationMethod;
}

export const USER_PROFILE_LABELS: Record<UserProfile, string> = {
  produtor_rural: 'Produtor rural',
  cooperativa: 'Cooperativa',
  empresa: 'Empresa',
  pesquisador_universitario: 'Pesquisador/universitário',
  tecnico: 'Técnico',
  instituicao_publica: 'Instituição pública',
  visitante: 'Visitante',
};

export function isUserProfile(value: unknown): value is UserProfile {
  return typeof value === 'string' && USER_PROFILES.some((profile) => profile === value);
}

