# Perdas no cabo coaxial

## Como ler o resultado

- A perda do cabo cresce com a **frequência** e com o **comprimento**. Em VHF/UHF e em 2,4 GHz o cabo pesa muito; em HF, bem menos.
- A **ROE** aumenta a perda: a onda refletida passa duas vezes pelo cabo. Por isso a ROE vista no rádio é menor que a da antena, mas isso é só a perda escondendo o problema.
- Em recepção de sinais fracos, cada dB perdido no cabo piora a relação sinal/ruído. Prefira cabo curto e de baixa perda, ou um **pré-amplificador junto da antena**.

## Escolha e instalação

1. Escolha o cabo pelo **datasheet**: a ferramenta usa a atenuação e a potência do fabricante.
2. **Curvas largas:** não dobre o cabo em raio menor que o indicado pelo fabricante; dobra fechada deforma o dielétrico e muda a impedância.
3. **Conectores:** use o conector correto para o diâmetro do cabo, bem prensado ou soldado. Conector mal montado causa perda e ROE.
4. **Vedação:** vede os conectores externos (fita autofusão e, por cima, fita comum; ou termorretrátil com cola). Água dentro do cabo aumenta muito a perda, e o dano é permanente.
5. **Fixação:** prenda o cabo ao mastro sem apertar demais, para o vento e o peso não puxarem o conector. Faça um **laço de gotejamento** antes de entrar em casa, para a água não escorrer pelo cabo.

## Medição

- Para medir a perda real de um cabo, ligue uma ponta ao NanoVNA e deixe a outra **em aberto ou em curto**: o NanoVNA mede a perda de ida e volta (|S11|).
- Compare com a perda calculada pela ferramenta. Uma diferença grande sugere cabo velho, com água ou conector ruim.

## Transmissão

- Respeite a **potência máxima** do datasheet, que vale para ROE 1:1 e depende da frequência. Com ROE maior, a tensão e a corrente ao longo do cabo aumentam.
- O calor da perda fica dentro do cabo: cabo fino e longo, com potência alta, esquenta.

## Erros comuns

- Esperar que a ROE no rádio seja a da antena (a perda do cabo a esconde).
- Usar cabo de TV (75 Ω) em sistema de 50 Ω sem considerar o descasamento.
- Deixar os conectores sem vedação.
