export type StreamEvent = { tipo?: string; [key: string]: unknown };

export async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    if (!line.trim()) return;

    let parsed: StreamEvent;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      console.warn('Linha inválida no stream, ignorada:', error);
      return;
    }

    onEvent(parsed);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split('\n');
    buffer = linhas.pop() ?? '';
    for (const linha of linhas) handleLine(linha);
  }

  buffer += decoder.decode();
  handleLine(buffer);
}
