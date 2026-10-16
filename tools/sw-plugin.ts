/**
 * Plugin do Vite que gera o service worker (sw.js) no fim do build.
 *
 * Por que gerar em vez de escrever à mão: os arquivos do build têm nomes com hash
 * (index-BoMAZkt1.js) que mudam a cada versão, então a lista de arquivos para
 * deixar em cache offline só é conhecida depois do build.
 *
 * Estratégia (app estático, sem backend):
 * - instalação: coloca todos os arquivos do build em cache;
 * - ativação: apaga caches de versões antigas;
 * - requisições do mesmo site (GET): cache primeiro, rede como reserva;
 * O app usa rotas por hash (#dipole), então toda navegação vai para a raiz ou para
 * index.html, e as duas ficam em cache. Não há fallback para rotas desconhecidas: com
 * caminhos relativos, servir o index.html numa rota mais funda quebraria o carregamento
 * dos scripts, e seria uma promessa falsa.
 * A versão do cache é um hash do conteúdo, então só muda quando o app muda.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

const SW_FILE = 'sw.js';
const CACHE_PREFIX = 'antenario-';

/** Código do service worker para a lista de arquivos (caminhos relativos a sw.js) e a versão dadas. */
export function buildServiceWorker(files: readonly string[], version: string): string {
  const precache = ['./', ...files.map((f) => `./${f}`)];
  return `/* Gerado por tools/sw-plugin.ts: não edite. */
const CACHE = ${JSON.stringify(`${CACHE_PREFIX}${version}`)};
const PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') cache.put(request, response.clone());
  return response;
}
`;
}

/** Lista recursivamente os arquivos de uma pasta, com caminhos relativos e separador "/". */
function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [relative(base, full).split(sep).join('/')];
  });
}

/** Hash do conteúdo de todos os arquivos (nomes + bytes), em hexadecimal curto. */
export function contentVersion(dir: string, files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash.update(file);
    hash.update(readFileSync(join(dir, file)));
  }
  return hash.digest('hex').slice(0, 12);
}

export function serviceWorkerPlugin(): Plugin {
  let outDir = '';
  return {
    name: 'antenario-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    // closeBundle roda depois de tudo (inclusive da cópia de public/), então a lista está completa.
    closeBundle() {
      const files = listFiles(outDir).filter((f) => f !== SW_FILE);
      writeFileSync(join(outDir, SW_FILE), buildServiceWorker(files, contentVersion(outDir, files)));
    },
  };
}
