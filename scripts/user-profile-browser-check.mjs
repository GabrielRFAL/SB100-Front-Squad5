import assert from 'node:assert/strict';

const appUrl = process.argv[2] ?? 'http://127.0.0.1:4173/';
const debuggerUrl = process.argv[3] ?? 'http://127.0.0.1:9222';

const targetResponse = await fetch(`${debuggerUrl}/json/new?${encodeURIComponent(appUrl)}`, {
  method: 'PUT',
});
if (!targetResponse.ok) {
  throw new Error(`Chrome DevTools indisponível: ${targetResponse.status}`);
}

const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks.reject(new Error(message.error.message));
  else callbacks.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Falha ao avaliar expressão no navegador.');
  }
  return result.result.value;
}

async function waitFor(expression, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

async function reload() {
  await command('Page.reload', { ignoreCache: true });
  await waitFor("document.readyState === 'complete'", 'A página não concluiu o recarregamento.');
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.trim() === ${JSON.stringify(label)});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Botão não encontrado: ${label}`);
}

await command('Runtime.enable');
await command('Page.enable');
await command('Page.navigate', { url: appUrl });
await waitFor(
  `location.origin === ${JSON.stringify(new URL(appUrl).origin)} && document.readyState === 'complete'`,
  'A aplicação não carregou.',
);

await evaluate("localStorage.removeItem('user_profile')");
await reload();
await waitFor("document.querySelector('[role=dialog]') !== null", 'O modal não abriu no primeiro acesso.');
await waitFor(
  "document.activeElement?.tagName === 'H2' && document.activeElement.textContent.includes('Qual das opções')",
  'O foco inicial não foi enviado à pergunta atual.',
);

await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
assert.equal(await evaluate("document.querySelector('[role=dialog]') !== null"), true, 'Escape fechou o fluxo obrigatório.');

await clickButton('Atuo diretamente na produção rural');
await waitFor(
  "document.activeElement?.tagName === 'H2' && document.activeElement.textContent.includes('Seu perfil foi identificado')",
  'O foco não acompanhou a tela de confirmação.',
);
assert.equal(await evaluate("localStorage.getItem('user_profile')"), null, 'O perfil foi salvo antes da confirmação.');
await clickButton('Confirmar e continuar');
await waitFor("document.querySelector('[role=dialog]') === null", 'O modal não fechou após confirmar.');
assert.equal(
  await evaluate("JSON.parse(localStorage.getItem('user_profile')).profile"),
  'produtor_rural',
  'O perfil produtor rural não foi persistido.',
);

await reload();
assert.equal(await evaluate("document.querySelector('[role=dialog]') === null"), true, 'O modal reabriu no segundo acesso.');

await clickButton('Alterar meu perfil');
await clickButton('Fechar');
assert.equal(await evaluate("document.querySelector('[role=dialog]') === null"), true, 'A reclassificação voluntária não pôde ser cancelada.');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('user_profile')).profile"), 'produtor_rural');

await clickButton('Alterar meu perfil');
await clickButton('Represento uma organização, empresa ou instituição');
await clickButton('Voltar');
assert.equal(
  await evaluate("document.body.textContent.includes('Qual das opções melhor descreve sua atuação?')"),
  true,
  'Voltar não retornou à pergunta anterior.',
);
await clickButton('Represento uma organização, empresa ou instituição');
await clickButton('Empresa privada ou negócio');
await clickButton('Confirmar e continuar');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('user_profile')).profile"), 'empresa');
assert.equal(await evaluate("document.body.textContent.includes('Empresa')"), true, 'A interface não sincronizou o perfil alterado.');

await clickButton('Alterar meu perfil');
await clickButton('Prefiro explorar a plataforma como visitante');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('user_profile')).profile"), 'visitante');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('user_profile')).classificationMethod"), 'visitor');
await reload();
assert.equal(await evaluate("document.querySelector('[role=dialog]') === null"), true, 'O modal reabriu para Visitante.');

await evaluate("localStorage.setItem('user_profile', '{corrompido')");
await reload();
await waitFor("document.querySelector('[role=dialog]') !== null", 'Dado corrompido não reabriu a classificação.');

await command('Emulation.setDeviceMetricsOverride', {
  width: 375,
  height: 667,
  deviceScaleFactor: 1,
  mobile: true,
});
const mobileLayout = await evaluate(`(() => {
  const dialog = document.querySelector('[role=dialog]');
  const rect = dialog.getBoundingClientRect();
  return {
    fitsViewport: rect.width <= innerWidth && rect.height <= innerHeight,
    noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
  };
})()`);
assert.deepEqual(mobileLayout, { fitsViewport: true, noHorizontalOverflow: true });

console.log('Browser E2E: 6 cenários aprovados em Chrome headless (desktop e 375x667).');
socket.close();
