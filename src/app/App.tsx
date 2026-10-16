import { useEffect, useState } from "react";

import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import EvaluatorChat from "./components/EvaluatorChat";
import { getBackendBaseUrl } from "./backend";
import { useUserProfile } from "./user-profile/UserProfileContext";
import { USER_PROFILE_LABELS } from "./user-profile/types";

interface Chunk {
  id: string;
  score: number;
  file: string;
  chunk_index: number;
  preview: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  chunks?: Chunk[];
  referencias_principais?: string[];
  hallucination_flag?: number;
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Olá! Sou o Agente SB100, seu assistente científico. Como posso ajudá-lo hoje?",
    isUser: false,
  },
];

export default function App() {
  const { profileRecord, openProfileClassification } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "avaliador">("chat");

  useEffect(() => {
    let active = true;

    getBackendBaseUrl().then((url) => {
      if (active) {
        setBackendUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const agentMessageId = (Date.now() + 1).toString();

    try {
      const apiBaseUrl = backendUrl ?? (await getBackendBaseUrl());

      const apiUrl = `${apiBaseUrl.replace(/\/$/, "")}/perguntar/stream`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pergunta: text,
          profile: profileRecord?.profile ?? "visitante",
        }),
      });

      if (!response.ok) {
        const textBody = await response.text();

        throw new Error(
          `API retornou ${response.status}: ${textBody}`,
        );
      }

      if (!response.body) {
        throw new Error("A API não retornou um stream.");
      }

      // Cria a mensagem do agente antes de começar o streaming
      setMessages((prev) => [
        ...prev,
        {
          id: agentMessageId,
          text: "",
          isUser: false,
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let resposta = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        // Processa cada linha NDJSON
        const linhas = buffer.split("\n");

        // Mantém a última linha caso ela esteja incompleta
        buffer = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.trim()) {
            continue;
          }

          try {
            const data = JSON.parse(linha);

            // ==============================
            // TOKEN DA RESPOSTA
            // ==============================
            if (data.tipo === "token") {
              resposta += String(data.conteudo ?? "");

              setMessages((prev) =>
                prev.map((message) =>
                  message.id === agentMessageId
                    ? {
                        ...message,
                        text: resposta,
                      }
                    : message,
                ),
              );
            }

            // ==============================
            // METADADOS FINAIS
            // ==============================
            if (data.tipo === "metadata") {
              const chunks: Chunk[] = Array.isArray(data.chunks)
                ? data.chunks.map((chunk: any) => ({
                    id: String(
                      chunk.id ??
                        `${Date.now()}-${Math.random()}`,
                    ),
                    score: Number(chunk.score ?? 0),
                    file: String(
                      chunk.file ?? "Desconhecido",
                    ),
                    chunk_index: Number(
                      chunk.chunk_index ?? 0,
                    ),
                    preview: String(chunk.preview ?? ""),
                  }))
                : [];

              const referencias: string[] =
                Array.isArray(data.referencias_principais)
                  ? data.referencias_principais.map(
                      (ref: any) => String(ref),
                    )
                  : [];

              const hallucinationFlag =
                data.hallucination_flag != null
                  ? Number(data.hallucination_flag)
                  : undefined;

              setMessages((prev) =>
                prev.map((message) =>
                  message.id === agentMessageId
                    ? {
                        ...message,
                        text:
                          resposta ||
                          "Sem resposta disponível.",
                        chunks:
                          chunks.length > 0
                            ? chunks
                            : undefined,
                        referencias_principais:
                          referencias.length > 0
                            ? referencias
                            : undefined,
                        hallucination_flag:
                          hallucinationFlag,
                      }
                    : message,
                ),
              );
            }
          } catch (error) {
            console.warn(
              "Erro ao interpretar linha do stream:",
              linha,
              error,
            );
          }
        }
      }

      // Finaliza possíveis bytes restantes
      buffer += decoder.decode();

      // Processa a última linha, se existir
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);

          if (data.tipo === "token") {
            resposta += String(data.conteudo ?? "");

            setMessages((prev) =>
              prev.map((message) =>
                message.id === agentMessageId
                  ? {
                      ...message,
                      text:
                        resposta ||
                        "Sem resposta disponível.",
                    }
                  : message,
              ),
            );
          }

          if (data.tipo === "metadata") {
            const chunks: Chunk[] = Array.isArray(data.chunks)
              ? data.chunks.map((chunk: any) => ({
                  id: String(
                    chunk.id ??
                      `${Date.now()}-${Math.random()}`,
                  ),
                  score: Number(chunk.score ?? 0),
                  file: String(
                    chunk.file ?? "Desconhecido",
                  ),
                  chunk_index: Number(
                    chunk.chunk_index ?? 0,
                  ),
                  preview: String(chunk.preview ?? ""),
                }))
              : [];

            const referencias: string[] =
              Array.isArray(data.referencias_principais)
                ? data.referencias_principais.map(
                    (ref: any) => String(ref),
                  )
                : [];

            const hallucinationFlag =
              data.hallucination_flag != null
                ? Number(data.hallucination_flag)
                : undefined;

            setMessages((prev) =>
              prev.map((message) =>
                message.id === agentMessageId
                  ? {
                      ...message,
                      text:
                        resposta ||
                        "Sem resposta disponível.",
                      chunks:
                        chunks.length > 0
                          ? chunks
                          : undefined,
                      referencias_principais:
                        referencias.length > 0
                          ? referencias
                          : undefined,
                      hallucination_flag:
                        hallucinationFlag,
                    }
                  : message,
              ),
            );
          }
        } catch (error) {
          console.warn(
            "Erro ao interpretar última linha do stream:",
            buffer,
            error,
          );
        }
      }

      // Garante que a resposta final não fique vazia
      setMessages((prev) =>
        prev.map((message) =>
          message.id === agentMessageId
            ? {
                ...message,
                text:
                  resposta ||
                  "Sem resposta disponível.",
              }
            : message,
        ),
      );
    } catch (error: any) {
      // Se a mensagem do agente já foi criada,
      // substitui o conteúdo dela pelo erro.
      setMessages((prev) => {
        const messageExists = prev.some(
          (message) => message.id === agentMessageId,
        );

        if (messageExists) {
          return prev.map((message) =>
            message.id === agentMessageId
              ? {
                  ...message,
                  text: `Erro ao conectar: ${
                    error?.message ??
                    "Erro desconhecido"
                  }`,
                }
              : message,
          );
        }

        return [
          ...prev,
          {
            id: agentMessageId,
            text: `Erro ao conectar: ${
              error?.message ??
              "Erro desconhecido"
            }`,
            isUser: false,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ChatHeader isLoading={isLoading} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <aside className="order-2 w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:order-1 lg:w-72">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Modo
            </p>

            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Navegação
            </h2>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition ${
                activeTab === "chat"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Chat padrão
            </button>

            <button
              onClick={() => setActiveTab("avaliador")}
              className={`w-full rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition ${
                activeTab === "avaliador"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Chat avaliador
            </button>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meu perfil</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {profileRecord ? USER_PROFILE_LABELS[profileRecord.profile] : 'Não classificado'}
            </p>
            <button
              type="button"
              onClick={openProfileClassification}
              className="mt-3 min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Alterar meu perfil
            </button>
          </div>
        </aside>

        <main className="order-1 w-full lg:order-2 lg:min-w-0">
          {activeTab === "chat" ? (
            <div className="flex h-[calc(100vh-152px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      chunks={message.chunks}
                      referencias_principais={
                        message.referencias_principais
                      }
                      hallucination_flag={
                        message.hallucination_flag
                      }
                    />
                  ))}

                  {isLoading && (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-slate-500">
                        Agente SB100 está pensando...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 p-5">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-152px)] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EvaluatorChat />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}