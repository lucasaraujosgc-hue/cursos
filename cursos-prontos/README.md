# Cursos prontos

JSONs de cursos prontos para importar pelo painel administrativo
(`/admin` → aba **Cursos** → colar o conteúdo no editor → **Salvar**).

Estes arquivos não são carregados automaticamente pelo servidor: o que está
no ar é o `data/courses.json` (ou o Postgres, quando `DATABASE_URL` está
configurado). Esta pasta serve como biblioteca versionada — se um curso for
alterado ou removido por engano no painel, dá para recuperar daqui.

## Série "MEI sem Sufoco"

Três cursos encadeados com os mesmos dois personagens: **Silvana**, que faz
bolos por encomenda (comércio/indústria, DAS com ICMS), e **Rogério**, que faz
manutenção de ar-condicionado (serviços, DAS com ISS).

| Arquivo | Curso | Módulos |
| --- | --- | --- |
| `mei-na-pratica.json` | MEI na Prática: Abrir e Manter em Dia | 11 |
| `mei-limite.json` | O Limite do MEI: Quanto Faturar e o Que Fazer ao Passar | 11 |
| `mei-dinheiro.json` | O Dinheiro do MEI: Preço, Retirada e Aposentadoria | 11 |

### ⚠️ Estes três têm valores que mudam todo ano

Salário mínimo, DAS e limite de faturamento são reajustados. **Nenhum deles
está escrito à mão no texto**: todos saem de um único arquivo,
`scripts/mei-base.mjs`. Para atualizar a série inteira:

```bash
cd cursos-prontos/scripts
# edite as constantes no topo de mei-base.mjs
node build-mei-1.mjs && node build-mei-2.mjs && node build-mei-3.mjs
node valida.mjs mei-na-pratica.json   # e os outros dois
mv mei-*.json ..
```

O `valida.mjs` confere se todo bloco usado existe na plataforma, roda cada
fórmula de calculadora e avisa se alguma devolve um campo sem rótulo ou se um
`shortTitle` ficou longo demais para o chip do celular.

| Constante | O que conferir |
| --- | --- |
| `SALARIO_MINIMO` | Portaria de reajuste de janeiro. O DAS é 5% dele. |
| `LIMITE` | Art. 18-A da LC 123. Há projetos para elevá-lo. |
| `LIMITE_CAMINHONEIRO` | Limite próprio do MEI caminhoneiro. |

As alíquotas da primeira faixa do Simples usadas nos exemplos (Anexo I 4%,
Anexo II 4,5%, Anexo III 6%, Anexo V 15,5%) e os percentuais de presunção de
lucro (8% comércio, 16% transporte de passageiros, 32% serviços) também valem
uma conferida a cada mudança de legislação.

## Série "Como Precificar"

Três cursos com a mesma estrutura, um para cada tipo de negócio. Cada um usa
o vocabulário e os custos do seu segmento, sem misturar exemplos.

| Arquivo | Curso | Módulos |
| --- | --- | --- |
| `precificar-servicos.json` | Como Precificar Serviços | 11 |
| `precificar-comercio.json` | Como Precificar no Comércio | 11 |
| `precificar-industria.json` | Como Precificar na Indústria | 11 |

## Série "Dinheiro na Empresa"

Três cursos encadeados, todos com a mesma empresa de exemplo (Roupa Bonita).
A ordem abaixo é a ordem de leitura: o estoque define o PME, o fluxo de caixa
usa o PME para fechar o ciclo financeiro, e o capital de giro transforma esse
ciclo em reais.

| Arquivo | Curso | Módulos |
| --- | --- | --- |
| `calculos-de-estoque.json` | Cálculos de Estoque: PME, Giro e Reposição | 11 |
| `fluxo-de-caixa.json` | Fluxo de Caixa na Prática | 11 |
| `capital-de-giro.json` | Capital de Giro: Por Que Falta Dinheiro | 11 |

### Números do exemplo (Roupa Bonita)

Os três cursos compartilham os mesmos números, para que o aluno reconheça a
empresa de um curso para o outro. Ao editar qualquer um deles, confira se a
alteração não quebra os outros dois.

| Dado | Valor |
| --- | --- |
| Faturamento mensal | R$ 30.000 |
| CMV mensal / anual | R$ 10.800 / R$ 129.600 |
| Estoque médio | R$ 27.000 |
| Contas a receber | R$ 20.000 |
| Fornecedores a pagar | R$ 16.200 |
| PME / PMR / PMP | 76 / 20 / 45 dias |
| Ciclo financeiro | 51 dias |
| NCG / CCL / Tesouraria | R$ 30.800 / R$ 26.400 / − R$ 4.400 |
| Liquidez corrente / seca | 2,12 / 0,97 |

O PME usa a base anual (CMV do ano ÷ 365), que é a definição padrão do
indicador. O PMR e o PMP usam a base mensal (mês de 30 dias). As calculadoras
que convertem dias em reais seguem a mesma base de cada prazo, por isso os
resultados batem com as tabelas dos módulos.
