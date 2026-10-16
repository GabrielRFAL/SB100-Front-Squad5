import type { UserProfile } from './types';

export type QuestionId = 'role' | 'activity' | 'context' | 'objective' | 'confirmation';

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

export interface DecisionAnswer {
  questionId: QuestionId;
  optionId: string;
}

export interface ClassificationFlow {
  currentQuestionId: QuestionId;
  history: readonly QuestionId[];
  answers: readonly DecisionAnswer[];
  pendingProfile: UserProfile | null;
}

const ROLE_QUESTION: DecisionQuestion = {
  id: 'role',
  title: 'Qual é sua principal relação com o agronegócio?',
  options: [
    {
      id: 'production',
      label: 'Trabalho com produção agrícola, propriedades rurais ou cooperativas.',
      destination: { questionId: 'activity' },
    },
    {
      id: 'organization',
      label: 'Trabalho com empresas, tecnologias ou serviços voltados ao agronegócio.',
      destination: { questionId: 'activity' },
    },
    {
      id: 'knowledge',
      label: 'Atuo com pesquisa científica, ensino ou atividades acadêmicas.',
      destination: { questionId: 'activity' },
    },
    {
      id: 'public',
      label: 'Trabalho em órgãos públicos ou instituições governamentais.',
      destination: { questionId: 'activity' },
    },
    {
      id: 'visitor',
      label: 'Quero apenas conhecer a plataforma.',
      destination: { profile: 'visitante' },
    },
  ],
};

const ACTIVITY_OPTIONS: Record<string, readonly DecisionOption[]> = {
  production: [
    {
      id: 'farm_management',
      label: 'Produção ou gestão de uma propriedade rural.',
      destination: { questionId: 'context' },
    },
    {
      id: 'cooperative_management',
      label: 'Organização e apoio coletivo a produtores.',
      destination: { questionId: 'context' },
    },
    {
      id: 'technical_assistance',
      label: 'Assistência técnica, consultoria ou extensão rural.',
      destination: { questionId: 'context' },
    },
  ],
  organization: [
    {
      id: 'technical_assistance',
      label: 'Assistência técnica, consultoria ou extensão rural.',
      destination: { questionId: 'context' },
    },
    {
      id: 'technology_solutions',
      label: 'Desenvolvimento ou comercialização de tecnologias e soluções agrícolas.',
      destination: { questionId: 'context' },
    },
    {
      id: 'cooperative_management',
      label: 'Gestão coletiva e apoio a produtores em uma cooperativa.',
      destination: { questionId: 'context' },
    },
  ],
  knowledge: [
    {
      id: 'research_teaching',
      label: 'Pesquisa científica, estudos ou ensino.',
      destination: { questionId: 'context' },
    },
    {
      id: 'technical_assistance',
      label: 'Assistência técnica, consultoria ou extensão rural.',
      destination: { questionId: 'context' },
    },
  ],
  public: [
    {
      id: 'public_policies',
      label: 'Desenvolvimento de políticas públicas, fiscalização ou regulamentação.',
      destination: { questionId: 'context' },
    },
    {
      id: 'research_teaching',
      label: 'Pesquisa, estudos ou ensino em uma instituição pública.',
      destination: { questionId: 'context' },
    },
  ],
};

const CONTEXT_OPTIONS: Record<string, readonly DecisionOption[]> = {
  farm_management: [
    { id: 'own_or_managed_farm', label: 'Em uma propriedade rural própria ou administrada.', destination: { questionId: 'objective' } },
    { id: 'cooperative', label: 'Em uma cooperativa de produtores.', destination: { questionId: 'objective' } },
  ],
  cooperative_management: [
    { id: 'cooperative', label: 'Em uma cooperativa de produtores.', destination: { questionId: 'objective' } },
    { id: 'direct_service_to_producers', label: 'Prestando atendimento direto a produtores.', destination: { questionId: 'objective' } },
  ],
  technical_assistance: [
    { id: 'direct_service_to_producers', label: 'Prestando atendimento ou consultoria diretamente a produtores.', destination: { questionId: 'objective' } },
    { id: 'private_agro_company', label: 'Em uma empresa privada do agronegócio.', destination: { questionId: 'objective' } },
    { id: 'cooperative', label: 'Em uma cooperativa de produtores.', destination: { questionId: 'objective' } },
  ],
  technology_solutions: [
    { id: 'private_agro_company', label: 'Em uma empresa privada do agronegócio.', destination: { questionId: 'objective' } },
    { id: 'direct_service_to_producers', label: 'Prestando atendimento ou consultoria diretamente a produtores.', destination: { questionId: 'objective' } },
  ],
  research_teaching: [
    { id: 'university_or_research_center', label: 'Em uma universidade, instituição de ensino ou centro de pesquisa.', destination: { questionId: 'objective' } },
    { id: 'public_institution', label: 'Em uma instituição ou órgão público.', destination: { questionId: 'objective' } },
  ],
  public_policies: [
    { id: 'public_institution', label: 'Em uma instituição ou órgão público.', destination: { questionId: 'objective' } },
    { id: 'direct_service_to_producers', label: 'Prestando atendimento direto a produtores.', destination: { questionId: 'objective' } },
  ],
};

const OBJECTIVE_OPTIONS: Record<string, readonly DecisionOption[]> = {
  farm_management: [
    { id: 'production_support', label: 'Resolver dúvidas e problemas relacionados à produção agrícola.', destination: { questionId: 'confirmation' } },
    { id: 'technical_guidance', label: 'Obter orientações técnicas para atividades no campo.', destination: { questionId: 'confirmation' } },
  ],
  cooperative_management: [
    { id: 'collective_planning', label: 'Apoiar a gestão, o planejamento e o trabalho coletivo.', destination: { questionId: 'confirmation' } },
    { id: 'technical_guidance', label: 'Obter orientações técnicas para atividades no campo.', destination: { questionId: 'confirmation' } },
  ],
  technical_assistance: [
    { id: 'technical_guidance', label: 'Obter orientações técnicas e recomendações para o campo.', destination: { questionId: 'confirmation' } },
    { id: 'production_support', label: 'Resolver problemas relacionados à produção agrícola.', destination: { questionId: 'confirmation' } },
  ],
  technology_solutions: [
    { id: 'agro_technology', label: 'Conhecer tecnologias, produtos e soluções para o agronegócio.', destination: { questionId: 'confirmation' } },
    { id: 'technical_guidance', label: 'Obter orientações técnicas para atividades no campo.', destination: { questionId: 'confirmation' } },
  ],
  research_teaching: [
    { id: 'scientific_research', label: 'Consultar pesquisas, informações científicas ou materiais acadêmicos.', destination: { questionId: 'confirmation' } },
    { id: 'learn_sector', label: 'Explorar informações e aprender mais sobre o setor agrícola.', destination: { questionId: 'confirmation' } },
  ],
  public_policies: [
    { id: 'public_policies', label: 'Apoiar atividades de gestão, planejamento ou políticas agrícolas.', destination: { questionId: 'confirmation' } },
    { id: 'production_support', label: 'Apoiar orientações e problemas relacionados à produção.', destination: { questionId: 'confirmation' } },
  ],
};

const PROFILE_LABELS: Record<UserProfile, string> = {
  produtor_rural: 'Sou responsável diretamente pela produção ou gestão agrícola.',
  cooperativa: 'Represento ou participo da gestão de uma cooperativa.',
  empresa: 'Trabalho no desenvolvimento ou comercialização de soluções agrícolas.',
  pesquisador_universitario: 'Minha principal atividade envolve pesquisa científica ou ensino.',
  tecnico: 'Minha principal atividade é orientar tecnicamente produtores.',
  instituicao_publica: 'Trabalho com gestão, programas ou políticas de instituições públicas.',
  visitante: 'Quero apenas explorar a plataforma.',
};

function getAnswer(flow: ClassificationFlow, questionId: QuestionId): string | null {
  return flow.answers.find((answer) => answer.questionId === questionId)?.optionId ?? null;
}

function getConfirmationProfiles(flow: ClassificationFlow): readonly UserProfile[] {
  const activity = getAnswer(flow, 'activity');
  const context = getAnswer(flow, 'context');

  if (activity === 'farm_management') return ['produtor_rural', 'cooperativa'];
  if (activity === 'cooperative_management') return ['cooperativa', 'tecnico'];
  if (activity === 'technical_assistance') {
    return context === 'private_agro_company'
      ? ['tecnico', 'empresa']
      : ['tecnico', 'cooperativa'];
  }
  if (activity === 'technology_solutions') return ['empresa', 'tecnico'];
  if (activity === 'research_teaching') {
    return context === 'public_institution'
      ? ['pesquisador_universitario', 'instituicao_publica']
      : ['pesquisador_universitario'];
  }
  return ['instituicao_publica', 'pesquisador_universitario'];
}

export const DECISION_TREE: Record<QuestionId, DecisionQuestion> = {
  role: ROLE_QUESTION,
  activity: { id: 'activity', title: 'Qual atividade melhor representa o que você faz atualmente?', options: [] },
  context: { id: 'context', title: 'Em qual contexto você realiza principalmente suas atividades?', options: [] },
  objective: { id: 'objective', title: 'Qual é seu principal objetivo ao utilizar nosso assistente agrícola?', options: [] },
  confirmation: { id: 'confirmation', title: 'Pensando no seu trabalho ou atividade principal, com qual situação você mais se identifica?', options: [] },
};

export function createInitialFlow(): ClassificationFlow {
  return { currentQuestionId: 'role', history: [], answers: [], pendingProfile: null };
}

export function getCurrentQuestion(flow: ClassificationFlow): DecisionQuestion {
  if (flow.currentQuestionId === 'role') return ROLE_QUESTION;
  if (flow.currentQuestionId === 'activity') {
    const role = getAnswer(flow, 'role');
    return { ...DECISION_TREE.activity, options: ACTIVITY_OPTIONS[role ?? ''] ?? [] };
  }
  if (flow.currentQuestionId === 'context') {
    const activity = getAnswer(flow, 'activity');
    return { ...DECISION_TREE.context, options: CONTEXT_OPTIONS[activity ?? ''] ?? [] };
  }
  if (flow.currentQuestionId === 'objective') {
    const activity = getAnswer(flow, 'activity');
    return { ...DECISION_TREE.objective, options: OBJECTIVE_OPTIONS[activity ?? ''] ?? [] };
  }

  return {
    ...DECISION_TREE.confirmation,
    options: getConfirmationProfiles(flow).map((profile) => ({
      id: profile === 'tecnico' ? 'technical' : profile === 'empresa' ? 'company' : profile === 'produtor_rural' ? 'producer' : profile === 'cooperativa' ? 'cooperative' : profile === 'pesquisador_universitario' ? 'researcher' : 'public',
      label: PROFILE_LABELS[profile],
      destination: { profile },
    })),
  };
}

export function answerCurrentQuestion(flow: ClassificationFlow, optionId: string): ClassificationFlow {
  if (flow.pendingProfile) {
    throw new Error('Volte antes de alterar uma classificação pendente.');
  }

  const question = getCurrentQuestion(flow);
  const option = question.options.find((item) => item.id === optionId);
  if (!option) throw new Error('Resposta inválida para a pergunta atual.');

  const answers = [...flow.answers, { questionId: flow.currentQuestionId, optionId }];
  if ('profile' in option.destination) {
    return { ...flow, answers, pendingProfile: option.destination.profile };
  }

  return {
    ...flow,
    currentQuestionId: option.destination.questionId,
    history: [...flow.history, flow.currentQuestionId],
    answers,
    pendingProfile: null,
  };
}

export function goBack(flow: ClassificationFlow): ClassificationFlow {
  if (flow.pendingProfile) {
    return {
      ...flow,
      answers: flow.answers.filter((answer) => answer.questionId !== flow.currentQuestionId),
      pendingProfile: null,
    };
  }

  const previousQuestionId = flow.history[flow.history.length - 1];
  if (!previousQuestionId) return flow;

  return {
    currentQuestionId: previousQuestionId,
    history: flow.history.slice(0, -1),
    answers: flow.answers.filter((answer) => answer.questionId !== previousQuestionId),
    pendingProfile: null,
  };
}
