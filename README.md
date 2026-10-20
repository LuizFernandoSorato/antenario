# Antenário

Ferramenta para **projetar, calcular e construir antenas** e sistemas de RF, para **recepção** (SDR, escuta, satélites) e **transmissão** (radioamadorismo). Reúne calculadoras, diagramas com medidas, folha de corte imprimível e passo a passo de construção em um só lugar.

Funciona **offline** e pode ser instalada no celular (PWA). Todo o cálculo roda no navegador: não há servidor nem coleta de dados.

**Acesse:** https://luizfernandosorato.github.io/antenario/

## O que tem

**Antenas** (medidas, premissas, valores esperados, diagramas SVG, padrões de irradiação, folha de corte e guia de construção):
dipolo de meia onda, ground plane de 1/4 de onda, J-pole, Yagi-Uda (NBS TN 688 e DL6WU), cross Yagi, quadra cúbica, helicoidal (modo axial), discone, colinear de coaxial, QFH, loop magnética e turnstile.
As de polarização circular (cross Yagi, turnstile, QFH e helicoidal) pedem o sentido RHCP ou LHCP e mostram o método de montagem correspondente.

**Ferramentas:**
- perdas no cabo coaxial (dados de datasheet de cada cabo);
- transformador de 1/4 de onda (inclusive com dois cabos em paralelo);
- rede L, casamento com stub, balun 4:1 de coaxial e hairpin;
- Carta de Smith interativa;
- exposição a RF: distância de segurança.

Cada ferramenta tem diagramas e dicas de montagem e ajuste.

## Como usar

Use a [página publicada](https://luizfernandosorato.github.io/antenario/) ou rode localmente:

```
npm install
npm run dev      # servidor local
npm test         # testes (Vitest)
npm run build    # build de produção (pasta dist)
npm run preview  # serve o build para conferir
```

Requer Node 22 ou mais novo.

## Precisão e fontes

Esta é uma ferramenta de projeto para hobby: **a antena real precisa de ajuste** (corte comprido e encurte medindo a ROE com NanoVNA ou medidor de ROE).

- Toda constante empírica tem a origem citada no código (ARRL Antenna Book, NBS TN 688, DL6WU, Kraus, Balanis, datasheet do cabo).
- As funções de cálculo são puras e testadas contra valores de referência.
- Quando falta a referência, o código marca `TODO(fonte)` em vez de inventar um valor. A lista do que ainda depende de fonte está em [CLAUDE.md](CLAUDE.md).
- Alguns padrões de irradiação (Yagi, quadra, QFH, discone, refletor da turnstile) vêm de um solver de método dos momentos próprio (`src/core/mom.ts`), validado contra dados publicados quando havia. Os resultados sem comparação com medida estão sinalizados.
- A interface mostra sempre as premissas usadas em cada cálculo.

## Transmissão e segurança

- Transmitir exige **licença de radioamador** (no Brasil, regulamentada pela Anatel). Planos de banda e limites de potência não são fixados de memória: confira a versão vigente na Anatel e na LABRE.
- A calculadora de exposição a RF é uma **estimativa** em campo distante, não atesta conformidade.
- Antenas externas: atenção a aterramento, proteção contra descargas e distância de rede elétrica ao instalar mastros. Os guias trazem o bloco de segurança.

## Estrutura

```
src/
  core/        física e matemática de RF (funções puras, sem DOM): ondas, reflexão, Carta de Smith, padrões, momentos
  antennas/    uma pasta por antena: calc, diagram, cutlist, guide.md, meta
  matching/    rede L, 1/4 de onda, stub, balun, hairpin
  lines/       cabos coaxiais: perdas e potência máxima
  data/        tabelas com fonte citada (cabos, limites de exposição)
  ui/          páginas e componentes (início, antena, ferramentas)
tools/         plugin de build que gera o service worker
tests/         testes do build
```

Convenções do projeto (idioma, unidades, regras de precisão, como trabalhar) estão no [CLAUDE.md](CLAUDE.md).

## GitHub Pages

O site é publicado por um workflow do GitHub Actions (`.github/workflows/pages.yml`) a cada push na branch `main`: ele roda os testes, gera o build e publica a pasta `dist`.

Configuração única no repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

O site fica em https://luizfernandosorato.github.io/antenario/. O app usa caminhos relativos e rotas por hash (`#turnstile`), então funciona em qualquer subpasta.

Depois de uma nova publicação, quem já instalou o app recebe a versão nova ao recarregar a página.

## Licença

Ainda não definida. Sem uma licença, o código fica com todos os direitos reservados ao autor; escolha uma (por exemplo MIT ou GPL) antes de aceitar contribuições.
