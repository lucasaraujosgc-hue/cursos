# Cursos prontos

JSONs de cursos prontos para importar pelo painel administrativo
(`/admin` → aba **Cursos** → colar o conteúdo no editor → **Salvar**).

Estes arquivos não são carregados automaticamente pelo servidor: o que está
no ar é o `data/courses.json` (ou o Postgres, quando `DATABASE_URL` está
configurado). Esta pasta serve como biblioteca versionada — se um curso for
alterado ou removido por engano no painel, dá para recuperar daqui.

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
