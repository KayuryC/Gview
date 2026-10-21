# Relatório Executivo e Roteiro de Slides: Análise e Otimização de Algoritmos (GView)

**Projeto:** Plataforma GView  
**Disciplina:** Análise e Projeto de Algoritmos  
**Repositório:** [KayuryC/gview_otimizado](https://github.com/KayuryC/gview_otimizado)  
**Branch de Trabalho:** `feature/analise-algoritmos`  
**Data:** Outubro de 2026  

---

## 1. Visão Geral da Atividade

O presente trabalho avalia o comportamento assintótico e o desempenho prático de operações centrais de manipulação de coleções de dados na aplicação GView. 

A metodologia adotou:
1. **Auditoria Estrutural:** Identificação de laços aninhados e buscas lineares repetidas no código-fonte.
2. **Proposta de Refatoração Assintótica:** Implementação de estruturas de dados indexadas (`Map` e `Set`) para substituição de varreduras lineares ($O(n)$) e quadráticas ($O(n \cdot m)$).
3. **Rigor e Equivalência:** Verificação estrita de preservação de ordem, tratamento de duplicatas e dados nulos via 22 testes unitários automatizados.
4. **Comprovação Empírica:** Benchmarks com entradas escalonadas ($n = 10$ a $n = 100.000$), cronometragem em nanossegundos (`process.hrtime.bigint()`) e geração de gráficos comparativos em escala logarítmica ($\log \times \log$).

---

## 2. Tabela Comparativa das 8 Funções Auditadas

| ID | Operação / Função | Arquivo Fonte | Abordagem Original | Abordagem Otimizada | Complexidade Original | Complexidade Otimizada | Mudança de Classe? |
|:---|:---|:---|:---|:---|:---:|:---:|:---:|
| **F1** | Busca no Catálogo por Slug | `catalogSearch.js` / `games.controller.js` | Busca linear com `Array.find` | Tabela Hash indexada (`Map.get`) | $O(n)$ (consulta) / $O(q \cdot n)$ | $O(1)$ amortizado / $O(n + q)$ | **Sim ($O(n) \to O(1)$)** |
| **F2** | Filtro / Agrupamento por Categoria | `catalogSearch.js` / `games.controller.js` | Filtros repetidos com `Array.filter` | Baldes indexados (`Map` de listas) | $O(q \cdot n)$ | $O(n + q)$ ref / $O(n + q \cdot k)$ clone | **Sim ($O(n) \to O(1)$)** |
| **F3** | Disponíveis para Coleção ($A \setminus B$) | `collectionFilters.js` / `Collections.jsx` | Laços aninhados (`filter` + `some`) | Hash Set de exclusão (`Set.has`) | $O(n \cdot m) \approx O(n^2)$ | $O(n + m)$ (Linear) | **Sim ($O(n^2) \to O(n)$)** |
| **F4** | Verificação de Wishlist | `GameDetail.jsx` | Varredura com `list.some()` | Consulta via `Set` de IDs | $O(m)$ por verificação | $O(1)$ após montagem do Set | Sim ($O(m) \to O(1)$) |
| **F5** | Geração e Sanitização de Slug | `games.controller.js` | Múltiplas expressões regulares | Pipeline compilado único | $O(L)$ ($L$ = tam. string) | $O(L)$ (mesma classe) | Não (Melhoria de Constante) |
| **F6** | Recálculo de Status de Jams | `gamejams.controller.js` | Múltiplas instâncias `new Date()` | `Date.now()` imutável no início | $O(k)$ ($k$ = total jams) | $O(k)$ (menor alocação) | Não (Redução de Overhead) |
| **F7** | Exclusão de Item em Lista React | `Collections.jsx` / `Profile.jsx` | `prev.filter(item => item.id !== id)` | Busca de índice + fatia (`slice`) | $O(k)$ varredura completa | $O(k)$ pior caso | Não (Otimização prática) |
| **F8** | Agregação / Média de Avaliações | `reviews.controller.js` | Reduções em cascata no array | Acumulador único | $O(r)$ ($r$ = total reviews) | $O(r)$ passo único | Não (Melhoria de Constante) |

---

## 3. Roteiro de Apresentação Slide a Slide

### Slide 1: Capa
* **Título Principal:** Análise e Otimização Assintótica de Algoritmos no GView
* **Subtítulo:** Identificação de Gargalos, Transição de Classes de Complexidade e Validação Empírica
* **Disciplina:** Análise e Projeto de Algoritmos
* **Apresentador:** [Nome do Aluno / Grupo]
* **Repositório:** `KayuryC/gview_otimizado` (Branch: `feature/analise-algoritmos`)

---

### Slide 2: Contextualização e Objetivos
* **Problema:** Em aplicações web, o crescimento de coleções pode degradar a latência da API e a fluidez da UI caso operações $O(n)$ ou $O(n^2)$ sejam executadas reiteradamente.
* **Objetivos:**
  * Auditar o código do GView identificando operações sobre coleções.
  * Implementar no mínimo 3 funções puras com mudança real de classe de complexidade.
  * Preservar o comportamento exato (valores, ordem original, idempotência).
  * Conduzir testes de estresse sintéticos escalonando $n$ de $10$ até $100.000$.

> **Nota para o apresentador:**  
> Enfatize que o objetivo central foi avaliar a escalabilidade teórica e prática das estruturas de dados do JavaScript (`Array`, `Map`, `Set`), provando matematicamente e experimentalmente quando a indexação supera a varredura linear.

---

### Slide 3: Metodologia e Boas Práticas de Engenharia
```
[Auditoria de Código] ──> [Isolamento em Módulos Puros] ──> [22 Testes de Equivalência]
                                                                     │
[Gráficos Log-Log (PNG)] <── [Datasets em CSV] <── [Benchmarks com process.hrtime]
```
* **Módulos Utilitários:** Criados isoladamente em `backend/src/utils/` e `frontend/src/utils/`, mantendo a estabilidade da produção.
* **Cronometragem Isolada:** Separação entre tempo de setup da estrutura, tempo de execução da consulta e tempo total.
* **Testes de Equivalência Rigorosos:** Validação de entradas válidas, chaves ausentes, listas vazias, nulos e chaves duplicadas.
* **Sem Comentários no Código:** Atendimento integral à restrição do professor.

---

### Slide 4: Destaque 1 — Busca por Slug (`findBySlug`)
* **Cenário:** Localização de um jogo específico no catálogo a partir de sua URL amigável (`slug`).
* **Comparação Teórica:**
  * **Ingênua (Linear):** $O(n)$ por consulta; para $q$ consultas: **$O(q \cdot n)$**.
  * **Otimizada (Map):** Criação do índice: $O(n)$; Consulta: $O(1)$ amortizado; Total: **$O(n + q)$**.
* **Resultados Empíricos ($q = 100$ consultas, $n = 100.000$):**
  * Busca Linear: **$48,45\text{ ms}$**
  * Map (Consultas apenas): **$0,0067\text{ ms}$** (Speedup $>7.000\times$)
  * Map Total (Setup + Consultas): **$4,34\text{ ms}$** (Speedup $11,1\times$)
* **Regra de Negócio Preservada:** Se houver duplicatas de slug, o Map armazena e retorna a **primeira ocorrência**, garantindo equivalência exata com `Array.find()`.
* **Gráfico Gerado:** `scripts/results/grafico-busca-slug.png`

---

### Slide 5: Destaque 2 — Filtro por Categoria (`filterByStatus`)
* **Cenário:** Agrupamento de títulos por status (`AVAILABLE`, `FEATURED`, `COMING_SOON`).
* **Comparação Teórica:**
  * **Ingênua (Linear):** Varredura completa para cada categoria requisitada $\to$ **$O(q \cdot n)$**.
  * **Otimizada (Map de Baldes):** Montagem de baldes $O(n)$; Retorno por referência direta: **$O(1)$**; Retorno com cópia superficial (React safe): **$O(k)$** (onde $k$ é a quantidade de itens na categoria).
* **Análise de Trade-off:**
  * Em $n \le 100$, a varredura linear é mais veloz que alocar a tabela de baldes ($0,0034\text{ ms}$ vs $0,0036\text{ ms}$).
  * Em $n = 100.000$, o Map total supera o linear ($1,31\text{ ms}$ vs $3,38\text{ ms}$), e as consultas individuais caem para $0,001\text{ ms}$.
* **Gráfico Gerado:** `scripts/results/grafico-filtro-status.png`

---

### Slide 6: Destaque 3 — Diferença de Coleções (`filterAvailableGames`)
* **Cenário:** No modal de coleções, listar apenas jogos do catálogo que ainda não foram adicionados à coleção atual ($A \setminus B$).
* **Comparação Teórica:**
  * **Ingênua (Nested Loops):** `allGames.filter(...)` contendo `collectionItems.some(...)` $\to$ **$O(n \cdot m)$**.
    * Para $m = 0,5 \cdot n$, a complexidade se torna **Quadrática: $O(n^2)$**.
  * **Otimizada com Set:** Construção de `Set(collectionIds)` $O(m)$ + Filtro $O(n)$ com `Set.has()` $O(1) \to$ **Linear: $O(n + m)$**.
* **Impacto Prático Extremo ($n = 100.000$, $m = 50.000$):**
  * Ingênuo ($5 \times 10^9$ comparações internas): **$13.612,14\text{ ms}$ ($\approx 13,6\text{ segundos}$)**.
  * Set Total (Setup + Filtragem): **$17,01\text{ ms}$**.
  * **Speedup: $800,44\times$ mais rápido.**
* **Gráfico Gerado:** `scripts/results/grafico-diferenca-colecoes.png`

---

### Slide 7: Análise dos Gráficos em Escala Log-Log
* **Por que escala $\log \times \log$?**
  * Em escalas lineares convencionais, tempos de $0,001\text{ ms}$ colapsam no eixo horizontal, tornando impossível distinguir o comportamento assintótico.
  * Em escala $\log \times \log$, o expoente da complexidade se traduz na **inclinação da reta**:
    * Inclinação $1 \implies O(n)$ (crescimento linear).
    * Inclinação $2 \implies O(n^2)$ (crescimento quadrático).
    * Inclinação $0 \implies O(1)$ (tempo constante).
* **Destaques Visuais:**
  * No gráfico de coleções, a reta vermelha ($O(n^2)$) tem inclinação visivelmente o dobro da reta azul ($O(n)$), demonstrando empiricamente a transição de classe.
  * No gráfico de busca por slug, a reta verde de consultas permanece paralela ao eixo $x$, comprovando o $O(1)$ amortizado do Map.

---

### Slide 8: Limitações Experimentais e Honestidade Científica
* **Custo de Setup vs. Amortização:**
  * O uso de índices auxiliares só é justificável se houver múltiplas consultas sobre a mesma base ou se a base for de grande porte. Em requisições efêmeras com 1 única consulta em $n < 100$, o array linear é computacionalmente superior.
* **Amostragem em $n = 100.000$:**
  * Devido ao tempo de processamento da abordagem $O(n^2)$ (13,6 s por rodada), utilizou-se $N = 1$ iteração para o ponto máximo. Há maior suscetibilidade a ruídos pontuais do escalonador do SO, embora o abismo de grandezas ($800\times$) confirme a tese.
* **Escala de Produção:**
  * No GView padrão, o catálogo mock possui $n = 5$ jogos. A análise comprova o comportamento diante de futura escala do produto.

---

### Slide 9: Conclusões e Entregáveis
* **Resultados Consolidados:**
  * 3 reduções comprovadas de classe assintótica:
    1. $O(n) \to O(1)$ (Busca por chave única via Map).
    2. $O(n) \to O(1)$ (Agrupamento por categoria via Map de baldes).
    3. $O(n^2) \to O(n)$ (Diferença de conjuntos via Set de exclusão).
  * 22 testes unitários garantindo que nenhuma saída foi alterada.
  * Gráficos em PNG gerados de forma reproduzível via script Python/Pillow.
* **Commits no GitHub:**
  * `188d1eb`: Módulos puros e suite de testes.
  * `9d355ad`: Scripts de benchmark e medição de setup.
  * `d290c40`: Datasets experimentais em CSV.
  * `f39f281`: Gráficos comparativos em escala logarítmica.
