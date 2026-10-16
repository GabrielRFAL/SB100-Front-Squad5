import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Loader2 } from 'lucide-react';
import { Referencias } from './Referencias';
import { getBackendBaseUrl } from '../backend';
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
    const apiUrl = `${apiBaseUrl.replace(/\/$/, '')}/perguntar`;

    // Processar sequencialmente para progressivo
    for (let i = 0; i < perguntasArray.length; i++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            perguntas: [perguntasArray[i]],
            ground_truths: [groundTruthsArray[i]],
            profile: profileRecord?.profile ?? 'visitante',
          })
        });

        if (!response.ok) {
          throw new Error(`API retornou ${response.status}`);
        }

        const data = await response.json();
        const result = data.resultados[0];

        const chunks: Chunk[] = Array.isArray(result.chunks)
          ? result.chunks.map((chunk: any) => ({
              id: String(chunk.id ?? `${Date.now()}-${Math.random()}`),
              score: Number(chunk.score ?? 0),
              file: String(chunk.file ?? 'Desconhecido'),
              chunk_index: Number(chunk.chunk_index ?? 0),
              preview: String(chunk.preview ?? '')
            }))
          : [];

        const referenciasRaw = result.referencias_principais ?? result.refs_principais ?? result.referencias ?? [];
        const referencias: string[] = Array.isArray(referenciasRaw)
          ? referenciasRaw.map((ref: any) => String(ref))
          : typeof referenciasRaw === 'string'
            ? referenciasRaw.split(/;|\n|\|/).map((ref: string) => ref.trim()).filter(Boolean)
            : [];

        const hallucinationFlag = result.hallucination_flag != null
          ? Number(result.hallucination_flag)
          : undefined;

        const evaluationResult: EvaluationResult = {
          pergunta: result.pergunta,
          resposta: result.resposta,
          ground_truth: result.ground_truth,
          referencias,
          hallucination_flag: hallucinationFlag,
          chunks
        };

        setResults(prev => [...prev, evaluationResult]);
      } catch (error: any) {
        console.error('Erro ao processar pergunta:', error);
        setResults(prev => [...prev, {
          pergunta: perguntasArray[i],
          resposta: `Erro: ${error.message}`,
          ground_truth: groundTruthsArray[i],
          referencias: [],
          chunks: []
        }]);
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
              <p>${result.resposta}</p>
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
                        <p className="text-slate-800">{result.resposta}</p>
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