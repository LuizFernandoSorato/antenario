// Teste ponta a ponta do modo offline (PWA), via Chrome DevTools Protocol.
//
// Uso (Windows, com o Microsoft Edge instalado):
//   npm run build
//   npx vite preview --port 4173 --strictPort      # em outro terminal
//   npm run e2e:offline
//
// O teste abre o app, espera o service worker instalar, DERRUBA o servidor de preview
// (mata o processo que escuta a porta) e confere que a página recarrega e calcula sem rede.
// Por matar o servidor, use só com um `vite preview` descartável. O caminho do navegador
// pode ser trocado com EDGE_PATH (qualquer navegador baseado em Chromium).
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_APP = process.argv[2];
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-e2e-'))}`, '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

async function waitForDebugger() {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); }
  }
  throw new Error('Edge não abriu a porta de depuração');
}

let id = 0;
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else events.push(msg);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const myId = ++id;
    pending.set(myId, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)));
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  return new Promise((res) => (ws.onopen = () => res({ send, events, ws })));
}

const evalJs = async (c, expression) => {
  const r = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description));
  return r.result.value;
};

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`); };

try {
  await waitForDebugger();
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const c = await connect(target.webSocketDebuggerUrl);
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');

  // 1) Primeira visita, com rede.
  await c.send('Page.navigate', { url: URL_APP });
  await sleep(2500);
  const title = await evalJs(c, 'document.querySelector("h1")?.textContent');
  check('primeira visita (online) carrega o app', title === 'Antenário', `h1="${title}"`);

  // 2) Service worker instalado, ativo, e cache populado.
  const ready = await evalJs(c, `navigator.serviceWorker.ready.then(r => r.active ? r.active.state : 'sem-ativo')`);
  check('service worker ativo', ready === 'activated', ready);
  const cacheInfo = await evalJs(c, `caches.keys().then(async ks => { const out = {}; for (const k of ks) out[k] = (await (await caches.open(k)).keys()).length; return out; })`);
  const names = Object.keys(cacheInfo);
  check('cache do app criado com os arquivos do build', names.length === 1 && names[0].startsWith('antenario-') && cacheInfo[names[0]] >= 8, JSON.stringify(cacheInfo));

  // 3) Manifest e instalabilidade.
  const manifest = await c.send('Page.getAppManifest');
  check('manifest sem erros', !manifest.errors?.length, manifest.errors?.map((e) => e.message).join('; ') || manifest.url);
  const inst = await c.send('Page.getInstallabilityErrors');
  check('app instalável (sem erros de instalabilidade)', !inst.installabilityErrors?.length, JSON.stringify(inst.installabilityErrors ?? []));

  // Recarrega uma vez ainda online para a página ficar controlada pelo SW.
  await c.send('Page.reload'); await sleep(2000);
  const controlled = await evalJs(c, '!!navigator.serviceWorker.controller');
  check('página controlada pelo service worker', controlled === true);

  // 4) DERRUBA o servidor: sem rede de verdade.
  execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${new URL(URL_APP).port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`);
  await sleep(1000);
  let serverDead = false;
  try { await fetch(URL_APP, { signal: AbortSignal.timeout(2000) }); } catch { serverDead = true; }
  check('servidor derrubado (sem rede)', serverDead);

  // 5) Recarrega offline e usa o app.
  await c.send('Page.reload'); await sleep(2500);
  const offTitle = await evalJs(c, 'document.querySelector("h1")?.textContent');
  check('OFFLINE: página recarrega e mostra o app', offTitle === 'Antenário', `h1="${offTitle}"`);
  const hasDiagram = await evalJs(c, 'document.querySelectorAll("svg.dg").length');
  check('OFFLINE: diagramas SVG renderizados', hasDiagram >= 1, `${hasDiagram} svg`);
  const cuts = await evalJs(c, 'document.querySelectorAll("#cut-rows tr").length');
  check('OFFLINE: folha de corte calculada', cuts >= 1, `${cuts} linhas`);

  // Troca de página offline (rota por hash) e cálculo de outra ferramenta.
  await evalJs(c, `(() => { const s = document.querySelector('#page-select'); s.value = 'cable-loss'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(500);
  const loss = await evalJs(c, `[...document.querySelectorAll('td')].find(td => td.textContent.startsWith('Perda total'))?.nextElementSibling?.textContent`);
  check('OFFLINE: ferramenta de perdas no cabo calcula', /dB/.test(loss ?? ''), `Perda total = ${loss}`);

  // Navegações que o app realmente faz: com query string e direto para index.html.
  for (const path of ['?origem=atalho', 'index.html', '#j-pole']) {
    await c.send('Page.navigate', { url: new URL(path, URL_APP).href }); await sleep(2000);
    const h = await evalJs(c, 'document.querySelector("h1")?.textContent');
    check('OFFLINE: abre ' + path, h === 'Antenário', 'h1="' + h + '"');
  }
  const jp = await evalJs(c, 'document.querySelector("#page-select")?.value');
  check('OFFLINE: rota por hash (#j-pole) abre a antena certa', jp === 'j-pole', jp);
} catch (err) {
  console.error('ERRO NO TESTE:', err.message);
  results.push({ name: 'execução', ok: false });
} finally {
  edge.kill();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} verificações passaram`);
  process.exit(failed ? 1 : 0);
}
