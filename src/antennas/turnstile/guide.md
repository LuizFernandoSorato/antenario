# Turnstile (dipolos cruzados)

## 1. Visão geral

Dois dipolos de meia onda **cruzados a 90°** e alimentados com **defasagem de 90°**. O resultado depende da montagem:

- **Com refletor a 1/4 de onda atrás** (modo axial): polarização **circular** apontando para cima. É a montagem
  clássica para satélites meteorológicos de 137 MHz.
- **Sem refletor** (modo normal, mastro vertical): diagrama quase omnidirecional na horizontal, com polarização linear horizontal.

- **Uso:** recepção e transmissão.
- **Ganho:** o refletor a 1/4 de onda soma 3 dB ao turnstile sem refletor (Wikipedia, citando Milligan). Não há valor absoluto com fonte nesta ferramenta (TODO).
- **Aviso importante:** esta ferramenta calcula os dipolos, a linha de fase e a distância ao refletor. O **tamanho do refletor** e a impedância com o refletor não constam das fontes consultadas (TODO). Meça e ajuste.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Braços (4) | Tubo de alumínio ou vareta de 4 a 6 mm | Fio de cobre rígido de 3 a 4 mm |
| Suporte do cruzamento | Bloco de PVC ou nylon com furos | Caixa plástica estanque |
| Linha de fase | Coaxial de **75 Ω** (RG-59, RG-6) | RG-58 de 50 Ω (aceitável, com perda na pureza da polarização) |
| Cabo até o rádio | Coaxial de 50 Ω | RG-58 curto |
| Refletor | Tela metálica ou hastes | Chapa de alumínio, tela de galinheiro |
| Mastro | Tubo de PVC ou fibra (não metálico, perto dos dipolos) | Cano de PVC |

## 3. Ferramentas

Trena, paquímetro, serra, ferro de solda, estilete, descascador de coaxial, NanoVNA.

## 4. Passo a passo

1. Calcule as medidas com o seu VF. **A** é o comprimento de cada dipolo (de ponta a ponta, incluindo o espaço central), **B** o braço (`(A − E)/2`), **C** a linha de fase, **D** a distância ao refletor e **E** o espaço central de cada dipolo (só aparece se você informar um valor).
2. Corte os quatro braços com **B** (com sobra para ajuste, por igual nos quatro).
3. Monte os dois dipolos cruzados a 90° no suporte: um fica levemente acima do outro, isolados entre si.
4. Corte a linha de fase com **C**, medindo o cabo **sem a capa** nas pontas.
5. Ligue o dipolo 1 direto na junção e o dipolo 2 pela linha de fase (esquema na seção de alimentação).
6. Instale o choke no cabo que vai ao rádio.
7. Fixe o refletor a **D** dos dipolos (se for usar), com espaçadores isolantes.
8. Instale com o eixo apontado para cima, longe de objetos metálicos.

## 5. Alimentação e casamento

O dipolo 1 liga direto na junção; o dipolo 2, por um coaxial de 1/4 de onda. Se a impedância dessa linha for igual à resistência de cada
dipolo (≈ 73 Ω), as correntes ficam **iguais em módulo e a 90°**, e a impedância na junção é a metade, ≈ 36,5 Ω (dois dipolos em paralelo),
ou seja, ROE ≈ 1,4:1 em 50 Ω sem refletor. Com o refletor o valor muda: **meça**. Para trocar o sentido da polarização (direita ↔ esquerda),
troque qual dipolo recebe a linha de fase. A forma exata de ligar vivo e malha de cada dipolo (balun) depende da montagem: use choke de corrente.

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
