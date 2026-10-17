# CLAUDE.md: Projeto "Antenário" (nome provisório)

Ferramenta para **projetar, calcular e construir antenas** e sistemas de RF, para
**recepção** (SDR, escuta, satélites, ADS-B) e **transmissão** (radioamadorismo).
Ela reúne calculadoras, diagramas com medidas e passo a passo de construção em um só lugar.

O usuário é hobbista e está aprendendo. Explique decisões de RF de forma didática
quando fizer sentido, sem simplificar a física a ponto de ficar errada.

---

## Idioma e convenções

- Interface, textos, comentários e mensagens de commit em **português do Brasil**.
- Nomes de código (variáveis, funções, arquivos) em **inglês**.
- Unidades no **SI**: frequência em MHz na entrada, comprimentos em metros, com exibição
  em cm/mm conforme a escala. Polegadas apenas como exibição secundária opcional.
- Separador decimal da interface: vírgula (pt-BR). Internamente, números JS normais.

---

## Stack

- **Vite + TypeScript** (strict). Nada de framework pesado no início.
  Se a UI crescer, usar **Preact**.
- **PWA**: manifest + service worker, para que funcione **offline** e seja instalável no celular.
- **Vitest** para testes.
- Diagramas em **SVG gerado por código**, a partir dos resultados do cálculo.
- Sem backend. Todo cálculo roda no cliente.
- Possível empacotamento futuro como app nativo via Capacitor. Não introduzir
  dependências que impeçam isso (ex.: APIs só de desktop).

### Comandos (após o scaffolding)
```
npm install
npm run dev      # servidor local
npm test         # testes (Vitest)
npm run build    # build de produção
```

---

## Estrutura de pastas (alvo)

```
src/
  core/            # física e matemática de RF: funções PURAS, sem DOM
    units.ts       # conversões, constantes (c = 299 792 458 m/s)
    wave.ts        # λ, fator de velocidade, fator de encurtamento
    reflection.ts  # Γ, ROE/SWR, perda de retorno, perda por descasamento
    complex.ts     # aritmética de impedâncias complexas
    smith.ts       # geometria da Carta de Smith
    exposure.ts    # exposição a RF em campo distante (estimativa)
  antennas/
    <antenna-id>/
      calc.ts      # entrada → medidas (função pura)
      diagram.ts   # medidas → SVG
      cutlist.ts   # folha de corte (peças e quantidades)
      guide.md     # materiais + passo a passo + ajuste + dicas de TX
      meta.ts      # nome, faixa típica, impedância, polarização, ganho, uso RX/TX
      calc.test.ts
  matching/        # rede L, 1/4 de onda, stub, balun de coaxial, hairpin (gamma: sem fonte ainda)
  lines/           # cabos coaxiais: perdas, potência máxima, fator de velocidade
  data/            # tabelas (cabos, limites de exposição, bandas) COM fonte citada
  ui/              # componentes e páginas (ui/tools: calculadoras de cabo, casamento e RF)
tools/             # plugins de build (service worker)
tests/
```

### Contrato de cada antena
Toda antena exporta um objeto `meta` e uma função `calc(params)` que retorna:
- as medidas de cada elemento;
- **as premissas usadas** (diâmetro do condutor, fator de encurtamento, altura etc.);
- os valores esperados: impedância aproximada, ganho aproximado e largura de banda;
- avisos (ex.: "fora da faixa típica de validade do método").

A UI **sempre mostra as premissas** ao usuário. A antena real vai precisar de ajuste,
e a ferramenta deve deixar isso claro.

---

## Regras de precisão (IMPORTANTE)

1. **Nenhum número mágico sem fonte.** Toda constante empírica leva um comentário com
   a origem (ex.: ARRL Antenna Book, NBS Technical Note 688, DL6WU, Kraus, datasheet
   do fabricante do cabo).
2. **Funções de cálculo são puras e testadas**, comparando com valores de referência
   conhecidos (tolerância declarada no teste).
3. Não inventar dados. Se faltar a referência, deixar `TODO(fonte)` e avisar o usuário.
4. Arredondar só na exibição (mm para VHF/UHF, cm para HF). Nunca arredondar no meio do cálculo.
5. Fórmulas de base:
   - λ(m) = 299,792458 / f(MHz)
   - Dipolo de meia onda: L ≈ K·λ/2, com K ≈ 0,95 típico (depende da razão
     comprimento/diâmetro). Isso dá ≈ 142,5/f(MHz) m. Permitir o ajuste de K.
   - Monopolo de 1/4 de onda: ≈ 71,3/f(MHz) m (mesma ressalva).
   - Γ = (Z_L − Z_0)/(Z_L + Z_0); ROE = (1+|Γ|)/(1−|Γ|);
     perda de retorno = −20·log10|Γ|; perda por descasamento = −10·log10(1−|Γ|²).
   - Transformador de 1/4 de onda: Z_t = √(Z_0·Z_L). O comprimento físico usa o fator de velocidade do cabo.
   - Yagi: método DL6WU / NBS TN 688. Validar a faixa de aplicação.
   - Helicoidal (modo axial, Kraus): circunferência ≈ λ, passo ≈ 0,25λ.
   - Perdas de cabo: interpolar tabelas do fabricante (dB/100 m × frequência), não usar fórmula genérica.

---

## Transmissão: requisitos extras

Recepção tolera erro, transmissão não. Para toda antena e todo acessório marcado como
"TX", a ferramenta deve tratar:

- **ROE e faixa útil**: mostrar a largura de banda esperada para ROE < 2:1 (ou < 1,5:1)
  quando houver modelo confiável.
- **Potência suportada**: cabo (potência máxima por frequência, do datasheet), balun/unun
  (núcleo de ferrite: material, saturação, aquecimento), capacitores de rede de casamento
  e de loop magnética (**tensão de trabalho**, que pode chegar a kV).
- **Tensões altas nas pontas** de dipolos e elementos alimentados em tensão: avisar no guia.
- **Choke / balun de corrente** para evitar corrente de modo comum no cabo.
- **Exposição a RF**: incluir aviso e calculadora simples de distância de segurança
  (densidade de potência em campo distante: S = P·G / (4π·r²)), deixando claro que é
  uma estimativa e citando a referência de limites usada.
- **Legislação**: transmitir exige licença de radioamador (no Brasil, regulamentada
  pela **Anatel**). Planos de banda e limites de potência **não devem ser fixados
  de memória**. Ficam em `src/data/` com fonte e data de consulta (Anatel / LABRE), e o
  usuário deve ser orientado a conferir a versão vigente.
- **Segurança física**: aterramento, proteção contra descargas, distância de rede elétrica
  ao instalar mastros. Todo guia de antena externa leva esse bloco.

---

## Guias de construção (`guide.md`)

Cada guia segue o mesmo modelo:
1. Visão geral (o que é, para que serve, RX/TX, polarização, ganho típico)
2. Materiais (com alternativas baratas, encontráveis no Brasil)
3. Ferramentas
4. Passo a passo numerado, referenciando as cotas do diagrama (A, B, C…)
5. Alimentação e balun/casamento
6. Ajuste (cortar comprido e encurtar aos poucos; como medir com NanoVNA ou medidor de ROE)
7. Erros comuns
8. Notas de transmissão e segurança (quando aplicável)
9. Referências

---

## Roadmap

- **Fase 1** (feita): scaffolding, `core/` testado, dipolo, ground plane 1/4 e J-pole.
- **Fase 2** (feita): casamento de impedância (rede L, 1/4 de onda, stubs, baluns) e cabos coaxiais.
- **Fase 3** (feita): diagramas SVG completos, PWA offline e "folha de corte" imprimível.
- **Fase 4** (feita, com pendências): Yagi, quadra cúbica, helicoidal, discone, colinear coaxial, QFH, loop magnética
  e Carta de Smith interativa. Também entraram a turnstile, a calculadora de exposição a RF e o hairpin.

### Pendências (atualizado em 2026-10-16)

Para retomar: `git log --oneline` mostra o que foi feito; o último commit de antena foi a turnstile.

**Falta fonte (não implementar de memória):**
- Gamma match: sem equações com fonte. Precisa do capítulo de casamento do ARRL Antenna Book (Tolles, W7ITB).
- Resolução 700/2018 da Anatel: conferir os limites de exposição vigentes e a edição da ICNIRP adotada
  (`src/data/rf-exposure-limits.ts` usa a ICNIRP 2020, Tabela 5).

**`TODO(fonte)` nas antenas existentes:**
- Yagi: divergência entre a tabela e a curva do NBS TN 688 no projeto de 0,4λ.
- Quadra cúbica: ganho é estimativa aditiva sem fonte.
- Discone: regra do gap e ganho.
- Colinear de coaxial: tabela de ganho vem de fonte de radioamador; impedância da seção de baixo não consta.
- Loop magnética: regra do loop de acoplamento (diâmetro ≈ 1/5) sem fonte.
- QFH: medidas são a saída da calculadora de Coppens a 137,5 MHz, escaladas; faltam as equações (Kilgus) e a definição dos "separadores".
- Turnstile: tamanho do refletor, impedância com refletor e ganho absoluto sem fonte.
- Hairpin: sem efeito de cantos e barra de curto; faixa de uso (25 a 35 Ω) vem de relatos de radioamadores.

**Antenas sugeridas para adicionar (ordem recomendada):**
1. ~~ADS-B (1090 MHz)~~ (feita: ground plane de λ/4, só RX; `TODO(fonte)`: ganho/alcance típicos).
2. V-dipolo para satélites meteorológicos (137 MHz).
3. Dipolo em V invertido (inverted-V).
4. Moxon (fórmulas de L. B. Cebik, W4RNL; conferir a fonte).
5. Dipolo multibanda (fan dipole), EFHW com unun 49:1 (exige dados de ferrite com fonte) e log-periódica.

Antes de cada uma, pesquisar a fonte e avisar o usuário dos `TODO(fonte)`.

---

## Como trabalhar neste repositório

- Antes de implementar uma antena nova, escrever primeiro o teste de `calc` com valores
  de referência e a fonte.
- Commits pequenos, um assunto por commit.
- Ao terminar uma tarefa, rodar `npm test` e `npm run build`.
- Na dúvida sobre física ou dados, **perguntar ao usuário ou marcar TODO**. Nunca chutar.