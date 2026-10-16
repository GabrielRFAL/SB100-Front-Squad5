import assert from 'node:assert/strict';
import test from 'node:test';

import {
  answerCurrentQuestion,
  createInitialFlow,
  getCurrentQuestion,
  goBack,
} from './decisionTree.ts';

function answerPath(optionIds: readonly string[]) {
  return optionIds.reduce(answerCurrentQuestion, createInitialFlow());
}

const paths = [
  [['production', 'farm_management', 'own_or_managed_farm', 'production_support', 'producer'], 'produtor_rural'],
  [['production', 'cooperative_management', 'cooperative', 'collective_planning', 'cooperative'], 'cooperativa'],
  [['organization', 'technical_assistance', 'direct_service_to_producers', 'technical_guidance', 'technical'], 'tecnico'],
  [['organization', 'technology_solutions', 'private_agro_company', 'agro_technology', 'company'], 'empresa'],
  [['knowledge', 'research_teaching', 'university_or_research_center', 'scientific_research', 'researcher'], 'pesquisador_universitario'],
  [['public', 'public_policies', 'public_institution', 'public_policies', 'public'], 'instituicao_publica'],
] as const;

for (const [answers, expectedProfile] of paths) {
  test(`${answers.join(' -> ')} classifica como ${expectedProfile}`, () => {
    const flow = answerPath(answers);
    assert.equal(flow.pendingProfile, expectedProfile);
  });
}

test('adapta as alternativas da atividade à relação informada', () => {
  const flow = answerCurrentQuestion(createInitialFlow(), 'knowledge');
  const question = getCurrentQuestion(flow);

  assert.equal(question.id, 'activity');
  assert.deepEqual(
    question.options.map((option) => option.id),
    ['research_teaching', 'technical_assistance'],
  );
});

test('mantém contexto e objetivo como confirmação antes do perfil final', () => {
  let flow = answerPath(['organization', 'technical_assistance', 'private_agro_company', 'technical_guidance']);
  const confirmation = getCurrentQuestion(flow);

  assert.equal(confirmation.id, 'confirmation');
  assert.deepEqual(
    confirmation.options.map((option) => option.id),
    ['technical', 'company'],
  );

  flow = answerCurrentQuestion(flow, 'technical');
  assert.equal(flow.pendingProfile, 'tecnico');
});

test('Visitante encerra o caminho simplificado imediatamente', () => {
  const flow = answerCurrentQuestion(createInitialFlow(), 'visitor');
  assert.equal(flow.pendingProfile, 'visitante');
  assert.equal(flow.answers.length, 1);
});

test('avança cinco perguntas e permite voltar descartando respostas futuras', () => {
  let flow = answerCurrentQuestion(createInitialFlow(), 'production');
  flow = answerCurrentQuestion(flow, 'farm_management');
  flow = answerCurrentQuestion(flow, 'own_or_managed_farm');
  flow = answerCurrentQuestion(flow, 'production_support');

  assert.equal(getCurrentQuestion(flow).id, 'confirmation');
  assert.equal(flow.history.length, 4);

  const editedFlow = goBack(flow);
  assert.equal(getCurrentQuestion(editedFlow).id, 'objective');
  assert.equal(editedFlow.answers.some((answer) => answer.questionId === 'objective'), false);

  const contextFlow = goBack(editedFlow);
  assert.equal(getCurrentQuestion(contextFlow).id, 'context');
  assert.equal(contextFlow.answers.some((answer) => answer.questionId === 'context'), false);
});

test('rejeita respostas que nao pertencem a pergunta atual', () => {
  assert.throws(
    () => answerCurrentQuestion(createInitialFlow(), 'company'),
    /Resposta inv.lida/,
  );
});

