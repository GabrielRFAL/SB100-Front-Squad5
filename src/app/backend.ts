export async function getBackendBaseUrl(): Promise<string> {
  try {
    const response = await fetch('/backend_url.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Resposta ${response.status}`);
    }

    const data = await response.json();
    if (typeof data.backend_url === 'string' && data.backend_url.trim()) {
      return data.backend_url.trim();
    }
  } catch (error) {
    console.warn('Falha ao carregar backend_url.json, usando localhost:', error);
  }

  return 'http://localhost:8000';
}
