# Turnstile (dipolos cruzados)

## 1. Visão geral

Dois dipolos de meia onda **cruzados a 90°** e alimentados com **defasagem de 90°**. O resultado depende da montagem:

- **Com refletor a 1/4 de onda atrás** (modo axial): polarização **circular** apontando para cima. É a montagem
  clássica para satélites meteorológicos de 137 MHz.
- **Sem refletor** (modo normal, mastro vertical): diagrama quase omnidirecional na horizontal, com polarização linear horizontal.

- **Uso:** recepção e transmissão.
- **Ganho:** o refletor a 1/4 de onda soma 3 dB ao turnstile sem refletor (Wikipedia, citando Milligan). Não há valor absoluto com fonte nesta ferramenta.
- **Tamanho do refletor:** uma tela metálica **quadrada de 1λ de lado** (cota **G**; a 137,5 MHz, ≈ 2,18 m), com vãos de no máximo **0,05λ** (cota **H**), centrada sob os dipolos. Um disco do mesmo diâmetro também serve. O mínimo razoável é **0,75λ**: abaixo disso a antena irradia muito para baixo (com 0,5λ, a relação frente–costas do modelo cai para ≈ 8 dB). Esses números **não vêm de livro**: saem de um modelo por momentos desta ferramenta (condutor perfeito, sem mastro nem cabos), em que 0,75λ dá frente–costas de ≈ 16 dB, 1λ de ≈ 18 dB e ganho de ≈ 7,8 dBi; acima de 1λ não houve melhora estável. Confira medindo.
- **Refletor de tubos (opção "Um tubo alinhado com cada dipolo"):** dois tubos de **0,5λ** (cota **G**; a 137,5 MHz, ≈ 1,09 m), um paralelo a cada dipolo e centrado sob ele, a **D** dos dipolos. Os dois tubos se cruzam: deixe-os em **camadas separadas** (um uns centímetros abaixo do outro), sem se tocar. É mais simples, mas pior: no modelo, ganho de ≈ 5,6 dBi e relação frente–costas de ≈ 9 dB, contra ≈ 7,8 dBi e ≈ 18 dB da tela de 1λ. O comprimento é **crítico** como o do refletor de uma Yagi: com 0,45λ ou menos o tubo vira diretor (a antena passa a irradiar mais para baixo que para cima), e acima de 0,55λ o desempenho cai. Corte com sobra e ajuste medindo. Se quiser mais frente–costas com tubos, são necessários pelo menos cinco por direção, o que já se aproxima de uma tela. Valores de modelo, sem medida.
- **Aviso importante:** a impedância com o refletor não consta das fontes consultadas. Meça e ajuste.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Braços (4) | Tubo de alumínio ou vareta de 4 a 6 mm | Fio de cobre rígido de 3 a 4 mm |
| Suporte do cruzamento | Bloco de PVC ou nylon com furos | Caixa plástica estanque |
| Linha de fase | Coaxial de **75 Ω** (RG-59, RG-6) | RG-58 de 50 Ω (aceitável, com perda na pureza da polarização) |
| Cabo até o rádio | Coaxial de 50 Ω | RG-58 curto |
| Refletor (quadrado de lado **G**) | Tela metálica ou hastes | Chapa de alumínio, tela de galinheiro com vãos de até **H** (se o vão for maior, cubra com tela mais fina) |
| Mastro | Tubo de PVC ou fibra (não metálico, perto dos dipolos) | Cano de PVC |

## 3. Ferramentas

Trena, paquímetro, serra, ferro de solda, estilete, descascador de coaxial, NanoVNA.

## 4. Passo a passo

1. Calcule as medidas com o seu VF. **A** é o comprimento de cada dipolo (de ponta a ponta, incluindo o espaço central), **B** o braço (`(A − E)/2`), **C** a linha de fase, **D** a distância ao refletor, **G** o lado do refletor, **H** o vão máximo da tela e **E** o espaço central de cada dipolo (só aparece se você informar um valor).
2. Corte os quatro braços com **B** (com sobra para ajuste, por igual nos quatro).
3. Monte os dois dipolos cruzados a 90° no suporte: um fica levemente acima do outro, isolados entre si. A posição dos braços vivos define o **sentido da polarização** (veja a seção 5).
4. Corte a linha de fase com **C**, medindo o cabo **sem a capa** nas pontas.
5. Ligue o dipolo 1 direto na junção e o dipolo 2 pela linha de fase (esquema na seção de alimentação).
6. Instale o choke no cabo que vai ao rádio.
7. Monte o refletor (quadrado de lado **G**, vãos de até **H**) e fixe-o a **D** dos dipolos, **centrado** sob o cruzamento e paralelo ao plano dos dipolos, com espaçadores isolantes. Una as hastes ou fios da tela entre si e solde ou aperte bem as emendas. Ligue a malha do cabo ao refletor só se o seu balun ou choke pedir (veja a seção de alimentação).
8. Instale com o eixo apontado para cima, longe de objetos metálicos.

## 5. Alimentação e casamento

O dipolo 1 liga direto na junção; o dipolo 2, por um coaxial de 1/4 de onda. Se a impedância dessa linha for igual à resistência de cada
dipolo (≈ 73 Ω), as correntes ficam **iguais em módulo e a 90°**, e a impedância na junção é a metade, ≈ 36,5 Ω (dois dipolos em paralelo),
ou seja, ROE ≈ 1,4:1 em 50 Ω sem refletor. Com o refletor o valor muda: **meça**. 

**Sentido da polarização (RHCP ou LHCP).** O campo gira do dipolo adiantado (o direto) para o atrasado (o da linha de fase). Olhando de **baixo para cima**
(na direção do feixe, com o eixo apontado para o céu), se o braço vivo (condutor central) do dipolo atrasado está 90° no sentido **horário** do braço vivo
do dipolo direto, a polarização é circular à **direita** (RHCP, convenção IEEE); no sentido **anti-horário**, circular à **esquerda** (LHCP). Visto de cima é o inverso.
Para trocar de um para o outro, inverta vivo e malha do dipolo atrasado ou troque qual dipolo recebe a linha de fase. A ferramenta mostra o método e o desenho
para o sentido que você escolher. Esta regra é derivada do atraso de fase, não de uma fonte escrita: confirme com um passe real. A forma exata de ligar vivo e malha de cada dipolo (balun) depende da montagem: use choke de corrente.

## 6. Ajuste

1. Meça a ROE na junção com o NanoVNA, em varredura, longe de objetos.
2. Encurte os quatro braços por igual, aos poucos, até a menor ROE cair na frequência desejada.
3. Confirme em recepção real: um passe de satélite mostra se a polarização circular e o diagrama estão certos.
4. Mexa no cabo: se a ROE mudar, o choke é insuficiente.

## 7. Erros comuns

- Dipolos que não estão a 90° ou braços de comprimentos diferentes: a polarização deixa de ser circular.
- Usar o VF "de tabela" em vez do VF do seu cabo: a defasagem não fica em 90°.
- Linha de fase de impedância muito diferente da do dipolo: correntes desiguais.
- Esquecer o choke.
- Mastro metálico perto dos dipolos.
- Os dois dipolos se tocando no centro.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas** dos dipolos em transmissão: instale fora do alcance de pessoas e use isoladores adequados.
- **Potência:** confira a potência máxima do coaxial da linha de fase e do cabo ao rádio.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de bandas e os limites de potência vigentes (Anatel e LABRE).
- **Exposição a RF:** com refletor, o ganho aponta para cima; estime a distância na ferramenta "Exposição a RF".
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Trabalho em telhado ou em altura exige equipamento de proteção e companhia.

## 9. Referências

- Wikipedia, "Turnstile antenna" (consultada em 2026-10-16), que cita Kraus, *Antennas*, 2ª ed., 1988, pp. 726–729; Milligan, *Modern Antenna Design*, 2ª ed., 2005, pp. 231–237; G. Brown, US 2.086.976. Os livros não foram consultados diretamente.
- Balanis, *Antenna Theory*, §4.6 (resistência do dipolo de meia onda).
- Pozar, *Microwave Engineering*, cap. 2 (linha de 1/4 de onda).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
