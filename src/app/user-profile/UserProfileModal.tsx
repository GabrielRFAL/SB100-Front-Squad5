import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, UserRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  answerCurrentQuestion,
  createInitialFlow,
  getCurrentQuestion,
  goBack,
  type ClassificationFlow,
} from './decisionTree';
import {
  USER_PROFILE_LABELS,
  type ClassificationMethod,
  type UserProfile,
} from './types';

interface UserProfileModalProps {
  open: boolean;
  isRequired: boolean;
  onCancel: () => void;
  onComplete: (profile: UserProfile, method: ClassificationMethod) => void;
}

export function UserProfileModal({
  open,
  isRequired,
  onCancel,
  onComplete,
}: UserProfileModalProps) {
  const [flow, setFlow] = useState<ClassificationFlow>(() => createInitialFlow());
  const contentHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) setFlow(createInitialFlow());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frameId = window.requestAnimationFrame(() => contentHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [flow, open]);

  const question = getCurrentQuestion(flow);
  const isConfirmation = flow.pendingProfile !== null;
  const step = flow.currentQuestionId === 'role' ? 1 : 2;

  const chooseOption = (optionId: string) => {
    const nextFlow = answerCurrentQuestion(flow, optionId);
    if (nextFlow.pendingProfile === 'visitante') {
      onComplete('visitante', 'visitor');
      return;
    }
    setFlow(nextFlow);
  };

  const enterAsVisitor = () => onComplete('visitante', 'visitor');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isRequired) onCancel();
      }}
    >
      <DialogContent
        aria-describedby="profile-dialog-description"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-slate-200 bg-white p-0 sm:max-w-2xl"
        showCloseButton={!isRequired}
        onEscapeKeyDown={(event) => {
          if (isRequired) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isRequired) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isRequired) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-5 text-left sm:px-7">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800" aria-hidden="true">
            <UserRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl leading-tight text-slate-900 sm:text-2xl">
            Vamos conhecer seu perfil
          </DialogTitle>
          <DialogDescription id="profile-dialog-description" className="text-sm leading-6 text-slate-600">
            Responda até duas perguntas rápidas. Não solicitamos nem armazenamos dados pessoais.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5 sm:px-7 sm:py-6" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {isConfirmation ? 'Confirmação' : `Etapa ${step} de 2`}
          </p>

          {isConfirmation && flow.pendingProfile ? (
            <div className="mt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800" aria-hidden="true">
                <Check className="h-6 w-6" />
              </div>
              <h2 ref={contentHeadingRef} tabIndex={-1} className="mt-4 text-xl font-semibold text-slate-900 outline-none">Seu perfil foi identificado</h2>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {USER_PROFILE_LABELS[flow.pendingProfile]}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Essa classificação ficará disponível para recursos futuros da plataforma e poderá ser alterada a qualquer momento.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setFlow(goBack(flow))}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Voltar e alterar
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(flow.pendingProfile as UserProfile, 'decision_tree')}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Confirmar e continuar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <h2 ref={contentHeadingRef} tabIndex={-1} className="text-lg font-semibold leading-7 text-slate-900 outline-none">{question.title}</h2>
              <div className="mt-4 grid gap-3" role="group" aria-label={question.title}>
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseOption(option.id)}
                    className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium leading-5 text-slate-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    <span>{option.label}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-emerald-700" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                {flow.history.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFlow(goBack(flow))}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                  </button>
                ) : <span />}
                {flow.currentQuestionId !== 'role' && (
                  <button
                    type="button"
                    onClick={enterAsVisitor}
                    className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    Entrar como visitante
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
