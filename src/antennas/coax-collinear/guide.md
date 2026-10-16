# Colinear de coaxial

## 1. Visão geral

Uma antena vertical feita só de cabo coaxial: um **chicote** de 1/4 de onda no topo, várias seções de
**meia onda** de coaxial e uma seção de **1/4 de onda** embaixo. Em cada junção entre seções, o vivo de uma
liga na malha da outra (e vice-versa). Isso mantém as correntes na superfície externa em fase, e as seções
irradiam juntas, como uma pilha de dipolos.

- **Uso:** recepção e transmissão em VHF/UHF (escuta, APRS, repetidoras, bandas de 70 cm).
- **Polarização:** vertical.
- **Diagrama:** omnidirecional no plano horizontal, com o lóbulo achatado em elevação. Mais seções, mais ganho e lóbulo mais estreito.
- **Ganho:** de 3 a 4 dBi (2 seções) até 8 a 9 dBi (6 a 8 seções), segundo a fonte de radioamador. O valor real é menor, pelas perdas do cabo.
- **Dificuldade:** o comprimento das seções depende do fator de velocidade (VF) real do seu cabo. É a antena mais sensível a erro de medida.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Coaxial das seções | RG-58 ou RG-213 (VF ≈ 0,66), ou coaxial de espuma (VF 0,78 a 0,85) | RG-6 de TV (VF ≈ 0,8; confira, varia por marca) |
| Chicote | Fio de cobre rígido de 2 a 3 mm, ou vareta | Fio de aço inox de solda, vareta de latão |
| Conector | N ou SO-239 de painel | Conector N (melhor em UHF) |
| Abrigo | Tubo de PVC ou de fibra, tampado | Cano de PVC de esgoto, com tampa de silicone neutro |
| Choke | Ferrites em clipe ou espiras do próprio cabo | Algumas espiras do coaxial em bobina |

## 3. Ferramentas

Estilete, descascador de coaxial, **paquímetro**, ferro de solda de 60 W ou mais, estanho, trena e NanoVNA.
**Descubra o VF do seu cabo** (datasheet ou medindo com NanoVNA) antes de cortar.

## 4. Passo a passo

1. Calcule as medidas na ferramenta com o VF do seu cabo. **A** é o chicote, **B** é cada seção de meia
   onda, **C** é a seção de baixo, **D** o comprimento total e **E** o coaxial total necessário.
2. Corte as seções com **B** e **C**, medindo o cabo **sem a capa** nas pontas, e some uma sobra de
   alguns milímetros por ponta para as ligações.
3. Em cada seção, descasque as duas pontas: corte a capa, afaste a malha e libere o vivo.
4. Ligue as seções com **vivo ↔ malha**: o vivo da seção de baixo liga na malha da seção de cima, e a malha
   da de baixo no vivo da de cima, em cada junção. Solde sem aquecer demais o dielétrico.
5. No topo, ligue o chicote **A** apenas ao vivo da seção de cima; a malha fica livre.
6. Na base, ligue a seção de baixo **C** ao conector (vivo e malha nos pinos certos).
7. Instale o choke logo depois do conector.
8. Coloque dentro do tubo, vede as pontas e instale na vertical.

## 5. Alimentação e casamento

A seção de baixo é um **transformador de 1/4 de onda**, e a impedância na base sobe com o número de seções
(costuma passar de 50 Ω). Com poucas seções (2 a 4) a antena às vezes chega perto de 50 Ω só pela geometria.
Se a ROE ficar alta, desloque o ponto de alimentação alguns centímetros: mais para cima sobe a impedância, mais
para baixo, desce. O **choke** na entrada é obrigatório: sem ele o cabo até o rádio vira parte da antena.

## 6. Ajuste

1. Meça a ROE com NanoVNA, em varredura, com o rádio desligado.
2. Se a menor ROE está **abaixo** da frequência desejada, encurte o chicote de 2 a 3 mm por vez.
3. Se está **acima**, as seções provavelmente estão curtas (erro de VF). Confira o VF.
4. Mexa no cabo do rádio: se a ROE mudar, o choke não está resolvendo.
5. Meça de novo com a antena no tubo, na posição final.

## 7. Erros comuns

- Usar o VF "de tabela" em vez do VF do seu cabo: o erro vira erro de frequência.
- Esquecer de trocar vivo e malha nas junções: as seções ficam fora de fase e o ganho vai embora.
- Ligar o chicote na malha: ele deve ligar só no vivo.
- Dobrar o cabo com raio pequeno, deformando o dielétrico.
- Água dentro do cabo ou do tubo.
- Antena torta: com mais seções, o lóbulo é estreito e qualquer inclinação aponta o ganho para o céu ou para o chão.

## 8. Notas de transmissão e segurança

- **Tensão alta na ponta do chicote** em transmissão: instale fora do alcance de pessoas.
- **Potência:** confira a potência máxima do cabo na frequência. Cabo fino aquece com muita potência; cada seção é só alguns centímetros de cabo, mas a corrente é alta.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Exposição a RF:** mantenha distância durante a transmissão. Estime a distância na ferramenta "Exposição a RF".
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Trabalho em telhado ou em altura exige equipamento de proteção e companhia.

## 9. Referências

- Electronics Notes, "Coaxial Collinear Antennas" (equações das seções e do chicote).
- dmrhub.ru, "70 cm collinear antenna: calculation and building from coax" (fórmula em mm, ganhos por número de seções).
- N1HFX, "Build a 9 dB 70 cm Collinear Antenna from Coax" (repeater-builder.com), citado pelo dmrhub.ru e não consultado diretamente.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
