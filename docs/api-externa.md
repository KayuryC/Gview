# Integração com API Externa — RAWG Video Games Database

**API:** RAWG Video Games Database  
**Documentação:** https://rawg.io/apidocs  
**Endpoint base:** `https://api.rawg.io/api`

---

## Justificativa

A RAWG é a maior base de dados pública de jogos, com cobertura de mais de 500 mil títulos, suporte a gêneros, plataformas, imagens e metadados variados. A integração é diretamente aderente ao domínio do Gview porque:

- Permite enriquecer o catálogo com dados reais (capas, descrições, gêneros) sem esforço de curadoria manual.
- É gratuita para uso acadêmico e de baixo volume.
- A chave de API é simples de obter e o SDK é consumido por HTTP puro.
- A integração é feita no **backend**, evitando exposição da chave no navegador.

---

## Uso previsto no Gview

| Funcionalidade | Endpoint RAWG |
|---|---|
| Buscar metadados de jogo por nome | `GET /games?search={query}` |
| Obter detalhes de um jogo específico | `GET /games/{id}` |
| Listar gêneros disponíveis | `GET /genres` |

---

## Rota implementada e Ativa (Sprint 2)

```
POST /api/rawg/import/:rawgId
```

Esta rota utiliza a chave da API para bater na base global de jogos da RAWG em tempo real, resgatar todos os metadados valiosos (nome, gêneros, plataformas, URL de capa em alta definição, data de lançamento) e converter perfeitamente na entidade `Game` para salvar no banco local do Gview.

A integração foi concluída com sucesso e o fallback de mock foi desativado graças à injeção da `RAWG_API_KEY` oficial no ambiente.

---

## Configuração

Adicionar no `.env`:

```
RAWG_API_KEY=sua_chave_rawg_aqui
```

Obter chave gratuita em: https://rawg.io/login?forward=developer
