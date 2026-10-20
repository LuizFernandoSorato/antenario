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
    pattern.ts     # padrões analíticos: dipolo, monopolo, dipolos cruzados, loop pequena, colinear, hélice axial, com testes
    mom.ts         # método dos momentos para fios finos (Yagi, quadra, QFH, discone), validado contra NBS TN 688 e Balanis
    exposure.ts    # exposição a RF em campo distante (estimativa)
  antennas/
    <antenna-id>/
      calc.ts      # entrada → medidas (função pura)
      diagram.ts   # medidas → SVG
      cutlist.ts   # folha de corte (peças e quantidades)
      guide.md     # materiais + passo a passo + ajuste + dicas de TX
      meta.ts      # nome, faixa típica, impedância, polarização, ganho, uso RX/TX
  antennas/pattern-kit.ts  # gráfico polar SVG dos padrões de irradiação
  antennas/mom-kit.ts      # cortes E/H/diagonal de padrões por momentos (boom em z)
      calc.test.ts
  matching/        # rede L, 1/4 de onda, stub, balun de coaxial, hairpin (gamma: sem fonte ainda)
  lines/           # cabos coaxiais: perdas, potência máxima, fator de velocidade
  data/            # tabelas (cabos, limites de exposição, bandas) COM fonte citada
  ui/              # componentes e páginas: início com cartões (home-page, icons), antena, ferramentas (ui/tools)
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
- **Fase 5** (feita em 2026-10-17): navegação por cartões (início com ícone e nome; página própria com dados,
  diagramas e guia), padrões de irradiação (dipolo, ground plane, turnstile), impedância do ground plane em função
  da inclinação dos radiais e Yagi com entrada por número de elementos (métodos NBS e DL6WU).

### Estado atual (atualizado em 2026-10-17)

Para retomar: `git log --oneline` mostra o que foi feito. 603 testes passando e build ok em 2026-10-19 (depois da cross Yagi e dos padrões por momentos, inclusive QFH e discone;
o último commit está em `git log`).

**Navegação (`src/main.ts`, `src/ui/`):** roteamento por hash. Vazio = página inicial com cartões
(`home-page.ts`, ícones SVG em `icons.ts`; todo id de antena do registro precisa de ícone, há teste). `#id` = página
da antena (formulário primeiro, depois diagramas, medidas, folha de corte e guia), ferramenta ou Carta de Smith.
O seletor de páginas antigo foi removido.

**Yagi (`src/antennas/yagi/`):** a entrada é o **número de elementos** (refletor + excitado + diretores); o boom
(cota **L**, entre centros) é calculado. Método AUTOMÁTICO (`chooseMethod`, sem campo na interface): 3, 5 e 6 elementos = NBS TN 688; o resto (4, 7 a 40) = DL6WU.
Os projetos NBS de 12, 15 e 17 só com `method: 1` no código (o de 15 tem boom maior que o de 17 por usar espaçamento maior). DL6WU (`dl6wu.ts`, `dl6wu-calc.ts`), qualquer
número de 3 a 40, com posições P1…Pn (espaçamento crescente até o 14º diretor, depois 0,4λ). Fonte do DL6WU: programa
`DL6WU.BAS` (G3SEK, versão Oct 2006, http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas, baixado com `curl`;
o `WebFetch` dava ECONNRESET). O método é para boom de 2,2λ a 39λ (≥ 11 elementos); abaixo disso calcula, avisa e
não estima ganho. O excitado segue λ/2 × K (o programa o dá para dipolo dobrado, mostrado só como aviso).

**ADS-B:** desativada no registro (é o ground plane em 1090 MHz). Código mantido em `src/antennas/adsb/` e
comentado em `src/antennas/index.ts`. Para reativar, descomente os imports e a linha do `register`.

**Ground plane:** a impedância mostrada vem de `estimateImpedance(ângulo)`, uma interpolação INDICATIVA (parábola
por 36,5 Ω a 0°, 50 Ω a 45° e 73 Ω a 90°). Os pontos têm fonte (Balanis e regra prática do ARRL), mas a curva entre
eles não: continua `TODO(fonte)`.

**Padrões de irradiação (2026-10-19; todas as antenas):**
- Analíticos (`core/pattern.ts`, com testes): dipolo (Balanis §4.2, serve também ao J-pole), monopolo (§4.7), dipolos cruzados (turnstile),
  loop pequena sin θ (§5.2, só para circunferência < λ/10), arranjo colinear (§6.4: elemento × fator de arranjo; o colinear de coaxial usa N dipolos
  de λ/2 em fase a λ/2, que reproduz a tabela de ganho da ferramenta, mas NÃO é o modelo do coaxial real) e hélice axial (Kraus: arranjo de N
  voltas × cos θ, fase de Hansen–Woodyard; D e HPBW a 0,3–1,7 dB e 3° das fórmulas empíricas de Kraus; fonte secundária, livros não consultados).
- Método dos momentos (`core/mom.ts`: EFIE de fio fino, Galerkin com bases triangulares, fios abertos ou fechados, sem junções) para Yagi, cross
  Yagi e quadra, porque dependem das correntes dos elementos parasitas. VALIDAÇÃO: dipolo (D = 1,643, HPBW 78°, ressonância em ≈ 0,47λ com R ≈ 70 Ω;
  o 73,1 Ω do Balanis é de corrente senoidal exata), dois dipolos (5,98 dBi, igual ao elemento × arranjo), conservação de energia, e Yagi contra o ganho MEDIDO dos
  6 projetos do NBS TN 688 (−0,5 a +0,3 dB) e contra a estimativa do DL6WU (−0,6 a −0,3 dB). O modelo da Yagi usa os elementos SEM a correção do boom
  (`isolatedElements`): a correção compensa o boom, que o modelo não tem; com ela, a relação frente–costas desabava. Limite de 40 elementos na Yagi e na cross Yagi (`DL6WU_MAX_ELEMENTS`,
  porque o MoM é O(N³) no navegador): o `calc` recusa mais que isso e a tela mostra o erro. O DL6WU.BAS original vai a 102. Quadra: fio de 2 mm assumido (premissa do modelo); o ganho do modelo (2 el. 7,5 dBi, 3 el. 9,5 dBi) fica ≈ 1,5–2 dB
  abaixo da "estimativa aditiva" do calc (que continua sem fonte). O refletor do ARRL dá o ganho máximo; um refletor ≈ 3 % maior sobe a relação frente–costas
  de ≈ 5 para ≈ 24 dB, perdendo < 1 dB. Cross Yagi: o plano diagonal difere um pouco do principal (termo cruzado).
- **QFH** (`qfh/pattern-model.ts`), por momentos: duas espiras fechadas de fio de 4,1 mm, cada uma com 2 braços helicoidais de meia volta (mesmo sentido) e
  2 braços horizontais, reconstruídas das medidas da calculadora de Coppens. Os "separadores" conferem a 0,1 mm: o vertical é o comprimento do braço helicoidal
  √(H² + (π·r)²) e o horizontal é o diâmetro entre os centros do fio, com r = (diâmetro interno + 4,1 mm)/2 (teste). Alimentação no topo, espiras em quadratura IDEAL
  (correntes de módulos iguais e 90°, obtidas por superposição de duas soluções), porque a quadratura real depende da junção e do coaxial, que não constam das fontes.
  Resultado: cardioide, 4,8 dBi no zênite, −6 a −7 dB no horizonte, ≈ −16 dB para baixo, razão axial < 1 dB no zênite e simetria em torno do eixo dentro de ~1 dB
  (faixa de 3 a 5 dBic e rejeição > 15 dB abaixo do horizonte: rfessentials.com, fonte secundária; protótipo de 2,22 GHz com 5,19 dB: BRIN 2019). Só ficou o máximo para cima
  quando a espira MENOR adianta a maior (maior indutiva, menor capacitiva); com a troca de sinal o feixe vai para baixo. **O sentido (RHCP/LHCP) NÃO foi afirmado**: com enrolamento
  à direita e a convenção de fase da cross Yagi (Ey atrasado 90° = RHCP), o modelo daria LHCP no zênite, o que contraria a afirmação comum de que a QFH enrolada à direita
  dá RHCP. Não resolvido: pode ser convenção de fase (conferir no `mom.ts`) ou a regra de qual espira adianta. TODO(fonte).
- **Discone** (`discone/pattern-model.ts`), por momentos, em 1×, 2× e 4× a menor frequência: cada par haste do disco + folga + haste do cone é UM fio (sem junções), com a fonte
  de 1 V no meio da folga e todos os pares em paralelo; usa o número e o diâmetro das hastes do cálculo (até 16; λ/12 por trecho). Verificações: limite de baixa frequência
  (dipolo curto, D ≈ 1,6 dBi), convergência com a discretização (≤ 0,2 dB) e ROE mínima do projeto de 50 Ω (≈ 1,5; Stearns cita ≈ 1,4). Resultado: em 1× um "donut" largo; em 2× e 4×
  o máximo desce ABAIXO do horizonte (coerente com a região entre o disco e o cone, que se abre para baixo) e, com 8 hastes, aparece ondulação em azimute de até 4 dB em 4×.
  Sem coaxial nem mastro. Não comparado com padrões medidos nem com os do artigo de Stearns (a figura não foi lida). TODO(fonte).

**Exposição a RF:** conferida em 2026-10-17. A Resolução Anatel 700/2018 (Art. 4º § 1º) adota a ICNIRP via Ato; o Ato
458/2019 foi revogado e substituído pelo Ato 17.865 (em vigor desde 01/03/2024, fonte secundária
https://dplnews.com/?p=220353). A minuta (Consulta Pública 63/2022) usa a ICNIRP 2020 com os mesmos valores de
`src/data/rf-exposure-limits.ts`. Falta ler o texto final do Ato 17.865.

**Cross Yagi (`src/antennas/cross-yagi/`, 2026-10-19):** dois Yagis idênticos girados 90° com os elementos no mesmo plano; os
elementos vêm da Yagi (NBS ou DL6WU), para qualquer frequência. Alimentação: Yagi A direto e Yagi B por linha de 1/4 de onda (cota **F**) com
impedância igual à do Yagi; junção em Z/2 e transformador **T** só se não der 50 Ω. Fonte: LY3H (https://www.ly3h.net/uhf-9v-9h-hand-cross-yagi-for-satellite/),
que dá 436,5 MHz, Yagis de 100 Ω e 113 mm de linha (teste: VF 0,66), mas NÃO as medidas dos elementos. Divergência não resolvida na página: um
comentário cita RG-62 com VF 0,83 e 142 mm. A impedância de cada Yagi é entrada do usuário (default 100 Ω). Padrão por momentos.

**Diâmetro do condutor e gap central (2026-10-20):** REGRA: o comprimento de um elemento partido ao meio é SEMPRE de ponta a ponta e já inclui o
espaço central (como no dipolo); cada braço mede (total − espaço)/2; o espaço é uma entrada em mm com padrão 0 e só vale para o elemento excitado
(refletor e diretores seguem inteiros). Onde há entrada: dipolo (`conductorDiameter`, `centerGap`: A total, B braço, C espaço); turnstile (`conductorDiameter`,
`centerGap`; B braço, E espaço); Yagi e cross Yagi (`elementDiameter`, `boomDiameter`, `drivenGap`; DE total, DB braço, DG espaço; cross Yagi: 4 braços na folha de
corte); quadra cúbica (`wireDiameter`, `feedGap`: H perímetro, J fio a cortar = H − espaço, K espaço); QFH (`wireDiameter`: só no padrão, as medidas são as de 4,1 mm); discone
(`rodDiameter`, `centerGap`: folga F, 0 = proporção do exemplo de Stearns; EXCEÇÃO à regra: a folga fica ENTRE as hastes e não entra em A nem E, porque R + L = λ/2 é das hastes).
Sem gap: ground plane, J-pole, helicoidal, loop magnética, colinear de coaxial, QFH (alimentação no topo, arranjo real sem fonte). O diâmetro só muda as cotas na Yagi (correção
NBS/DL6WU) e na impedância do stub do J-pole; no dipolo, turnstile e quadra ele é informativo (K e perímetros são para fio fino; curva do ARRL: TODO(fonte)).
A regra "gap dentro do comprimento total" é a convenção usual de comprimento ponta a ponta, não foi conferida em livro (ARRL Antenna Book e NBS TN 688 não consultados).

### Pendências

**Falta fonte (não implementar de memória). O usuário precisa fornecer o livro/PDF:**
- Fator de encurtamento K em função de L/d (diâmetro do condutor): a curva do ARRL Antenna Book (ver
  `dipole/calc.ts`, `TODO(fonte)`). O material do condutor quase não muda o comprimento; o isolamento do fio sim.
- Gamma match: equações no cap. 9 do Balanis (só o cabeçalho do programa MATLAB está online) ou no ARRL Antenna
  Book (Tolles, W7ITB).
- Moxon: equações do artigo de L. B. Cebik, W4RNL ("Designing Moxon Rectangles by Equation and by Model", em
  antenna2.net; deu erro de SSL no `WebFetch`, vale tentar `curl`).
- QFH: equações do Kilgus (IEEE, paywall).
- Padrão de irradiação da helicoidal (Kraus) e da colinear. O padrão do discone e da QFH vem de modelo por momentos sem comparação com medidas.
- Texto final do Ato 17.865 da Anatel.

**Fontes avaliadas e descartadas:** pcbantenna.com (sem fórmulas completas nem referências; ver a memória do
projeto). A página do YO5OSF com saída do AntMaker não bate com o DL6WU.BAS (outra versão).

**`TODO(fonte)` nas antenas existentes:**
- Cross Yagi: impedância real de cada Yagi com dipolo simples ou dobrado; efeito do cruzamento (acoplamento) e razão axial; sentido RHCP/LHCP
  foi derivado (Ey atrasado 90°), não tirado de fonte; confirmar com um passe de satélite.
- Yagi: divergência entre a tabela e a curva do NBS TN 688 no projeto de 0,4λ. DL6WU: os artigos originais do Hoch não
  foram consultados e não há comparação com dados medidos.
- Quadra cúbica: ganho é estimativa aditiva sem fonte.
- Discone: regra do gap e ganho.
- Colinear de coaxial: tabela de ganho vem de fonte de radioamador; impedância da seção de baixo não consta.
- Loop magnética: regra do loop de acoplamento (diâmetro ≈ 1/5) sem fonte.
- QFH: medidas são a saída da calculadora de Coppens a 137,5 MHz, escaladas; faltam as equações (Kilgus). Os "separadores" foram reconstruídos (ver os padrões). Falta o arranjo real de alimentação (qual espira adianta, junção) e o sentido de polarização.
- Turnstile: tamanho do refletor, impedância com refletor e ganho absoluto sem fonte. O padrão com refletor ideal
  indica diretividade bem acima do "+3 dB" da Wikipedia usado no texto (ver `turnstile/calc.ts`); não reconciliado.
- Hairpin: sem efeito de cantos e barra de curto; faixa de uso (25 a 35 Ω) vem de relatos de radioamadores.
- Ground plane: curva ângulo × impedância (ver acima). ADS-B: ganho e alcance típicos.

**Antenas sugeridas para adicionar (ordem recomendada):**
1. V-dipolo para satélites meteorológicos (137 MHz).
2. Dipolo em V invertido (inverted-V).
3. Moxon (precisa da fonte do Cebik).
4. Dipolo multibanda (fan dipole), EFHW com unun 49:1 (exige dados de ferrite com fonte) e log-periódica.

Antes de cada uma, pesquisar a fonte e avisar o usuário dos `TODO(fonte)`.

**Ideias de melhoria da interface (sem pedido ainda):** ícones próprios para cada ferramenta (hoje todas, menos a
Carta de Smith, usam o mesmo medidor) e conferir visualmente o ícone da QFH, redesenhado sem captura de tela.

---

## Como trabalhar neste repositório

- Antes de implementar uma antena nova, escrever primeiro o teste de `calc` com valores
  de referência e a fonte.
- Commits pequenos, um assunto por commit.
- Ao terminar uma tarefa, rodar `npm test` e `npm run build`.
- Na dúvida sobre física ou dados, **perguntar ao usuário ou marcar TODO**. Nunca chutar.