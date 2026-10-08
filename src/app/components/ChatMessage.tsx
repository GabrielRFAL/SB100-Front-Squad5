import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Referencias } from './Referencias';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { Badge } from './ui/badge';

interface Chunk {
  id: string;
  file: string;
  score: number;
  chunk_index: number;
  preview: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  chunks?: Chunk[];
  referencias_principais?: string[];
  hallucination_flag?: number;
}

const truncatePreview = (preview: string, maxLength = 120) => {
  return preview.length > maxLength
    ? `${preview.slice(0, maxLength).trim()}...`
    : preview;
};

export function ChatMessage({
  message,
  isUser,
  chunks,
  referencias_principais,
  hallucination_flag
}: ChatMessageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end mb-8">
        <div className="max-w-2xl">
          <div className="bg-[#059669] text-white px-6 py-4 rounded-3xl rounded-tr-md">
            <p className="leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white border border-gray-200 px-6 py-4 rounded-3xl rounded-tl-md shadow-sm">

          {/* RESPOSTA DO AGENTE */}
          <div className="text-gray-800 leading-relaxed">

            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                /* PARÁGRAFOS */
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0 leading-7">
                    {children}
                  </p>
                ),

                /* TÍTULO 1 */
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-emerald-900 mb-4 mt-2">
                    {children}
                  </h1>
                ),

                /* TÍTULO 2 */
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-emerald-900 mb-3 mt-5">
                    {children}
                  </h2>
                ),

                /* TÍTULO 3 */
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-emerald-800 mb-2 mt-4">
                    {children}
                  </h3>
                ),

                /* LISTA NÃO ORDENADA */
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1">
                    {children}
                  </ul>
                ),

                /* LISTA ORDENADA */
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-1">
                    {children}
                  </ol>
                ),

                /* ITEM DE LISTA */
                li: ({ children }) => (
                  <li className="leading-7">
                    {children}
                  </li>
                ),

                /* TEXTO EM NEGRITO */
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),

                /* TEXTO EM ITÁLICO */
                em: ({ children }) => (
                  <em className="italic">
                    {children}
                  </em>
                ),

                /* LINHA HORIZONTAL */
                hr: () => (
                  <hr className="my-5 border-gray-200" />
                ),

                /* CÓDIGO INLINE */
                code: ({ children }) => (
                  <code className="bg-gray-100 text-emerald-800 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),

                /* BLOCO DE CÓDIGO */
                pre: ({ children }) => (
                  <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto mb-4 text-sm">
                    {children}
                  </pre>
                ),

                /* TABELA */
                table: ({ children }) => (
                  <div className="w-full overflow-x-auto mb-5 rounded-xl border border-gray-200">
                    <table className="w-full min-w-[500px] border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),

                /* CABEÇALHO DA TABELA */
                thead: ({ children }) => (
                  <thead className="bg-emerald-50">
                    {children}
                  </thead>
                ),

                /* LINHA DA TABELA */
                tr: ({ children }) => (
                  <tr className="border-b border-gray-200 last:border-b-0">
                    {children}
                  </tr>
                ),

                /* CÉLULA DO CABEÇALHO */
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left font-semibold text-emerald-900 border-r border-gray-200 last:border-r-0">
                    {children}
                  </th>
                ),

                /* CÉLULA NORMAL */
                td: ({ children }) => (
                  <td className="px-4 py-3 text-gray-700 border-r border-gray-200 last:border-r-0">
                    {children}
                  </td>
                ),

                /* QUOTE */
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-emerald-500 pl-4 my-4 text-gray-600 italic">
                    {children}
                  </blockquote>
                )
              }}
            >
              {message}
            </ReactMarkdown>

          </div>

          {/* INDICADOR DE ALUCINAÇÃO */}
          {hallucination_flag !== undefined && (
            <div className="mt-4">
              <Badge
                className={
                  hallucination_flag === 0
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : 'bg-rose-100 text-rose-900 border-rose-200'
                }
              >
                {hallucination_flag === 0
                  ? 'Sem possível alucinação'
                  : 'Possível alucinação'}
              </Badge>
            </div>
          )}
        </div>

        {/* REFERÊNCIAS PRINCIPAIS */}
        {referencias_principais &&
          referencias_principais.length > 0 && (
            <Referencias referencias={referencias_principais} />
          )}

        {/* CHUNKS */}
        {chunks && chunks.length > 0 && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          >
            <DialogTrigger asChild>
              <button
                className="mt-3 ml-6 px-4 py-1.5 text-sm bg-[#059669] text-white rounded-full hover:bg-[#047857] transition-colors"
              >
                Referências
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col bg-white border border-slate-200 shadow-lg">

              <DialogHeader className="text-left flex-shrink-0">
                <DialogTitle className="text-emerald-900">
                  Referências
                </DialogTitle>

                <DialogDescription className="text-slate-500">
                  Trechos usados na resposta.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto mt-6">
                <div className="space-y-4 pr-2">

                  {chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >

                      <div className="flex items-center justify-between mb-3">

                        <span className="text-sm text-slate-600">
                          Chunk index: {chunk.chunk_index}
                        </span>

                        <div className="flex items-center gap-3">

                          <span className="text-sm font-semibold text-slate-900">
                            Score: {chunk.score.toFixed(2)}
                          </span>

                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  chunk.score * 100,
                                  100
                                )}%`
                              }}
                            />
                          </div>

                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-slate-700">
                        {truncatePreview(chunk.preview, 250)}
                      </p>

                      <p className="text-xs text-slate-500 mt-3">
                        {chunk.file}
                      </p>

                    </div>
                  ))}

                </div>
              </div>

              <DialogClose asChild>
                <button className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 flex-shrink-0">
                  Fechar
                </button>
              </DialogClose>

            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}