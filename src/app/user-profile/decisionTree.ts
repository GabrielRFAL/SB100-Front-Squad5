import type { UserProfile } from './types';

export type QuestionId = 'role' | 'organization_type' | 'activity';

interface QuestionDestination {
  questionId: QuestionId;
}

interface ProfileDestination {
  profile: UserProfile;
}

export interface DecisionOption {
  id: string;
  label: string;
  destination: QuestionDestination | ProfileDestination;
}

export interface DecisionQuestion {
  id: QuestionId;
  title: string;
  options: readonly DecisionOption[];
}

export interface ClassificationFlow {
  currentQuestionId: QuestionId;
  history: readonly QuestionId[];
  pendingProfile: UserProfile | null;
}

export const DECISION_TREE: Record<QuestionId, DecisionQuestion> = {
  role: {
    id: 'role',
    title: 'Qual das opções melhor descreve sua atuação?',
    options: [
      {
        id: 'rural',
        label: 'Atuo diretamente na produção rural',
        destination: { profile: 'produtor_rural' },
      },
      {
        id: 'organization',
        label: 'Represento uma organização, empresa ou instituição',
        destination: { questionId: 'organization_type' },
      },
      {
        id: 'knowledge',
        label: 'Atuo com pesquisa, ensino, estudos ou assistência técnica',
        destination: { questionId: 'activity' },
      },
      {
        id: 'visitor',
        label: 'Prefiro explorar a plataforma como visitante',
        destination: { profile: 'visitante' },
      },
    ],
  },
  organization_type: {
    id: 'organization_type',
    title: 'Que tipo de organização você representa?',
    options: [
      {
        id: 'cooperative',
        label: 'Cooperativa ou associação de produtores rurais',
        destination: { profile: 'cooperativa' },
      },
      {
        id: 'company',
        label: 'Empresa privada ou negócio',
        destination: { profile: 'empresa' },
      },
      {
        id: 'public',
        label: 'Órgão ou instituição pública',
        destination: { profile: 'instituicao_publica' },
      },
    ],
  },
  activity: {
    id: 'activity',
    title: 'Qual atividade melhor representa sua atuação?',
    options: [
      {
        id: 'research',
        label: 'Pesquisa científica, universidade ou estudos acadêmicos',
        destination: { profile: 'pesquisador_universitario' },
      },
      {
        id: 'technical',
        label: 'Assistência técnica, consultoria, extensão rural ou suporte especializado',
        destination: { profile: 'tecnico' },
      },
    ],
  },
};

export function createInitialFlow(): ClassificationFlow {
  return { currentQuestionId: 'role', history: [], pendingProfile: null };
}

export function getCurrentQuestion(flow: ClassificationFlow): DecisionQuestion {
  return DECISION_TREE[flow.currentQuestionId];
}

export function answerCurrentQuestion(
  flow: ClassificationFlow,
  optionId: string,
): ClassificationFlow {
  if (flow.pendingProfile) {
    throw new Error('Volte antes de alterar uma classificação pendente.');
  }

  const option = getCurrentQuestion(flow).options.find((item) => item.id === optionId);
  if (!option) {
    throw new Error('Resposta inválida para a pergunta atual.');
  }

  if ('profile' in option.destination) {
    return { ...flow, pendingProfile: option.destination.profile };
  }

  return {
    currentQuestionId: option.destination.questionId,
    history: [...flow.history, flow.currentQuestionId],
    pendingProfile: null,
  };
}

export function goBack(flow: ClassificationFlow): ClassificationFlow {
  if (flow.pendingProfile) {
    return { ...flow, pendingProfile: null };
  }

  const previousQuestionId = flow.history[flow.history.length - 1];
  if (!previousQuestionId) return flow;

  return {
    currentQuestionId: previousQuestionId,
    history: flow.history.slice(0, -1),
    pendingProfile: null,
  };
}

