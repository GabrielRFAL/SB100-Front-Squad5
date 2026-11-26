import { useMemo, useRef, useState } from 'react';
import { getBackendBaseUrl } from '../backend';
import { USER_PROFILE_LABELS, USER_PROFILES, type UserProfile } from '../user-profile/types';
import { buildSandboxRequest, SANDBOX_DEFAULTS, validateSandboxConfig } from './config';
import { runSandboxGeneration } from './client';
import type { SandboxLogEvent } from './logging';

interface Sample {
  id: string;
  question: string;
  response: string;
  profile: UserProfile;
  temperature: number;
  startedAt: string;
  latencyMs?: number;
  attempts: number;
  status: 'completed' | 'failed' | 'cancelled';
  httpStatus?: number;
  logs: SandboxLogEvent[];
}

const statusLabels: Record<Sample['status'], string> = { completed: 'Concluída', failed: 'Falhou', cancelled: 'Cancelada' };

function newSampleId() {
  return `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadLogs(logs: SandboxLogEvent[], sampleId: string) {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${sampleId}-logs.json`;
  link.click();
  URL.revokeObjectURL(href);
}

export default function SandboxApp() {
  const [question, setQuestion] = useState('Quais os benefícios da rotação de culturas?');
  const [profile, setProfile] = useState<UserProfile>('visitante');
  const [temperature, setTemperature] = useState<number>(SANDBOX_DEFAULTS.temperature);
  const [timeoutMs, setTimeoutMs] = useState<number>(SANDBOX_DEFAULTS.timeoutMs);
  const [maxAttempts, setMaxAttempts] = useState<number>(SANDBOX_DEFAULTS.maxAttempts);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<Sample['status'] | 'idle' | 'running'>('idle');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<SandboxLogEvent[]>([]);
  const [history, setHistory] = useState<Sample[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = useMemo(() => history.find((item) => item.id === selectedId) ?? null, [history, selectedId]);
  const shownResponse = selected?.response ?? response;
  const shownLogs = selected?.logs ?? logs;
  const isGenerating = status === 'running';

  async function handleGenerate() {
    const validation = validateSandboxConfig({ temperature, timeoutMs, maxAttempts });
    if (validation || !question.trim()) {
      setError(validation ?? 'Digite uma pergunta para iniciar a geração.');
      return;
    }
    const sampleId = newSampleId();
    const startedAt = new Date().toISOString();
    const controller = new AbortController();
    abortRef.current = controller;
    setSelectedId(null);
    setError('');
    setResponse('');
    setLogs([]);
    setStatus('running');
    const sampleLogs: SandboxLogEvent[] = [];
    const appendLog = (event: SandboxLogEvent) => {
      sampleLogs.push(event);
      setLogs([...sampleLogs]);
    };
    try {
      // Mantém o sandbox alinhado ao mesmo resolvedor usado pelo chat principal.
      // Em produção, localhost apontaria para o computador do usuário, não para o backend.
      const baseUrl = await getBackendBaseUrl();
      const result = await runSandboxGeneration({
        baseUrl,
        request: buildSandboxRequest({ pergunta: question, profile, temperature }),
        sampleId,
        timeoutMs,
        maxAttempts,
        signal: controller.signal,
        onToken: (token) => setResponse((current) => current + token),
        onLog: appendLog,
      });
      const item: Sample = { id: sampleId, question, response: result.text, profile, temperature, startedAt, latencyMs: result.latencyMs, attempts: result.attempts, status: 'completed', httpStatus: result.httpStatus, logs: sampleLogs };
      setHistory((current) => [item, ...current]);
      setStatus('completed');
    } catch (generationError) {
      const cancelled = generationError instanceof DOMException && generationError.name === 'AbortError';
      const item: Sample = { id: sampleId, question, response, profile, temperature, startedAt, attempts: sampleLogs.filter((item) => item.event === 'request_sent').length, status: cancelled ? 'cancelled' : 'failed', logs: sampleLogs };
      setHistory((current) => [item, ...current]);
      setStatus(cancelled ? 'cancelled' : 'failed');
      setError(cancelled ? 'A geração foi cancelada. O texto parcial foi preservado.' : 'Não foi possível concluir a geração. Consulte os logs para diagnóstico.');
    } finally {
      abortRef.current = null;
    }
  }

  function handleCancel() { abortRef.current?.abort(); }

  function selectSample(sample: Sample) {
    setSelectedId(sample.id);
    setQuestion(sample.question);
    setProfile(sample.profile);
    setTemperature(sample.temperature);
    setResponse(sample.response);
    setLogs(sample.logs);
    setStatus(sample.status);
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">SB100 · Developer tool</p><h1 className="mt-2 text-2xl font-semibold">Sandbox de geração</h1><p className="mt-1 text-sm text-slate-400">Interface independente para experimentos rastreáveis com a API.</p></div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">Acesso de desenvolvimento</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)_330px] lg:px-8">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Configuração</h2>
            <label className="mt-5 block text-sm font-medium text-slate-200" htmlFor="sandbox-question">Pergunta</label>
            <textarea id="sandbox-question" value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" />
            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="sandbox-profile">Perfil</label>
            <select id="sandbox-profile" value={profile} onChange={(event) => setProfile(event.target.value as UserProfile)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-emerald-500">{USER_PROFILES.map((item) => <option key={item} value={item}>{USER_PROFILE_LABELS[item]}</option>)}</select>
            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="sandbox-temperature">Temperature <span className="text-emerald-400">{temperature.toFixed(2)}</span></label>
            <input id="sandbox-temperature" type="range" min="0" max="2" step="0.05" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-3 w-full accent-emerald-500" />
            <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm text-slate-300" htmlFor="sandbox-timeout">Timeout (ms)<input id="sandbox-timeout" type="number" min="1000" max="120000" step="1000" value={timeoutMs} onChange={(event) => setTimeoutMs(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100" /></label><label className="text-sm text-slate-300" htmlFor="sandbox-attempts">Tentativas<input id="sandbox-attempts" type="number" min="1" max="5" value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100" /></label></div>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400"><p><span className="font-semibold text-slate-200">top_p:</span> não suportado · não enviado</p><p><span className="font-semibold text-slate-200">top_k:</span> recuperação RAG declarada como 20 · não editável e não enviado</p></div>
            <div className="mt-5 flex gap-2"><button type="button" disabled={isGenerating} onClick={handleGenerate} className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">Gerar resposta</button><button type="button" disabled={!isGenerating} onClick={handleCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Cancelar</button></div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Histórico da sessão</h2>{history.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nenhuma amostra ainda. O histórico não é persistido.</p> : <div className="mt-4 space-y-2">{history.map((item) => <button type="button" key={item.id} onClick={() => selectSample(item)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === item.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-600'}`}><span className="block truncate text-slate-200">{item.question}</span><span className="mt-1 block text-xs text-slate-500">{statusLabels[item.status]} · T {item.temperature.toFixed(2)}</span></button>)}</div>}<button type="button" disabled={history.length === 0} onClick={() => { setHistory([]); setSelectedId(null); }} className="mt-4 text-xs font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-40">Limpar histórico</button></section>
        </aside>
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resposta</p><h2 className="mt-2 text-xl font-semibold">Saída do modelo</h2></div><span role="status" className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : status === 'failed' ? 'bg-rose-500/15 text-rose-300' : status === 'running' ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>{status === 'idle' ? 'Aguardando' : status === 'running' ? 'Gerando…' : statusLabels[status]}</span></div>{isGenerating && <p className="mt-5 text-sm text-blue-300" aria-live="polite">Recebendo tokens em streaming…</p>}{error && <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert">{error}</div>}<div className="mt-5 min-h-[360px] whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-5 text-[15px] leading-7 text-slate-200">{shownResponse || <span className="text-slate-600">A resposta aparecerá aqui conforme os tokens forem recebidos.</span>}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!shownResponse} onClick={() => void navigator.clipboard?.writeText(shownResponse)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40">Copiar resposta</button></div></section>
        <aside className="space-y-5"><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Metadados</h2>{selected && <span className="text-xs text-slate-500">amostra selecionada</span>}</div><dl className="mt-4 space-y-3 text-sm"><Meta label="Sample ID" value={selected?.id ?? '—'} mono /><Meta label="Modelo" value="llama3.1:8b · declarado" /><Meta label="Temperature enviada" value={selected ? selected.temperature.toFixed(2) : temperature.toFixed(2)} /><Meta label="Tentativas" value={String(selected?.attempts ?? '—')} /><Meta label="Latência" value={selected?.latencyMs ? `${selected.latencyMs} ms` : '—'} /><Meta label="HTTP status" value={String(selected?.httpStatus ?? '—')} /><Meta label="Parâmetros não suportados" value="top_p; top_k editável" /></dl></section><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Logs JSON</h2><button type="button" disabled={shownLogs.length === 0} onClick={() => downloadLogs(shownLogs, selected?.id ?? 'sandbox')} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-40">Exportar</button></div><div className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-400">{shownLogs.length ? shownLogs.map((log, index) => <pre key={`${log.timestamp}-${index}`} className="mb-3 whitespace-pre-wrap">{JSON.stringify(log, null, 2)}</pre>) : <p>Os eventos da execução aparecerão aqui.</p>}</div></section></aside>
      </main>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className={`mt-1 break-words text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div>; }
