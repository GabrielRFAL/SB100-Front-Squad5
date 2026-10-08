import assert from 'node:assert/strict';
import test from 'node:test';

import {
  answerCurrentQuestion,
  createInitialFlow,
  getCurrentQuestion,
  goBack,
} from './decisionTree.ts';

const paths = [
  [['rural'], 'produtor_rural'],
  [['organization', 'cooperative'], 'cooperativa'],
  [['organization', 'company'], 'empresa'],
  [['organization', 'public'], 'instituicao_publica'],
  [['knowledge', 'research'], 'pesquisador_universitario'],
  [['knowledge', 'technical'], 'tecnico'],
  [['visitor'], 'visitante'],
] as const;

for (const [answers, expectedProfile] of paths) {
  test(`${answers.join(' -> ')} classifica como ${expectedProfile}`, () => {
    let flow = createInitialFlow();

    for (const answer of answers) {
      flow = answerCurrentQuestion(flow, answer);
    }

    assert.equal(flow.pendingProfile, expectedProfile);
  });
}

test('avanca uma pergunta por vez e permite voltar descartando o resultado', () => {
  const organizationFlow = answerCurrentQuestion(createInitialFlow(), 'organization');
  assert.equal(getCurrentQuestion(organizationFlow).id, 'organization_type');

  const confirmationFlow = answerCurrentQuestion(organizationFlow, 'company');
  assert.equal(confirmationFlow.pendingProfile, 'empresa');

  const editedFlow = goBack(confirmationFlow);
  assert.equal(editedFlow.pendingProfile, null);
  assert.equal(getCurrentQuestion(editedFlow).id, 'organization_type');

  const rootFlow = goBack(editedFlow);
  assert.equal(getCurrentQuestion(rootFlow).id, 'role');
});

test('rejeita respostas que nao pertencem a pergunta atual', () => {
  assert.throws(
    () => answerCurrentQuestion(createInitialFlow(), 'company'),
    /Resposta inv.lida/,
  );
});

