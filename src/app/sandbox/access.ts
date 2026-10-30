export function isSandboxEnabled(environment: { dev: boolean; flag: unknown }): boolean {
  return environment.dev || environment.flag === 'true';
}
