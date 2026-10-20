# Cross Yagi (polarização circular)

## 1. Visão geral

Uma cross Yagi são **dois Yagis idênticos** no mesmo boom, **girados 90°** um em relação ao outro, com os elementos
**cruzados nas mesmas posições** (no mesmo plano). O Yagi A é ligado direto na junção; o Yagi B, por um trecho de
coaxial de 1/4 de onda, que atrasa a corrente em 90°. Duas ondas lineares perpendiculares, com 90° de defasagem e o mesmo
módulo, formam uma onda **circular**.

- **Uso:** recepção e transmissão. É a antena clássica de satélites em 137, 145 e 435 MHz: o satélite gira e o sinal passa
  pela ionosfera (rotação de Faraday), então a polarização linear desvanece; a circular não.
- **Polarização:** circular. O sentido (direita ou esquerda) depende de qual Yagi recebe a linha defasadora (seção 5).
- **Ganho:** igual ao do Yagi isolado, mas em dBic: a potência se divide entre as duas polarizações e os campos se somam
  em potência (derivação, com quadratura perfeita). O valor vem do método escolhido (NBS ou DL6WU).
- **Medidas:** os elementos (**R**, **DE**, **D1**, **D2**, **D3**… e as posições **E**, **S** ou **P1**, **P2**…, além do boom **L**) vêm do cálculo
  da Yagi, para qualquer frequência. A linha defasadora é **F**; **T** aparece só se os Yagis não forem de 100 Ω (transformador).
- **Fonte da montagem:** o projeto de LY3H em 436,5 MHz (ver as referências). A página não traz as medidas dos elementos, só a
  alimentação; por isso os comprimentos aqui são os da Yagi (NBS/DL6WU), não os dele.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Elementos | Vareta de alumínio de 3 a 6 mm | Vareta de solda de latão |
| Boom | Tubo quadrado de alumínio ou de PVC | Cabo de vassoura tratado |
| Suporte do cruzamento | Bloco de nylon ou PVC com furos ou ranhuras perpendiculares | Caixa plástica estanque |
| Elemento excitado | Dipolo dobrado (≈ 100 Ω) ou simples (impedância baixa: meça) | Fio de cobre rígido |
| Linha defasadora | Coaxial de impedância **igual à do Yagi** (para 100 Ω, RG-62 de ≈ 93 Ω é o mais comum) | Dois coaxiais de 50 Ω em paralelo (≈ 25 Ω) se os Yagis forem de 25 Ω |
| Cabo até o rádio | Coaxial de 50 Ω | RG-58 curto |
| Mastro | PVC ou fibra perto da antena | Cano de PVC |

## 3. Ferramentas

Serra, lima, furadeira, trena, **paquímetro**, ferro de solda, descascador de coaxial, **NanoVNA** (muito recomendado: sem ele
fica difícil conferir a defasagem e a impedância dos Yagis).

## 4. Passo a passo

1. Calcule as medidas com o diâmetro de elemento e de boom que você realmente vai usar. **R** é o refletor, **DE** o excitado,
   **D1**, **D2**, **D3**… os diretores; **E** a distância refletor→excitado, **S** o espaçamento dos diretores (ou as posições **P1**, **P2**…
   no DL6WU) e **L** o comprimento do boom entre centros. Com **espaço central do excitado** informado, **DE** segue de ponta a ponta
   (incluindo o espaço) e aparecem **DB** (cada braço, `(DE − DG)/2`) e **DG**.
2. Corte **dois** de cada elemento (um para cada Yagi), com tolerância de 0,003λ. Veja a folha de corte.
3. Marque no boom as posições, medidas a partir do refletor, como na Yagi comum.
4. Em cada posição, monte um elemento horizontal e um vertical **cruzados no centro**, no mesmo plano. Os dois ficam isolados um do
   outro; afaste um do outro só o suficiente para isolar (poucos milímetros).
5. Monte os dois elementos excitados com o ponto de alimentação isolado do boom. Eles não podem se tocar no centro.
6. Corte a linha defasadora **F**, medindo o cabo **sem a capa** nas pontas, e confira o VF do seu cabo (ver a seção 6).
7. Ligue o Yagi A direto na junção e o Yagi B pela linha **F** (esquema do diagrama).
8. Se a junção não ficou em 50 Ω, corte o transformador **T** e ligue entre a junção e o cabo.
9. Instale um choke de corrente no cabo, logo depois da junção.
10. Monte no mastro com a frente (diretores) apontada para o alvo.

## 5. Alimentação e casamento

- Com a linha **F** de impedância igual à de cada Yagi, as duas correntes têm o **mesmo módulo e 90° de defasagem**, e a impedância na junção é a metade da de
  cada Yagi. Com Yagis de 100 Ω (excitado dobrado) a junção cai em **50 Ω**, direto no cabo. Foi o que o LY3H mediu: ROE ≈ 1,1 em 436,5 MHz.
- Com Yagis de outra impedância (por exemplo um dipolo simples), a junção fica em Z/2 e é preciso um transformador de 1/4 de onda **T** de √(50·Z/2) Ω.
  A impedância de cada Yagi não vem do NBS nem do DL6WU: **meça o seu Yagi isolado** no NanoVNA e informe na ferramenta.
- **Sentido da polarização (RHCP ou LHCP):** o campo gira do Yagi adiantado (A, direto) para o atrasado (B, pela linha **F**). Olhando de trás da antena (do lado dos
  refletores) para a frente, na direção do feixe, se o braço vivo (condutor central) do excitado do Yagi B está 90° no sentido **horário** do braço vivo do excitado do A, a
  polarização é circular à **direita** (RHCP, convenção IEEE); no sentido **anti-horário**, circular à **esquerda** (LHCP). Para trocar, inverta vivo e malha do excitado do B
  ou troque qual Yagi recebe a linha. A ferramenta mostra o método e o desenho para o sentido que você escolher. A regra é derivada do atraso de fase, não de fonte escrita
  (TODO(fonte)). Satélites meteorológicos de 137 MHz usam RHCP; confirme o sentido do seu satélite e, no ar, num passe real.

## 6. Ajuste

1. **Cada Yagi sozinho:** com o outro desconectado, meça o Yagi A e depois o B. Eles devem ter a mesma ROE mínima e a mesma frequência. Corte o excitado comprido e encurte
   os dois por igual, aos poucos.
2. **Linha defasadora:** deixe a ponta do Yagi B aberta e meça no NanoVNA o cabo **F** sozinho: a impedância de entrada é um curto (perto de 0 Ω na Carta de Smith) na frequência
   em que o cabo tem **1/4 de onda elétrico**. Se não está na frequência do projeto, o VF do seu cabo não é o que você supôs: corte para acertar. Um erro de 10 % no VF é um erro de 9° na defasagem.
3. **Conjunto:** ligue tudo e meça a ROE na entrada do cabo. Mexa no cabo: se a ROE mudar, o choke é insuficiente.
4. **No ar:** num passe de satélite, compare o sinal com a antena virada de lado: o desvanecimento por giro deve sumir.

## 7. Erros comuns

- Linha defasadora com o VF errado: a defasagem sai diferente de 90° e a polarização fica elíptica.
- Coaxial de impedância diferente da dos Yagis: as correntes ficam desiguais.
- Os elementos excitados se tocando no centro, ou um Yagi deslocado muito à frente do outro (fora do mesmo plano).
- Um Yagi com ROE ou frequência diferente do outro.
- Trocar o sentido da polarização sem querer (qual Yagi recebe a linha).
- Boom metálico sem informar o diâmetro, ou mastro metálico perto dos elementos.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas dos elementos** em transmissão: mantenha pessoas e fios longe.
- **Potência concentrada na frente:** o ganho é o do Yagi. Estime a distância segura na ferramenta "Exposição a RF".
- **Potência:** confira a potência máxima do coaxial da linha defasadora (que costuma ser fino) e do cabo ao rádio.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - A antena pega vento (dois Yagis) e o torque num rotor é grande: dimensione o mastro e o rotor para isso.

## 9. Referências

- LY3H (Žilvinas), "UHF 9V + 9H hand cross Yagi for satellite", https://www.ly3h.net/uhf-9v-9h-hand-cross-yagi-for-satellite/
  (consultada em 2026-10-19): 436,5 MHz, Yagis de 100 Ω em paralelo, linha de 113 mm, ROE ≈ 1,1. Os comentários da página citam RG-62 com VF 0,83 (linha de 142 mm), o que
  não bate com os 113 mm; a divergência não é explicada.
- P. P. Viezbicke, *Yagi Antenna Design*, NBS Technical Note 688, 1976, https://doi.org/10.6028/NBS.TN.688 (elementos, método 1).
- G. Hoch, DL6WU, e o programa DL6WU.BAS (G3SEK, 2006): http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas (elementos, método 2).
- Pozar, *Microwave Engineering*, cap. 2 (linha de 1/4 de onda).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- Padrão de irradiação: soma dos campos de dois Yagis iguais, o segundo girado 90° e defasado de −90°, cada um calculado por método dos momentos (ver o guia do Yagi), sem acoplamento entre eles.
