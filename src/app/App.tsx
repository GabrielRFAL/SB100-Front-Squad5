import { useEffect, useState } from "react";

import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import EvaluatorChat from "./components/EvaluatorChat";
import { Plus, CircleHelp, FlaskConical, History, MessageSquare } from "lucide-react";
import { getBackendBaseUrl } from "./backend";
import { useResponseMode } from "./response-mode/ResponseModeContext";
import { useUserProfile } from "./user-profile/UserProfileContext";
import { USER_PROFILE_LABELS } from "./user-profile/types";
import { readConversationHistory, writeConversationHistory, type ConversationRecord, type HistoryMessage } from "./conversation-history";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";

interface Chunk {
  id: string;
  score: number;
  file: string;
  chunk_index: number;
  preview: string;
}

type Message = HistoryMessage;

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Olá! Sou o Agente SB100, seu assistente científico. Como posso ajudá-lo hoje?",
    isUser: false,
  },
];

export default function App() {
  const { profileRecord, openProfileClassification } = useUserProfile();
  const { responseMode } = useResponseMode();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "avaliador">("chat");
  const [activeConversationId, setActiveConversationId] = useState(() => `conversation-${Date.now()}`);
  const [conversationHistory, setConversationHistory] = useState<ConversationRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    return readConversationHistory(window.localStorage);
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const suggestions = [
    "Como interpretar uma análise de solo?",
    "Qual a recomendação de calagem para citros?",
    "Qual a dose anual de boro para laranjeira?",
  ];

  const startNewConversation = () => {
    setMessages(initialMessages);
    setActiveConversationId(`conversation-${Date.now()}`);
    setActiveTab("chat");
    setIsHistoryOpen(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      writeConversationHistory(conversationHistory, window.localStorage);
    }
  }, [conversationHistory]);

  useEffect(() => {
    const userMessages = messages.filter((message) => message.isUser);
    if (userMessages.length === 0) return;

    const conversation: ConversationRecord = {
      version: 1,
      id: activeConversationId,
      title: userMessages[0].text,
      updatedAt: new Date().toISOString(),
      messages,
    };

    setConversationHistory((previous) => [
      conversation,
      ...previous.filter((item) => item.id !== activeConversationId),
    ].slice(0, 50));
  }, [activeConversationId, messages]);

  const historyQuestions = conversationHistory.flatMap((conversation) =>
    conversation.messages
      .filter((message) => message.isUser)
      .map((message) => ({ conversation, message })),
  );

  const openConversation = (conversation: ConversationRecord) => {
    setMessages(conversation.messages);
    setActiveConversationId(conversation.id);
    setActiveTab("chat");
    setIsHistoryOpen(false);
  };

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
          response_mode: responseMode,
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
        <aside className="order-2 w-full rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:order-1 lg:w-72">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Modo
            </p>

            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Navegação
            </h2>
          </div>

          <button type="button" onClick={startNewConversation} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Nova conversa</button>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition ${
                activeTab === "chat"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" aria-hidden="true" />Chat principal</span>
            </button>

            <button
              onClick={() => setActiveTab("avaliador")}
              className={`w-full rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition ${
                activeTab === "avaliador"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden="true" />Chat avaliador</span>
            </button>
            <a href="/sandbox" className="flex w-full items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><FlaskConical className="h-4 w-4" aria-hidden="true" />Sandbox experimental</a>
            <button type="button" onClick={() => setIsHistoryOpen((value) => !value)} aria-expanded={isHistoryOpen} className={`flex w-full items-center gap-2 rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${isHistoryOpen ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><History className="h-4 w-4" aria-hidden="true" />Histórico da sessão</button>
          </div>

          {isHistoryOpen && <section className="mt-4 border-t border-slate-200 pt-4" aria-labelledby="history-title">
            <div className="flex items-center justify-between gap-3"><h3 id="history-title" className="text-sm font-bold text-slate-900">Conversas anteriores</h3><span className="text-xs text-slate-500">{historyQuestions.length}</span></div>
            {historyQuestions.length === 0 ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Suas perguntas aparecerão aqui depois que você conversar com o Agente SB100.</p> : <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{historyQuestions.map(({ conversation, message }) => <button key={`${conversation.id}-${message.id}`} type="button" onClick={() => openConversation(conversation)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="line-clamp-3 block text-sm font-medium leading-relaxed text-slate-800">{message.text}</span><span className="mt-1 block text-[11px] text-slate-500">{new Date(conversation.updatedAt).toLocaleDateString('pt-BR')}</span></button>)}</div>}
          </section>}

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
            <div className="flex min-h-[calc(100vh-152px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Conversa principal</p><h2 className="mt-1 text-xl font-bold text-slate-900">Pergunte ao Agente SB100</h2><p className="mt-1 text-sm text-slate-500">Explore recomendações do Boletim 100 IAC com linguagem simples e fontes rastreáveis.</p></div><Dialog><DialogTrigger asChild><button type="button" aria-label="Ajuda sobre o SB100" title="Como usar o SB100" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><CircleHelp className="h-5 w-5" aria-hidden="true" /></button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto border-slate-200 bg-white sm:max-w-xl"><DialogHeader className="text-left"><DialogTitle className="text-emerald-900">Como usar o Agente SB100</DialogTitle><DialogDescription>Um guia rápido para fazer perguntas e interpretar as respostas.</DialogDescription></DialogHeader><div className="space-y-5 text-sm leading-relaxed text-slate-700"><section><h3 className="font-semibold text-slate-900">1. Faça uma pergunta</h3><p className="mt-1">Digite sua dúvida no campo inferior ou escolha uma das sugestões. Quanto mais contexto você fornecer, mais útil tende a ser a resposta.</p></section><section><h3 className="font-semibold text-slate-900">2. Explore a resposta</h3><p className="mt-1">O agente pode explicar recomendações do Boletim 100 IAC, ajudar a interpretar análises de solo, comparar práticas agrícolas e organizar informações técnicas.</p></section><section><h3 className="font-semibold text-slate-900">3. Continue a conversa</h3><p className="mt-1">Faça perguntas complementares para aprofundar o tema. Suas conversas ficam disponíveis no Histórico da sessão neste navegador.</p></section><section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-900">Exemplos de perguntas</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>Como interpretar uma análise de solo?</li><li>Qual a recomendação de calagem para citros?</li><li>Quais informações são necessárias para calcular a necessidade de calagem?</li></ul></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="font-semibold">Importante</h3><p className="mt-1">Consulte as fontes exibidas ao final das respostas e use seu conhecimento técnico para validar recomendações antes de tomar decisões no campo.</p></section></div><DialogClose asChild><button type="button" className="w-full rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Entendi</button></DialogClose></DialogContent></Dialog></div></div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      isInitial={message.id === "1"}
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
                  <div id="conversation-history" className="sr-only" aria-label="Histórico da sessão">{messages.length} mensagens nesta conversa</div>
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 p-5">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  suggestions={suggestions}
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
