import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Loader2 } from 'lucide-react';
import { Referencias } from './Referencias';
import { getBackendBaseUrl } from '../backend';
import { readNdjsonStream, type StreamEvent } from '../streaming';
import { useUserProfile } from '../user-profile/UserProfileContext';

const templateCssUrl = new URL('../Template/template.css', import.meta.url).href;
const logoUrl = new URL('../../assets/LogoSB100-semfundo.png', import.meta.url).href;
const iconUrl = new URL('../../assets/IconeSB100-semfundo.png', import.meta.url).href;

interface Chunk {
  id: string;
  score: number;
  file: string;
  chunk_index: number;
  preview: string;
}

interface EvaluationResult {
  pergunta: string;
  resposta: string;
  ground_truth: string;
  referencias: string[];
  hallucination_flag?: number;
  chunks: Chunk[];
}

const normalizeChunks = (raw: unknown): Chunk[] =>
  Array.isArray(raw)
    ? raw.map((value: unknown) => {
        const chunk =
          typeof value === 'object' && value !== null
            ? (value as Record<string, unknown>)
            : {};
        return {
          id: String(chunk.id ?? `${Date.now()}-${Math.random()}`),
          score: Number(chunk.score ?? 0),
          file: String(chunk.file ?? 'Desconhecido'),
          chunk_index: Number(chunk.chunk_index ?? 0),
          preview: String(chunk.preview ?? ''),
        };
      })
    : [];

const normalizeReferencias = (event: StreamEvent): string[] => {
  const raw =
    event.referencias_principais ??
    event.refs_principais ??
    event.referencias ??
    [];
  return Array.isArray(raw)
    ? raw.map((ref: unknown) => String(ref))
    : typeof raw === 'string'
      ? raw.split(/;|\n|\|/).map((ref) => ref.trim()).filter(Boolean)
      : [];
};

const renderReportMarkdown = (markdown: string): string =>
  renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="report-md-paragraph">{children}</p>,
        h1: ({ children }) => <h1 className="report-md-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="report-md-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="report-md-h3">{children}</h3>,
        ul: ({ children }) => <ul className="report-md-ul">{children}</ul>,
        ol: ({ children }) => <ol className="report-md-ol">{children}</ol>,
        li: ({ children }) => <li className="report-md-li">{children}</li>,
        strong: ({ children }) => <strong className="report-md-strong">{children}</strong>,
        em: ({ children }) => <em className="report-md-em">{children}</em>,
        hr: () => <hr className="report-md-hr" />,
        code: ({ children }) => <code className="report-md-code">{children}</code>,
        pre: ({ children }) => <pre className="report-md-pre">{children}</pre>,
        table: ({ children }) => (
          <div className="report-md-table-wrapper">
            <table className="report-md-table">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="report-md-thead">{children}</thead>,
        tr: ({ children }) => <tr className="report-md-tr">{children}</tr>,
        th: ({ children }) => <th className="report-md-th">{children}</th>,
        td: ({ children }) => <td className="report-md-td">{children}</td>,
        blockquote: ({ children }) => (
          <blockquote className="report-md-blockquote">{children}</blockquote>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>,
  );

export default function EvaluatorChat() {
  const { profileRecord } = useUserProfile();
  const [perguntas, setPerguntas] = useState('');
  const [groundTruths, setGroundTruths] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const handleProcess = async () => {
    const perguntasArray = perguntas.split(';').filter(p => p.trim());
    const groundTruthsArray = groundTruths.split(';').filter(gt => gt.trim());

    if (perguntasArray.length !== groundTruthsArray.length) {
      alert('Número de perguntas deve ser igual ao número de ground truths.');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    const apiBaseUrl = await getBackendBaseUrl();
    const apiUrl = `${apiBaseUrl.replace(/\/$/, '')}/perguntar/avaliador/stream`;

    for (let i = 0; i < perguntasArray.length; i++) {
      const pergunta = perguntasArray[i];
      const groundTruth = groundTruthsArray[i];
      const upsertResult = (patch: Partial<EvaluationResult>) =>
        setResults((prev) => {
          const next = [...prev];
          const base: EvaluationResult = next[i] ?? {
            pergunta,
            resposta: '',
            ground_truth: groundTruth,
            referencias: [],
            chunks: [],
          };
          next[i] = { ...base, ...patch };
          return next;
        });

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pergunta,
            ground_truth: groundTruth,
            profile: profileRecord?.profile ?? 'visitante',
          })
        });

        if (!response.ok) {
          throw new Error(`API retornou ${response.status}`);
        }

        if (!response.body) {
          throw new Error('A API não retornou um stream.');
        }

        let resposta = '';
        const estado = { erro: null as string | null };

        await readNdjsonStream(response.body, (event) => {
          if (event.tipo === 'token') {
            resposta += String(event.conteudo ?? '');
            upsertResult({ resposta });
          } else if (event.tipo === 'metadata') {
            upsertResult({
              resposta: resposta || 'Sem resposta disponível.',
              referencias: normalizeReferencias(event),
              chunks: normalizeChunks(event.chunks),
              hallucination_flag:
                event.hallucination_flag != null
                  ? Number(event.hallucination_flag)
                  : undefined,
            });
          } else if (event.tipo === 'erro') {
            estado.erro = String(event.mensagem ?? 'Erro desconhecido');
          }
        });

        if (estado.erro !== null) {
          throw new Error(estado.erro);
        }
        if (!resposta) {
          upsertResult({ resposta: 'Sem resposta disponível.' });
        }
      } catch (error: unknown) {
        console.error('Erro ao processar pergunta.');
        upsertResult({
          resposta: `Erro: ${error instanceof Error ? error.message : String(error)}`,
          referencias: [],
          chunks: [],
          hallucination_flag: undefined,
        });
      }
    }

    setIsProcessing(false);
  };

  const exportReportToPdf = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      alert('Não foi possível abrir janela de impressão.');
      return;
    }

    const reportHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${templateCssUrl}" />
  <title>Relatório Avaliador</title>
</head>
<body>
  <div class="page" id="relatorio">
    <section class="header">
      <img src="${logoUrl}" alt="Logo SB100" class="logo" />
      <div class="vertical_line"></div>
      <div class="agente_description">
        <p class="title_desc">Agente SB100</p>
        <p class="text_desc">Assistente Científico</p>
      </div>
    </section>
    <div class="pai_title">
      <div class="container_title">Relatório Avaliador</div>
    </div>
    <section class="content" id="content">
      ${results.map((result, index) => `
        <div class="avaliacao">
          <div class="avaliacao_container">
            <p class="title_avaliacao">Avaliação</p>
            <div class="number_avaliacao"><p>${index + 1}</p></div>
          </div>
          <div class="pergunta_container">
            <div class="pergunta">Pergunta</div>
            <div class="pergunta_user">${result.pergunta}</div>
            ${result.hallucination_flag === 0 ? '<div class="container_flag_not_alucination"><p>Sem possível alucinação</p></div>' : '<div class="container_flag_alucination"><p>Com possível alucinação</p></div>'}
          </div>
          <div class="container_resposta">
            <div class="resposta_model">
              <div class="title_resposta">Resposta SB100</div>
              <div class="report-markdown">${renderReportMarkdown(result.resposta)}</div>
            </div>
            <div class="resposta_esperada">
              <div class="title_esperada">Resposta Esperada</div>
              <p>${result.ground_truth || '—'}</p>
            </div>
          </div>
          <div class="refs">
            <div class="pai_refs">
              <div class="header_refs">
                <div class="title_refs">Referências Principais</div>
                <div class="numbers_refs">${result.referencias.length}</div>
              </div>
              ${result.referencias.map((ref, i) => `
                <div class="desc_refs">
                  <div>${i + 1}</div>
                  <p>${ref}</p>
                </div>
              `).join('')}
            </div>
            <div class="space"></div>
          </div>
        </div>
      `).join('')}
    </section>
    <img class="icone_footer" src="${iconUrl}" alt="Logo SB100" />
  </div>
</body>
</html>`;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Avaliação em Lote</h1>
          <p className="text-slate-600">Cole suas perguntas e respostas esperadas para avaliação automática</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Perguntas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={perguntas}
                onChange={(e) => setPerguntas(e.target.value)}
                placeholder="Digite cada pergunta separada por ponto-e-vírgula (;)"
                rows={10}
                className="w-full resize-none focus-visible:ring-1 focus-visible:ring-green-900/10 focus-visible:border-green-700"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Respostas Esperadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={groundTruths}
                onChange={(e) => setGroundTruths(e.target.value)}
                placeholder="Digite cada resposta esperada separada por ponto-e-vírgula (;)"
                rows={10}
                className="w-full resize-none focus-visible:ring-1 focus-visible:ring-green-900/10 focus-visible:border-green-700"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleProcess} disabled={isProcessing} className="px-8 py-3 bg-emerald-600 text-white hover:bg-emerald-700">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Iniciar Avaliação'
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Button
                onClick={exportReportToPdf}
                className="px-8 py-3 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Exportar PDF
              </Button>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 text-center">Resultados da Avaliação</h2>
            {results.map((result, index) => (
              <Card key={index} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Avaliação {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">Pergunta</Badge>
                    <p className="text-slate-900">{result.pergunta}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Badge variant="outline" className="mb-2">Resposta Gerada</Badge>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <div className="text-slate-800 leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-4 last:mb-0 leading-7">{children}</p>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-2xl font-bold text-emerald-900 mb-4 mt-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xl font-bold text-emerald-900 mb-3 mt-5">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-lg font-semibold text-emerald-800 mb-2 mt-4">
                                  {children}
                                </h3>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
                              ),
                              li: ({ children }) => <li className="leading-7">{children}</li>,
                              strong: ({ children }) => (
                                <strong className="font-semibold text-gray-900">{children}</strong>
                              ),
                              em: ({ children }) => <em className="italic">{children}</em>,
                              hr: () => <hr className="my-5 border-gray-200" />,
                              code: ({ children }) => (
                                <code className="bg-gray-100 text-emerald-800 px-1.5 py-0.5 rounded text-sm font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto mb-4 text-sm">
                                  {children}
                                </pre>
                              ),
                              table: ({ children }) => (
                                <div className="w-full overflow-x-auto mb-5 rounded-xl border border-gray-200">
                                  <table className="w-full min-w-[500px] border-collapse text-sm">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-emerald-50">{children}</thead>
                              ),
                              tr: ({ children }) => (
                                <tr className="border-b border-gray-200 last:border-b-0">
                                  {children}
                                </tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-4 py-3 text-left font-semibold text-emerald-900 border-r border-gray-200 last:border-r-0">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-4 py-3 text-gray-700 border-r border-gray-200 last:border-r-0">
                                  {children}
                                </td>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-emerald-500 pl-4 my-4 text-gray-600 italic">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {result.resposta}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">Resposta Esperada</Badge>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <p className="text-slate-800">{result.ground_truth}</p>
                      </div>
                    </div>
                  </div>
                  {result.hallucination_flag !== undefined && (
                    <div className="mt-4">
                      <Badge
                        className={result.hallucination_flag === 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-rose-100 text-rose-900 border-rose-200'}
                      >
                        {result.hallucination_flag === 0 ? 'Sem possível alucinação' : 'Com possível alucinação'}
                      </Badge>
                    </div>
                  )}
                  {result.referencias.length > 0 && (
                    <div>
                      <Separator />
                      <Referencias referencias={result.referencias} />
                    </div>
                  )}
                  {result.chunks.length > 0 && (
                    <>
                      <Separator />
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium">Chunks ({result.chunks.length})</summary>
                        <div className="mt-2 space-y-2">
                          {result.chunks.map((chunk, i) => (
                            <div key={i} className="border rounded p-3 bg-slate-50">
                              <p className="text-sm"><strong>Arquivo:</strong> {chunk.file}</p>
                              <p className="text-sm"><strong>Score:</strong> {chunk.score}</p>
                              <p className="text-sm mt-2">{chunk.preview}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}