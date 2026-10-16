import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServiceWorker, contentVersion } from '../tools/sw-plugin';

// O service worker gerado é executado num sandbox (vm) com um Cache API falso e
// eventos simulados, para testar o comportamento offline de verdade, não só o texto.

const ORIGIN = 'https://antenario.test';
const FILES = ['index.html', 'assets/app-abc123.js', 'assets/app-abc123.css', 'manifest.webmanifest'];

type Handler = (event: Record<string, unknown>) => void;

interface FakeResponse {
  url: string;
  ok: boolean;
  type: string;
  clone: () => FakeResponse;
}

function response(url: string, ok = true, type = 'basic'): FakeResponse {
  const r: FakeResponse = { url, ok, type, clone: () => r };
  return r;
}

function pathOf(url: string): string {
  return new URL(url, `${ORIGIN}/sw.js`).pathname;
}

function makeSandbox(sw: string, opts: { online: boolean; existingCaches?: string[] } = { online: true }) {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, Map<string, FakeResponse>>();
  for (const name of opts.existingCaches ?? []) stores.set(name, new Map());
  const state = { online: opts.online, fetched: [] as string[], claimed: false, skipped: false };

  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async addAll(urls: string[]) {
          for (const u of urls) store.set(pathOf(u), response(new URL(u, `${ORIGIN}/sw.js`).href));
        },
        async match(req: { url: string } | string) {
          const url = typeof req === 'string' ? req : req.url;
          return store.get(pathOf(url));
        },
        async put(req: { url: string }, res: FakeResponse) {
          store.set(pathOf(req.url), res);
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };

  const context = vm.createContext({
    URL,
    caches,
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
      skipWaiting: async () => void (state.skipped = true),
      clients: { claim: async () => void (state.claimed = true) },
    },
    fetch: async (req: { url: string }) => {
      state.fetched.push(req.url);
      if (!state.online) throw new TypeError('Failed to fetch');
      return response(req.url);
    },
  });
  vm.runInContext(sw, context);

  async function lifecycle(type: 'install' | 'activate') {
    const waits: Promise<unknown>[] = [];
    handlers[type]!({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }

  async function request(url: string, init: { method?: string; mode?: string } = {}) {
    let responded: Promise<unknown> | undefined;
    handlers['fetch']!({
      request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'no-cors' },
      respondWith: (p: Promise<unknown>) => (responded = p),
    });
    return responded === undefined ? undefined : await responded;
  }

  return { stores, state, lifecycle, request };
}

describe('buildServiceWorker', () => {
  const sw = buildServiceWorker(FILES, 'v1hash');

  it('lista os arquivos do build e a raiz, e nomeia o cache com a versão', () => {
    expect(sw).toContain('"antenario-v1hash"');
    for (const f of FILES) expect(sw).toContain(`"./${f}"`);
    expect(sw).toContain('"./"');
  });

  it('instalação: tudo vai para o cache e o worker assume sem esperar', async () => {
    const box = makeSandbox(sw);
    await box.lifecycle('install');
    const cached = [...box.stores.get('antenario-v1hash')!.keys()].sort();
    expect(cached).toEqual(['/', '/assets/app-abc123.css', '/assets/app-abc123.js', '/index.html', '/manifest.webmanifest']);
    expect(box.state.skipped).toBe(true);
  });

  it('offline: arquivos em cache são servidos sem tocar a rede', async () => {
    const box = makeSandbox(sw, { online: false });
    await box.lifecycle('install');
    const res = (await box.request(`${ORIGIN}/assets/app-abc123.js`)) as FakeResponse;
    expect(res.url).toBe(`${ORIGIN}/assets/app-abc123.js`);
    expect(box.state.fetched).toEqual([]);
  });

  it('offline: raiz e index.html (as únicas navegações do app) abrem do cache', async () => {
    const box = makeSandbox(sw, { online: false });
    await box.lifecycle('install');
    for (const path of ['/', '/index.html']) {
      const res = (await box.request(ORIGIN + path, { mode: 'navigate' })) as FakeResponse;
      expect(res.ok).toBe(true);
    }
  });

  it('offline: rota desconhecida falha em vez de servir um index.html que não carregaria os scripts', async () => {
    const box = makeSandbox(sw, { online: false });
    await box.lifecycle('install');
    await expect(box.request(ORIGIN + '/rota/funda', { mode: 'navigate' })).rejects.toThrow('Failed to fetch');
  });

  it('offline: recurso fora do cache que não é navegação falha (não inventa resposta)', async () => {
    const box = makeSandbox(sw, { online: false });
    await box.lifecycle('install');
    await expect(box.request(`${ORIGIN}/nao-existe.png`)).rejects.toThrow('Failed to fetch');
  });

  it('com rede: recurso novo é buscado e guardado para a próxima vez', async () => {
    const box = makeSandbox(sw, { online: true });
    await box.lifecycle('install');
    await box.request(`${ORIGIN}/extra.json`);
    expect(box.state.fetched).toEqual([`${ORIGIN}/extra.json`]);
    box.state.online = false;
    const again = (await box.request(`${ORIGIN}/extra.json`)) as FakeResponse;
    expect(again.url).toBe(`${ORIGIN}/extra.json`);
  });

  it('ignora a query string ao procurar no cache', async () => {
    const box = makeSandbox(sw, { online: false });
    await box.lifecycle('install');
    // O mock casa pelo caminho; o código passa ignoreSearch: true ao Cache API real.
    expect(sw).toContain('ignoreSearch: true');
    const res = (await box.request(`${ORIGIN}/index.html?utm=1`)) as FakeResponse;
    expect(res.url).toBe(`${ORIGIN}/index.html`);
  });

  it('não intercepta POST nem requisições para outro site', async () => {
    const box = makeSandbox(sw);
    await box.lifecycle('install');
    expect(await box.request(`${ORIGIN}/index.html`, { method: 'POST' })).toBeUndefined();
    expect(await box.request('https://outro-site.test/x.js')).toBeUndefined();
  });

  it('ativação: apaga só caches antigos do app e preserva os de outros apps', async () => {
    const box = makeSandbox(sw, { online: true, existingCaches: ['antenario-velho', 'outro-app-cache'] });
    await box.lifecycle('install');
    await box.lifecycle('activate');
    const names = [...box.stores.keys()].sort();
    expect(names).toEqual(['antenario-v1hash', 'outro-app-cache']);
    expect(box.state.claimed).toBe(true);
  });
});

describe('contentVersion', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  function makeDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'antenario-sw-'));
    dirs.push(dir);
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), content);
    }
    return dir;
  }

  it('é estável para o mesmo conteúdo e muda quando um arquivo muda', () => {
    const a = makeDir({ 'index.html': '<p>a</p>', 'assets/x.js': '1' });
    const b = makeDir({ 'index.html': '<p>a</p>', 'assets/x.js': '1' });
    const c = makeDir({ 'index.html': '<p>a</p>', 'assets/x.js': '2' });
    const files = ['index.html', 'assets/x.js'];
    expect(contentVersion(a, files)).toBe(contentVersion(b, files));
    expect(contentVersion(a, files)).not.toBe(contentVersion(c, files));
    expect(contentVersion(a, files)).toMatch(/^[0-9a-f]{12}$/);
  });
});
