# Ground plane de 1/4 de onda

## 1. Visão geral

Um radiador vertical de cerca de λ/4 montado sobre um conjunto de **radiais**, em geral
três ou quatro. Os radiais fazem o papel de "chão" elétrico. Pela teoria das imagens, um
monopolo de λ/4 sobre um plano condutor perfeito se comporta como a metade de cima de um
dipolo de λ/2.

- **Uso:** recepção e transmissão. Muito usada em VHF/UHF (repetidoras, escuta, APRS).
- **Polarização:** vertical.
- **Diagrama:** omnidirecional no plano horizontal (igual em todas as direções da bússola).
- **Impedância:** com 4 radiais horizontais fica perto de 22 Ω, bem abaixo de 50 Ω (ARRL Antenna Book;
  o Rothammel cita ≈ 36 Ω, que é o valor sobre um plano infinito). Inclinar os radiais para baixo eleva a
  impedância: ≈ 50 Ω a 45°.
- **Ganho:** o limite teórico sobre plano infinito é de 5,15 dBi. Com radiais elevados o ganho
  real é menor.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Radiador e radiais (VHF/UHF) | Vareta de latão, cobre ou alumínio de 2 a 4 mm | Fio de cobre rígido de 2,5 mm² ou 4 mm², vareta de solda |
| Base | Conector SO-239 de painel (flange quadrada) | Conector N de painel (melhor em UHF) |
| Cabo | Coaxial de 50 Ω | — |
| Choke | Ferrite tipo "clip" no coaxial | Algumas espiras de coaxial logo abaixo da base |
| Mastro | Tubo de alumínio ou aço galvanizado | Cano de PVC reforçado (só para antenas leves) |
| Vedação | Fita de autofusão + fita isolante | Silicone neutro (não acético, que corrói) |

## 3. Ferramentas

Ferro de solda de 60 W ou mais, estanho, alicate, furadeira, lima, trena,
transferidor (para a inclinação) e um NanoVNA ou medidor de ROE.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o radiador, **B** é cada radial,
   **C** é o alcance horizontal de cada radial e **D** é a queda da ponta do radial. Informe o
   diâmetro real do condutor: ele define o fator de encurtamento K (o do dipolo do mesmo
   condutor, pela teoria das imagens). Os radiais usam o mesmo K.
2. Corte o radiador um pouco **mais comprido** que **A** (por exemplo 5 %) e os radiais na
   medida **B**.
3. Solde o radiador no pino central do conector de painel.
4. Prenda os radiais nos furos da flange do conector (parafuso + solda), distribuídos de
   forma igual em volta (com 4 radiais, a cada 90°).
5. Dobre os radiais para baixo no ângulo escolhido. Confira com a cota **D** ou com o
   transferidor.
6. Instale o choke no coaxial logo abaixo da base.
7. Vede o conector e as soldas contra a água.
8. Instale no mastro e na altura final **antes** do ajuste fino.

## 5. Alimentação e casamento

A antena é alimentada direto pelo coaxial: o vivo vai no radiador e a malha nos radiais.
A inclinação dos radiais funciona como "ajuste grosso" da impedância. Se a ROE mínima
ficar alta mesmo na frequência certa, mude a inclinação dos radiais.

## 6. Ajuste

1. Meça a ROE em torno da frequência de projeto e ache a frequência de menor ROE.
2. Se ela estiver **abaixo** da desejada, o radiador está comprido: encurte aos poucos.
   Use a proporção `L_novo ≈ L_atual × f_medida / f_desejada`.
3. Se a ROE mínima continuar alta, ajuste a **inclinação** dos radiais e meça de novo.
4. Refaça a medida com a antena na posição definitiva.

## 7. Erros comuns

- Radiais de tamanhos diferentes ou mal distribuídos.
- Esquecer o choke: o cabo vira um "radial" a mais e a ROE muda quando você mexe no cabo.
- Usar silicone acético na vedação, que libera ácido e corrói o cobre.
- Ajustar com a antena no chão ou perto de calhas e grades metálicas.

## 8. Notas de transmissão e segurança

- **Tensão alta na ponta do radiador:** instale fora do alcance de pessoas.
- **Potência:** confira a potência máxima do cabo e do conector na frequência de uso.
- **Exposição a RF:** mantenha distância durante a transmissão. Estime a distância na ferramenta "Exposição a RF".
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Trabalho em telhado ou em altura exige equipamento de proteção e companhia.

## 9. Referências

- ARRL Antenna Book: verticais e ground planes (regra 234/f pés); 21ª ed., p. 6-19, Fig 35 (resistência × inclinação dos radiais).
- K. Rothammel, *Antene* (tradução sérvia da 9ª ed. alemã), §19.4.1 (ground plane com radiais horizontais e inclinados).
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.7 (monopolo e teoria das imagens).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
