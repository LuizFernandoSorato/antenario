# CLAUDE.md: Projeto "Antenário"

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
    dipole-resonance.ts  # fator K do dipolo pelo diâmetro (MoM), conferido com o Cebik
    swr-band.ts    # varredura de ROE e faixa abaixo de um limite
    q-bandwidth.ts # Q pela impedância (Yaghjian e Best) e banda de ROE prevista
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
  matching/        # rede L, 1/4 de onda, stub, balun de coaxial, manga de λ/4, hairpin, gamma match (Tolles)
  lines/           # cabos coaxiais: perdas, potência máxima, fator de velocidade
  data/            # tabelas (cabos, chokes de coaxial, limites de exposição, bandas) COM fonte citada
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
   - Dipolo de meia onda: L = K·λ/2, com K SEMPRE calculado pelo diâmetro do condutor (`antennas/k-factor.ts`;
     decisão do usuário em 2026-10-21: sem campo de K manual). K ≈ 0,95 (≈ 142,5/f(MHz) m) é só a regra prática do ARRL.
   - Monopolo de 1/4 de onda: L = K·λ/4 com o K do dipolo do mesmo condutor (teoria das imagens).
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

### Estado atual (atualizado em 2026-10-28)

Para retomar: `git log --oneline` mostra o que foi feito. 913 testes passando e build ok em 2026-10-28 (depois das pendências resolvidas com os livros de `docs/`, do discone de λ/4, do choke de manga e do gamma match;
notas de banda: nota ≤ 240 e fonte ≤ 180 caracteres, teste do registro; o último commit está em `git log`).

**Livros em `docs/` (fora do git, no `.gitignore`: direitos autorais, ≈ 370 MB):** ARRL Antenna Book 21ª ed. (sem os caps. 21, 24–26 e 28) e
19ª ed. (completa), com texto; K. Rothammel, "Antene" (tradução sérvia da 9ª ed. alemã), ESCANEADO (ler como imagem com `pdftoppm`, páginas fora de
ordem; mapa na memória do projeto). Decisão do usuário (2026-10-28): manter o MoM e o ARRL como base e citar o Rothammel nas notas quando divergir.

**Pendências resolvidas com os livros (2026-10-28):**
- Ground plane: curva ângulo × impedância do ARRL 21, p. 6-19, Fig 35 (4 radiais a mais de 0,3λ do solo), digitalizada a 300 dpi (`ARRL_DROOP_CURVE`,
  0° a 80°, interpolação linear; acima de 80° usa 80° e avisa): 22,5 Ω a 0°, 50 Ω a 45°, 58,8 Ω a 80°. Substituiu a parábola 36,5/50/73 Ω. O Rothammel
  (§19.4.1) dá 36 Ω a 0° (valor do plano infinito), dito na nota. Consequência: a 0° não há banda de 2:1 (ROE ≈ 2,2 em 50 Ω).
- Fator K: o MoM confere com a curva NEC-4.1 do ARRL 21 (p. 2-5, Fig 8) a 0,3 % e com o #14 da Fig 7 (ressonância em 0,488λ) a 0,2 % (testes);
  o ajuste do webantenna diverge até 1,4 % dela. O Rothammel (§3.1.5, Fig 3.7) dá K 1 a 3 % maior: só citado (nota do `k-factor.ts` e guia do dipolo).
- Double bazooka: ARRL 21, p. 9-6/9-7, Fig 11, lido: 1,14× a banda do "dipolo simples com o mesmo cabo", RG-58A a 3,75 MHz, em parte pela malha grossa.
  O modelo dá 1,08–1,10× contra o dipolo de mesmo diâmetro e 1,16–1,25× contra fio fino: o 1,14 fica entre os dois (teste). Fig 12: 1,55× com ≈ 80 %.
- Hairpin: rede L do ARRL 19 (p. 26-10/26-11), VF 0,975 da linha aberta (`OPEN_WIRE_VF`), teste com o exemplo do livro (20→50 Ω, 17,8" a 14 MHz).
- Choke de coaxial: nova ferramenta `coax-choke` (`data/coax-chokes.ts`, ARRL 19, p. 26-21, Tabela 3: bobinas de RG-213 e RG-58 por banda e
  multibanda; receitas de ferrite W2DU e FT240-43 só como texto). O aviso do balun de coaxial aponta para ela.
- Choke de manga de λ/4 para VHF/UHF (pedido do usuário, 2026-10-28; "qualquer coisa revertemos"): ferramenta própria `coax-sleeve` (o formulário da
  `coax-choke` é por banda de HF) e `matching/sleeve-balun.ts`: L = 234/f pés (ARRL 19, p. 26-23, Fig 33B, VF ≈ 0,95), tubo de 3 a 4 vezes o diâmetro
  do cabo (Rothammel §25.1.2; o ARRL dá 2" com cabo de 1/2"), Z0 = 138·log10(D/d) informativa (ARRL 19, Eq 26). Teste com o exemplo de 2 m do Rothammel
  (495 mm; a fórmula dá 492 mm a 145 MHz). Ferrite em VHF (tipo 43 de 30 a 250 MHz, ou 61) só como texto: sem receita de quantidade para VHF/UHF.
- Gamma match: CALCULADO na Yagi e na cross Yagi (ver "Gamma match" abaixo), pelas equações do Tolles (`docs/Ham-Radio-197305.pdf`, pedido do
  usuário em 2026-10-28: "o gamma é para o casamento da Yagi e da cross Yagi"). Loop magnética: gamma do W5QJR (ARRL 21, p. 5-18/5-19), só no guia.
- Turnstile: alimentação conferida com o Rothammel §25.2.3, p. 370 (linha de λ/4 com Z = R do dipolo; 60 Ω → junção ≈ 30 Ω; banda estreita).
- Helicoidal: o Rothammel (§26.5.1) imprime as fórmulas de Kraus; a Tabela 26.5 é reproduzida em teste (ganho a 0,15 dB com D = 0,31λ e S = 0,24λ;
  o ÂNGULO da tabela foi calculado com C = λ, não com π·0,31λ). Diferenças citadas: Z ≈ 136·C/λ, ROE ≤ 1,35 em 1:1,6, refletor ≥ 0,5λ.
- Discone: MEDIDAS PELA REGRA DO λ/4 (pedido do usuário, 2026-10-28: "Ajuste a discone para 1/4"): ARRL 21 (p. 7-26, Fig 48: L = 246/f pés = λ/4,
  disco 0,67–0,70·L, base = L, ou seja, semiângulo de 30°, folga de 2 a 12") e Rothammel (§25.1.4: lado λ/4, disco 0,7·D, 1:8, ROE ≤ 1,5). Saiu o
  dimensionamento do Stearns (1ª ressonância em 0,7 × a menor, R + L = λ/2, ângulo pela impedância e disco de Nail), que dava um cone ≈ 1,9 vez maior,
  e saiu o campo "impedância de projeto" (os livros usam a mesma forma com 50 ou 60 Ω). No MoM (8 hastes de 4 mm), entre as formas com cone de λ/4,
  a dos livros é a melhor na ponta de baixo (contra 47° com disco 0,7·L ou com o disco de Nail), mas dá ROE ≈ 11:1 em 50 Ω na menor frequência e
  < 2:1 só a partir de ≈ 1,4 vez ela (teste em `pattern-model.test.ts`): dito no aviso, na ajuda do campo e no guia. Banda: 1× a 8× (Rothammel). Sem medida.

**Ganho e impedância pelos modelos (2026-10-22, "grupo 1", aprovado pelo usuário: o modelo por momentos vale como fonte quando
não há outra, dito na nota):** Yagi: impedância do excitado (dipolo simples) sempre do modelo (`yagiQ` devolve z0, Q e a diretividade da mesma
solução); ganho do modelo só onde o método não dá (DL6WU com boom < 2,2λ: 4 e 7 a 10 elementos), `modelGainEstimate`, também na cross Yagi.
QFH: ganho = diretividade do `solveQfh` (4,8 dBic, quadratura ideal). Turnstile: impedância = `quadratureFeed(R do dipolo do modelo com o refletor)`
(≈ 36 Ω nos três casos: R ∥ 73²/R); ganho: 2,1 dBic analítico sem refletor e a linha do estudo do refletor (tela 1λ 7,8 dBic, tubos 5,6 dBic),
no lugar do "+3 dB" da Wikipedia. Quadra: impedância e ganho do modelo (`quadQ` devolve a diretividade); a soma aditiva (Electronics Notes)
saiu (dava 1,6 a 2,6 dB a mais); o ≈ 50 Ω do Electronics Notes diverge do modelo (≈ 80 Ω com 2 elementos a 0,2λ), dito na nota.
Discone: ganho = faixa da diretividade máxima em 1×, 2× e 4× (`PATTERN_MULTIPLES`), com cache em `solveDiscone` compartilhado com os diagramas.
Nenhum desses foi conferido com medida (TODO(fonte)).

**Largura de banda (2026-10-22, pedido do usuário: "estimar a largura de banda de todas as antenas"):** `expected.bandwidth` com ROE < 2:1 e
< 1,5:1 no texto. Ferramentas: `core/swr-band.ts` (varredura grossa + Lagrange + faixa a partir do mínimo; usada também pelo V invertido),
`core/q-bandwidth.ts` (Q de Yaghjian e Best, IEEE TAP 2005, lido via arXiv 1909.08019: Q_Z = (ω/2R)·√(R'² + (X' + |X|/ω)²) e banda
(S − 1)/(Q·√S), antena casada em f0 com rede ideal; 3 soluções do MoM em vez de ~30), `antennas/bandwidth.ts` (textos) e
`antennas/quadrature-feed.ts` (linha de 1/4 de onda pela matriz ABCD e razão axial < 3 dB, critério de fonte secundária: IntechOpen). Por antena:
- Dipolo (`dipole/band-model.ts`, MoM ressonante, opcionalmente com refletor plano por imagem ou tubo): 156 kHz no 80 m com #12; o Cebik diz 150–200 kHz.
- Ground plane/ADS-B: dipolo escalado para `estimateImpedance` (mesmo Q; o Q do dipolo só é exato com plano infinito): INDICATIVA, TODO(fonte).
- Turnstile: dipolos do MoM (refletor plano = imagem infinita; tubos = tubo parasita) + linha de 73 Ω; ≈ 25 MHz de ROE em 137,5 MHz, mas a razão
  axial < 3 dB é bem mais estreita (a nota mostra as duas).
- Yagi (`yagi/band-model.ts`, `elements.ts`; `calc` = `designCalc` + banda): Q do excitado, casamento ideal. Conferido contra a varredura sintonizada:
  NBS 3/5/6 elementos a ±10 %; DL6WU 11/20 a varredura dá MAIS banda (impedância ondulada): conservador, dito na nota. Até ≈ 0,5 s com 40 elementos.
- Cross Yagi: cada Yagi como RLC (R = `yagiImpedance`, Q do modelo) pela linha de 1/4 e pelo T; ≈ 17 MHz de ROE e ≈ 4,3 MHz de razão axial em 436,5 MHz.
- Quadra: Q da espira excitada (`quadQ`); a ±10 % da varredura com 0, 1 e 3 diretores; com 2 há outra ressonância perto e o Q é conservador.
- Helicoidal: faixa do modo axial (Kraus) + ROE nas bordas pela R ≈ 140·C/λ (≈ 1,33:1 com C/λ = 1).
- J-pole: sem valor calculado; nota com a medida de E. Fong, WB6IQN (QST, fev. 2003): ≈ 8 MHz em 146 MHz com cano de cobre, critério não dito.
- Já tinham: double bazooka, V invertido, Moxon (MoM), loop magnética (RLC), flowerpot (medida), discone (1× a 8×, Rothammel; nota com a ROE do modelo na ponta de baixo).
- SEM banda (TODO(fonte)): colinear de coaxial (nenhuma curva medida achada) e QFH (o modelo autofaseado, espiras em paralelo no topo, dá a melhor
  quadratura em ≈ 0,98·f, com correntes 2,7:1 em f: não conferido, não usado). Discone: o MoM de hastes dá picos de ROE (até ≈ 5:1 em 6× no projeto
  de λ/4) e saltos quando muda o número de trechos; só a ponta de baixo (< 2:1 a partir de ≈ 1,4×) entra na nota.

**Navegação (`src/main.ts`, `src/ui/`):** roteamento por hash. Vazio = página inicial com cartões
(`home-page.ts`, ícones SVG em `icons.ts`; todo id de antena do registro precisa de ícone, há teste). `#id` = página
da antena (formulário primeiro, depois diagramas, medidas, folha de corte e guia), ferramenta ou Carta de Smith.
O seletor de páginas antigo foi removido. Nomes dos cartões curtos, sem parênteses (2026-10-22, pedido do usuário; o título do guia
mantém o nome completo). Cabeçalho com autor, repositório e botão de estrela (`ui/project-info.ts`: link comum, sem script de terceiros; o
número vem da API do GitHub e some offline).

**Yagi (`src/antennas/yagi/`):** a entrada é o **número de elementos** (refletor + excitado + diretores); o boom
(cota **L**, entre centros) é calculado. Método AUTOMÁTICO (`chooseMethod`, sem campo na interface): 3, 5 e 6 elementos = NBS TN 688; o resto (4, 7 a 40) = DL6WU.
Os projetos NBS de 12, 15 e 17 só com `method: 1` no código (o de 15 tem boom maior que o de 17 por usar espaçamento maior). DL6WU (`dl6wu.ts`, `dl6wu-calc.ts`), qualquer
número de 3 a 40, com posições P1…Pn (espaçamento crescente até o 14º diretor, depois 0,4λ). Fonte do DL6WU: programa
`DL6WU.BAS` (G3SEK, versão Oct 2006, http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas, baixado com `curl`;
o `WebFetch` dava ECONNRESET). O método é para boom de 2,2λ a 39λ (≥ 11 elementos); abaixo disso calcula, avisa e
não estima ganho. O excitado segue λ/2 × K (o programa o dá para dipolo dobrado, mostrado só como aviso), exceto com o gamma (abaixo).

**Gamma match (Yagi e cross Yagi, 2026-10-28; SEMPRE, sem campo na interface, decisão do usuário em 2026-10-28: "As yaggis sempre terão gamma match"; `gammaMatch: 0`, `drivenGap` e, na cross Yagi, `yagiImpedance` só existem no código, para validação):** `matching/gamma.ts` (Tolles, W7ITB, Ham Radio, maio de 1973,
eqs. 2, 3 e 8 a 14: Hz, Z0 da linha barra–elemento, Q, k·l com velocidade 0,956, capacitor; Za = METADE da impedância do dipolo, p. 50). Testes: os 2
exemplos do artigo (o 1º confere com o ajuste MEDIDO pelo Tolles: barra a 7 %, C a 21 %) e os 3 do programa GAMMA do ARRL 19 (p. 26-9/26-10: exatos com
`velocity: 1`, porque o programa usa o λ do espaço livre, e com o 25 − j25 do exemplo como Za sem dividir; divergência de convenção citada no código).
`gammaInputImpedance`: circuito equivalente Hz·Za ∥ j·Z0·tan(k·l) + capacitor (reproduz R0 + j0 em f0; serve para a banda). `autoGamma`: barra
de 1/3 do elemento e 0,007λ (ARRL 19, p. 26-9); se o casamento não fecha ou a barra sai de 15° a 45° (Tolles, p. 49 e 54), o espaçamento mais próximo
que entra na faixa; senão barras mais finas (1/4 a 1/6, critério desta ferramenta); folga ≥ diâmetro da barra (critério desta ferramenta).
`yagi/gamma-feed.ts`: excitado INTEIRO = 0,97 × ressonância no conjunto (ARRL: "shortened approximately 3% from resonance"), ressonância por
secante no MoM dos elementos soltos (com cache), + a correção do boom dos parasitas (extensão desta ferramenta: com o gamma o excitado também toca o
boom). Banda: Q de Yaghjian e Best na ENTRADA do gamma (as 3 soluções de `yagiQ`, que agora devolve `zMinus`/`zPlus`). Resultado no padrão
(145 MHz, 5 el., 6 mm): Z ≈ 16,8 − j24,7 Ω, barra 82 mm = 0,040λ, 2 mm a 12,4 mm, C ≈ 12,7 pF (regra do ARRL: 0,04–0,05λ e ≈ 14,5 pF); 11 a 40 el.:
≈ 0,05λ e ≈ 13 pF; 3 el. (≈ 9 Ω) pede barra de 1/4 (aviso). Cotas GL (centro → ponte), GS (entre centros), GD (barra); `CalcResult.matching`
(seção nova na tela: montagem e ajuste, com o capacitor e a tensão V = √(P/R0)·|Xc| para `txPowerW`); diagrama `gammaDetail` (fora de escala);
folha de corte com a barra. Se o gamma não fecha (barra/espaçamento informados), aviso "danger" e sem cotas da barra. Até ≈ 1,7 s com 40 elementos
(≈ 7 soluções do MoM). Testes de validação do método (NBS, DL6WU, espaço central) usam `gammaMatch: 0`. TODO(fonte): nada conferido com medida.

**ADS-B:** desativada no registro (é o ground plane em 1090 MHz). Código mantido em `src/antennas/adsb/` e
comentado em `src/antennas/index.ts`. Para reativar, descomente os imports e a linha do `register`.

**Ground plane:** a impedância mostrada vem de `estimateImpedance(ângulo)`, interpolação linear da curva do ARRL 21, Fig 35
(`ARRL_DROOP_CURVE`, 0° a 80°; ver "Pendências resolvidas com os livros").

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
  porque o MoM é O(N³) no navegador): o `calc` recusa mais que isso e a tela mostra o erro. O DL6WU.BAS original vai a 102. Quadra: fio de 2 mm assumido (premissa do modelo); o ganho do modelo (2 el. 7,5 dBi, 3 el. 9,5 dBi) é o que o calc mostra desde 2026-10-22 (antes,
  uma soma aditiva sem fonte dava 1,5–2 dB a mais). O refletor do ARRL dá o ganho máximo; um refletor ≈ 3 % maior sobe a relação frente–costas
  de ≈ 5 para ≈ 24 dB, perdendo < 1 dB. Cross Yagi: o plano diagonal difere um pouco do principal (termo cruzado).
- **QFH** (`qfh/pattern-model.ts`), por momentos: duas espiras fechadas de fio de 4,1 mm, cada uma com 2 braços helicoidais de meia volta (mesmo sentido) e
  2 braços horizontais, reconstruídas das medidas da calculadora de Coppens. Os "separadores" conferem a 0,1 mm: o vertical é o comprimento do braço helicoidal
  √(H² + (π·r)²) e o horizontal é o diâmetro entre os centros do fio, com r = (diâmetro interno + 4,1 mm)/2 (teste). Alimentação no topo, espiras em quadratura IDEAL
  (correntes de módulos iguais e 90°, obtidas por superposição de duas soluções), porque a quadratura real depende da junção e do coaxial, que não constam das fontes.
  Resultado: cardioide, 4,8 dBi no zênite, −6 a −7 dB no horizonte, ≈ −16 dB para baixo, razão axial < 1 dB no zênite e simetria em torno do eixo dentro de ~1 dB
  (faixa de 3 a 5 dBic e rejeição > 15 dB abaixo do horizonte: rfessentials.com, fonte secundária; protótipo de 2,22 GHz com 5,19 dB: BRIN 2019). Só ficou o máximo para cima
  quando a espira MENOR adianta a maior (maior indutiva, menor capacitiva); com a troca de sinal o feixe vai para baixo. **Sentido**: pelo modelo (convenção IEEE de `core/polarization.ts`), enrolamento à direita dá LHCP no zênite e à esquerda dá RHCP; concorda com a patente US 10511099 (fonte secundária, não lida na íntegra). TODO(fonte): confirmar com um passe real.
- **Discone** (`discone/pattern-model.ts`), por momentos, em 1×, 2× e 4× a menor frequência: cada par haste do disco + folga + haste do cone é UM fio (sem junções), com a fonte
  de 1 V no meio da folga e todos os pares em paralelo; usa o número e o diâmetro das hastes do cálculo (até 16; λ/12 por trecho). Verificações: limite de baixa frequência
  (dipolo curto, D ≈ 1,6 dBi), convergência com a discretização (≤ 0,2 dB) e ROE mínima na faixa < 1,5 (o Rothammel diz ≤ 1,5 na faixa toda; o modelo tem picos). Resultado: em 1× um "donut" largo; em 2× e 4×
  o máximo desce ABAIXO do horizonte (coerente com a região entre o disco e o cone, que se abre para baixo) e, com 8 hastes, aparece ondulação em azimute de até 4 dB em 4×.
  Sem coaxial nem mastro. Não comparado com padrões medidos nem com os do artigo de Stearns (a figura não foi lida). TODO(fonte).
  O projeto antigo (Stearns, 100 MHz) tinha a primeira ressonância (X = 0) em ≈ 70 MHz no modelo, como o Stearns prevê (0,7 × a menor).
  As frases sobre o padrão em 2× e 4× (máximo abaixo do horizonte, ondulação de 4 dB) são desse projeto antigo; não reconferidas no de λ/4.

**Double bazooka (`src/antennas/bazooka/`, 2026-10-21):** dipolo com a parte central de coaxial (malha cortada no centro, vivo soldado na malha
nas pontas: dois tocos de λ/4·VF em série, em paralelo com o dipolo) e fios nas pontas até K·λ/2. Cotas: A total, B seção de coaxial (2C + E), C toco,
D fio da ponta (é o que se ajusta), E corte da malha. Cabo é campo de escolha (índice em `coaxCables`: Z0, VF, diâmetro e perda do datasheet); VF medido
opcional (0 = datasheet). Banda, impedância e perda nos tocos vêm de `feed-model.ts`: MoM do dipolo (fio todo com o diâmetro externo do coaxial, ajustado
para ressoar em f) ∥ 2·Z0·tanh(γl), ROE em 50 Ω, varredura de ±15 %. Resultado: banda de 2:1 de 1,04 a 1,10× a do dipolo e perda de 0,04 a 0,18 dB;
confere com F5AD (≈ 1,075×, 0,1–0,5 dB); o 1,14× do ARRL (21ª ed., p. 9-6/9-7, lido em 2026-10-28) compara com um dipolo de fio fino e fica entre
as duas razões do modelo (ver "Pendências resolvidas com os livros"). F5AD lido via ZS6GM (https://www.zs6stn.org.za/ResourceArticles/Download/17);
o artigo do W2DU (Reflections II, cap. 18, k6mhe.com) estava fora do ar. Variante com tocos em paralelo ("cross-connected", 1,55× com ≈ 80 % de
eficiência segundo o ARRL, Fig 12) não implementada.

**V invertido (`src/antennas/inverted-v/`, 2026-10-21):** A = K·λ/2 (K do dipolo reto, ajustável) × alongamento do V. O alongamento, a impedância,
o ganho, a banda e os padrões vêm de `v-model.ts` (MoM, um fio do ápice às pontas, espaço livre). Validação contra L. B. Cebik, W4RNL, "80-Meter
Dipoles and Inverted-Vs" (NEC-4, 3,75 MHz, AWG #12; espelho https://antenna2.github.io/cebik/content/wire/80dp.pdf): comprimento relativo ao dipolo
a ±0,3 % (120°: +0,8 %, 90°: +1,9 %); as resistências do Cebik ficam 1,5 a 2,6 Ω acima das nossas (perda do cobre, que ele inclui e o modelo não) e,
descontada essa perda, os ganhos dele (1,79 e 1,49 dBi) saem a ±0,05 dB. Ângulo de 60° a 180°; abaixo de 90° avisa (fora do conferido). Altura do
ápice é entrada só para a geometria (F = altura das pontas; recusa pontas abaixo do chão). Cotas: A fio, B braço, C espaço, D vão, E queda, F altura.

**Flowerpot (`src/antennas/flowerpot/`, 2026-10-21):** dipolo vertical de RG-58 em conduíte (vivo sem malha em cima, coaxial embaixo, bobina do
cabo como choke). Fonte: J. Bishop, VK2ZOI (https://vk2zoi.com/articles/half-wave-flower-pot/): protótipo de 2 m (457/447 mm, ROE mínima ≈ 146 MHz
LIDA NA CURVA) calibra os fatores (≈ 0,890 e 0,871 de λ/4); o de 6 m (1273/1245 mm, ≈ 52,4 MHz) confere a 0,1 %. Bobina: tabela do VK2ZOI (RG-58,
tubos de 25/32/50 mm, ressonância 47–160 MHz) com alvo 5,5 % abaixo da operação, interpolada e arredondada a meia espira (para menos numa frequência,
para mais na faixa toda): dá 9 espiras em 25 mm no 2 m, como o protótipo. Sem tubo: +2 % (estimativa do VK2ZOI, "2 % ou talvez 3 %"). Fora da
tabela (ex.: 70 cm, 10 m) não dá espiras e avisa. Banda: mínimo de 2,7 % para ROE < 1,5:1, das curvas medidas (um protótipo de cada).

**Moxon (`src/antennas/moxon/`, 2026-10-21):** medidas pelas equações de L. B. Cebik, W4RNL, "Designing Moxon Rectangles by Equation and
by Model" (AntenneX, 2000; espelho https://antenna2.github.io/cebik/content/moxon/moxgen.html; os mesmos coeficientes do MoxGen,
https://jedsoft.org/slang/slshapps/moxgen.sl, achado pelo projeto webantenna). Regressão em x = log10(d/λ), válida de 1e-5 a 1e-2 λ (fora disso avisa).
Teste: as equações reproduzem a tabela 2 do artigo a ±0,0015 λ. Impedância, ganho, F/C, banda e padrões por MoM (`moxon-model.ts`: dois fios em U
sem junções, 200 trechos/λ; com 100 os fios grossos ficam 3 Ω abaixo) conferidos com os três exemplos NEC do artigo (7,15 MHz #12, 28,5 MHz 1",
146 MHz 1/8"): ganho ±0,1 dB, R ±5 %, X ±3 Ω. Cotas: A largura, B cauda do excitado, C folga, D cauda do refletor, E profundidade, F cada metade
do excitado esticada, G refletor esticado, H espaço central. Os testes com MoM pesado usam `{ timeout: 60_000 }` no `describe`.

**Fator K pelo diâmetro (`core/dipole-resonance.ts` + `antennas/k-factor.ts`, 2026-10-21):** K = comprimento ressonante do dipolo reto no espaço
livre / (λ/2), pelo MoM (só depende de d/λ). Trechos de pelo menos 3 raios (o núcleo reduzido dispara com trechos menores), até 80: 80 nos fios finos,
20 no limite de 1,5e-2 λ (λ/2d = 33). Conferido com o NEC-4 do Cebik (AWG #12 a 3,75 MHz: 0,12 %; o V invertido também confere em comprimento absoluto
a 0,3 %) e com o ARRL 21, Fig 8 (NEC-4.1) a 0,3 %. Fica 0,1 % (fio fino) a ≈ 1,3 % (λ/2d = 33) abaixo do ajuste K = 1 − 0,225/ln(λ/2d) do webantenna,
que diverge da própria Fig 8 em até 1,4 %. O Rothammel dá K 1 a 3 % maior (só citado). Faixa: 1e-8 a 1,5e-2 λ; fora dela usa o K do limite e avisa (condutor grosso: K do limite é maior que o real, a medida sai
comprida, o lado seguro). SEMPRE calculado, sem K manual, em: dipolo, ground plane (radiador por imagens e radiais com o mesmo K: premissa, o MoM não
tem junções), ADS-B, J-pole (radiador; a seção de casamento é linha e mantém o fator digitado), turnstile, V invertido (K × alongamento), Yagi e
cross Yagi (excitado) e double bazooka (K do fio das pontas, novo campo `wireDiameter`: dá o comprimento mais longo; o K com o diâmetro do coaxial
aparece no aviso). Não se aplica a: colinear (fator de ponta 0,97 da fonte do projeto), Moxon, quadra, flowerpot, discone, QFH e helicoidal (equações
próprias). Em HF, com fio de 2 mm, dá até ≈ 3 % a mais que a regra 468/f (que embute isoladores e isolamento).

**Exposição a RF:** conferida em 2026-10-17. A Resolução Anatel 700/2018 (Art. 4º § 1º) adota a ICNIRP via Ato; o Ato
458/2019 foi revogado e substituído pelo Ato 17.865 (em vigor desde 01/03/2024, fonte secundária
https://dplnews.com/?p=220353). A minuta (Consulta Pública 63/2022) usa a ICNIRP 2020 com os mesmos valores de
`src/data/rf-exposure-limits.ts`. Falta ler o texto final do Ato 17.865.

**Cross Yagi (`src/antennas/cross-yagi/`, 2026-10-19):** dois Yagis idênticos girados 90° com os elementos no mesmo plano; os
elementos vêm da Yagi (NBS ou DL6WU), para qualquer frequência. Alimentação: Yagi A direto e Yagi B por linha de 1/4 de onda (cota **F**) com
impedância igual à do Yagi; junção em Z/2 e transformador **T** só se não der 50 Ω. Fonte: LY3H (https://www.ly3h.net/uhf-9v-9h-hand-cross-yagi-for-satellite/),
que dá 436,5 MHz, Yagis de 100 Ω e 113 mm de linha (teste: VF 0,66), mas NÃO as medidas dos elementos. Divergência não resolvida na página: um
comentário cita RG-62 com VF 0,83 e 142 mm. Cada Yagi
é casado a 50 Ω pelo seu gamma (`yagiImpedance` só no código, com `gammaMatch: 0`), linha F de 50 Ω, junção de 25 Ω e T de 35,4 Ω (aviso: dois coaxiais de 75 Ω em
paralelo dão 37,5 Ω e ROE ≈ 1,1); cada gamma recebe metade da potência; o "braço vivo" é a metade com a barra. Padrão por momentos.

**Diâmetro do condutor e gap central (2026-10-20):** REGRA: o comprimento de um elemento partido ao meio é SEMPRE de ponta a ponta e já inclui o
espaço central (como no dipolo); cada braço mede (total − espaço)/2; o espaço é uma entrada em mm com padrão 10 mm (pedido do usuário, 2026-10-21; 0 = elemento inteiro) e só vale para o elemento excitado
(refletor e diretores seguem inteiros). Onde há entrada: dipolo (`conductorDiameter`, `centerGap`: A total, B braço, C espaço); V invertido (C espaço); double bazooka (`centerGap` = corte da malha, E);
Moxon (`centerGap`, H); turnstile (`conductorDiameter`, `centerGap`; B braço, E espaço; o espaço PRECISA ser maior que o diâmetro do condutor, senão o calc
recusa: os braços dos dois dipolos se cruzam no centro e encostariam); Yagi e cross Yagi (`elementDiameter`, `boomDiameter`; excitado INTEIRO, por causa do gamma; `drivenGap` só no código, com `gammaMatch: 0`: DE total, DB braço, DG espaço); quadra cúbica (`wireDiameter`, `feedGap`: H perímetro, J fio a cortar = H − espaço, K espaço); QFH (`wireDiameter`: só no padrão, as medidas são as de 4,1 mm;
`centerGap`: abertura no meio do braço de cima de cada espira, onde liga a alimentação, dentro do comprimento da espira: A e E espira, I e J fio a cortar = espira − K,
K espaço; também PRECISA ser maior que o diâmetro do condutor, porque os braços de cima das duas espiras se cruzam no centro; o padrão por momentos não modela a abertura);
discone (`rodDiameter`, `centerGap`: folga F, 0 = proporção do exemplo de Stearns; EXCEÇÃO à regra: a folga fica ENTRE as hastes e não entra em A nem E, porque
as medidas dos livros são das hastes; o padrão continua 0 = automática, porque é outra grandeza). Sem gap: ground plane, J-pole, helicoidal, loop magnética, colinear de coaxial.
A cross Yagi tem o mesmo cruzamento no centro que a turnstile, mas a regra "espaço > diâmetro" não foi pedida para ela (não aplicada). O diâmetro muda os parasitas da Yagi (correção
NBS/DL6WU) e a impedância do stub do J-pole; em todas as antenas com elementos de meia onda ele dá o K (ver acima); na quadra é informativo (perímetros para fio fino).
A regra "gap dentro do comprimento total" é a convenção usual de comprimento ponta a ponta, não foi conferida em livro (ARRL Antenna Book e NBS TN 688 não consultados).

**Polarização circular (2026-10-20):** cross Yagi, turnstile, QFH e helicoidal têm o campo `circularSense` (RHCP/LHCP, botões de opção; `antennas/circular.ts`)
e devolvem `CalcResult.assembly` (seção "Montagem" na tela) e, nas cruzadas, o diagrama de polaridade dos braços. `core/polarization.ts` (`circularSense`) define a convenção
(IEEE 145; Ey atrasado 90° = RHCP) e o teste valida a fase do solver. Regras: pares cruzados, o vivo do elemento atrasado fica 90° no sentido horário (RHCP) ou
anti-horário (LHCP) do vivo do direto, olhando na direção do feixe; QFH direita→LHCP, esquerda→RHCP; helicoidal direita→RHCP (Kraus). Na interface, campo `kind: 'boolean'`
(checkbox) e `kind: 'choice'` (radio) em `ParamSpec`: o `calc` recebe números, a tela nunca mostra 0/1. `enabledBy: '<chave de um boolean>'`
(2026-10-22, pedido do usuário): o campo vai no mesmo cartão da caixa de seleção e fica desativado quando ela está desmarcada (turnstile:
"Com refletor" + "Tipo de refletor"); o `calc` continua recebendo o valor e deve ignorá-lo. O teste do registro exige que a caixa venha antes.

### Pendências

**Falta fonte (não implementar de memória). O usuário precisa fornecer o livro/PDF:**
- QFH: equações do Kilgus (IEEE, paywall).
- Padrão de irradiação da helicoidal (Kraus; o Rothammel só traz as fórmulas de ganho e ângulo) e da colinear. O padrão do discone e da QFH vem de
  modelo por momentos sem comparação com medidas.
- Texto final do Ato 17.865 da Anatel.

**Deixado pendente por decisão do usuário (2026-10-28: "não implemente a regra do refletor da turnstile ainda"):** a regra do Rothammel para o
refletor da turnstile (§24, p. 346–347: a tela passa pelo menos λ/2 além da antena de cada lado, malha ≤ λ/20, espaçamento 0,1 a 0,3λ; tubo dá
≈ +3 dB e tela até ≈ 7 dB). Hoje o tamanho vem do estudo por momentos (ver Turnstile abaixo).

**Fontes avaliadas e descartadas:** pcbantenna.com (sem fórmulas completas nem referências; ver a memória do
projeto). A página do YO5OSF com saída do AntMaker não bate com o DL6WU.BAS (outra versão).

**`TODO(fonte)` nas antenas existentes:**
- Cross Yagi: impedância real de cada Yagi com dipolo simples ou dobrado; efeito do cruzamento (acoplamento) e razão axial; regra de montagem do sentido RHCP/LHCP
  foi derivada (Ey atrasado 90°), não tirada de fonte; confirmar com um passe de satélite.
- Yagi: divergência entre a tabela e a curva do NBS TN 688 no projeto de 0,4λ. DL6WU: os artigos originais do Hoch não
  foram consultados e não há comparação com dados medidos. Gamma match: excitado e impedância do modelo (sem boom e sem a barra), sem medida;
  a regra de barras mais finas que 1/3, a folga mínima e a correção do boom no excitado são critérios desta ferramenta.
- Quadra cúbica: ganho e impedância só do modelo, sem medida; impedância diverge do Electronics Notes.
- Discone: regra do gap (ARRL: 2 a 12", Rothammel: 100 mm no exemplo; nenhuma regra geral); ganho só do modelo, sem medida; ROE na ponta de baixo
  (livros: boa já na menor frequência; modelo: só a partir de ≈ 1,4×) não conferida com medida.
- Colinear de coaxial: tabela de ganho vem de fonte de radioamador; impedância da seção de baixo não consta.
- Loop magnética: regra do loop de acoplamento (diâmetro ≈ 1/5) sem fonte (o ARRL 21 só traz o gamma do W5QJR).
- QFH: medidas são a saída da calculadora de Coppens a 137,5 MHz, escaladas; faltam as equações (Kilgus). Os "separadores" foram reconstruídos (ver os padrões). Falta o arranjo real de alimentação (qual espira adianta, junção); o sentido vem do modelo.
- Turnstile: impedância e ganho só do modelo, sem medida. O TAMANHO do refletor (tela quadrada de 1λ, vãos ≤ 0,05λ, mínimo 0,75λ; opção `reflectorKind`: um tubo de 0,5λ alinhado com cada dipolo, F/B ≈ 9 dB contra ≈ 18 dB da tela, e crítico: ≤ 0,45λ vira diretor) vem de um estudo por momentos (`turnstile/reflector-model.ts`, sem medida nem regra publicada: TODO(fonte)); a pesquisa na web só achou relatos de espaçamento (0,2 a 0,37λ muda o diagrama vertical) e nenhuma dimensão de refletor. O estudo dá ≈ +5,7 dB
  com a tela, acima do "+3 dB" da Wikipedia (Milligan), que deixou de ser usado; Milligan não foi lido.
- Hairpin: sem efeito de cantos e barra de curto (o ARRL não trata); faixa de uso (25 a 35 Ω) vem de relatos de radioamadores.
- Ground plane: banda indicativa (Q do dipolo escalado); curva do ARRL só até 80°. ADS-B: ganho e alcance típicos.
- Double bazooka: artigo do W2DU não lido.
- Balun de coaxial: modelo de ferrite (aquecimento, saturação) sem fonte, e sem receita de contas para VHF/UHF; bobina de cabo em VHF/UHF sem fonte
  (a tabela do ARRL vai até 28 MHz; em VHF/UHF a ferramenta é a manga de λ/4).
- Helicoidal: tolerância medida da impedância (Kraus e Rothammel só dão o valor central).
- V invertido: só espaço livre (o solo muda ressonância e impedância; o Cebik tem tabelas sobre solo médio, não implementadas).
- Flowerpot: só um projeto (VK2ZOI), sem fórmula; fatores dependem do RG-58 sólido e do conduíte cinza. Bobinas fora de 47–160 MHz sem tabela.
  Frequências das ROE mínimas lidas nas curvas (±0,3 MHz). Ganho e perda da bobina não medidos.
- Moxon: tolerância da folga C escalada do 1/4" do 2 m (Cebik); sem perdas no modelo; o QST de Lumpkin e Cerrito (jan. 2000) não foi lido.
- Banda (ver "Largura de banda"): colinear e QFH sem estimativa de ROE; discone com a faixa do Rothammel e a ponta de baixo do modelo; J-pole só com a medida de Fong; ground plane indicativa; Yagi,
  quadra e cross Yagi sem comparação com medida (só com o próprio modelo); o artigo original de Yaghjian e Best e o Balanis/IEEE 145 (razão axial
  de 3 dB) não foram lidos.

**Antenas sugeridas para adicionar (ordem recomendada; EM ESPERA desde 2026-10-22, decisão do usuário: "não precisamos mais
implementar antenas por enquanto"; a página inicial também fica como está, sem o subtítulo novo nem a linha por cartão):**
1. V-dipolo para satélites meteorológicos (137 MHz). O `v-model.ts` do V invertido serve de base (é o mesmo fio dobrado, deitado).
2. Dipolo multibanda (fan dipole), EFHW com unun 49:1 (exige dados de ferrite com fonte) e log-periódica.

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