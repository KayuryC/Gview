# Guia de Testes e QA (Quality Assurance) — Gview

Este documento serve como um guia para rodar e entender a bateria de testes automatizados da plataforma Gview. A suíte de testes foi construída utilizando ferramentas do ecossistema moderno do Node.js: **Vitest** (Test Runner ultrarrápido) e **Supertest** (Para simulação de requisições HTTP).

---

## 1. Como rodar os testes na sua máquina

Para apresentar ao professor e rodar os testes você mesmo, basta abrir o terminal, navegar até a pasta do **backend** e rodar um único comando:

```bash
# 1. Acesse a pasta do backend
cd backend

# 2. Execute o comando de testes
npm run test
```

### O que vai aparecer na tela?
O Vitest vai inicializar imediatamente e varrer a pasta `tests/`. Ele exibirá uma saída similar a esta, indicando sucesso ("verde"):

```
✓ tests/unit/slugify.test.js  (1 test)
✓ tests/integration/games.test.js  (1 test)

Test Files  2 passed (2)
     Tests  2 passed (2)
```

---

## 2. O que estamos testando na Sprint 2?

Nós dividimos a base de testes em duas frentes fundamentais, cobrindo tanto as regras de negócios (Unitários) quanto o funcionamento dos fluxos de dados (Integração).

### Teste Unitário (Unit Testing)
**Arquivo:** `tests/unit/slugify.test.js`
- **O que faz:** Testa se a regra interna de negócios que gera os URLs amigáveis dos jogos (o "Slug") está funcionando perfeitamente.
- **O que ele valida:** Confirma se o código consegue pegar um título difícil (ex: `"Super Ação: O Retorno!"`) e convertê-lo com precisão matemática para `"super-acao-o-retorno"`, removendo pontuações, acentos e deixando tudo em caixa baixa. Isso garante que o site nunca terá URLs quebradas.

### Teste de Integração (Integration Testing)
**Arquivo:** `tests/integration/games.test.js`
- **O que faz:** Simula de ponta-a-ponta uma requisição real de um cliente HTTP querendo ver o catálogo de jogos do banco de dados (A Rota `GET /api/games`).
- **O que ele valida:** Pede à nossa aplicação Express para processar a rota, bate no banco de dados e retorna. O teste então garante ("Expect") que o status code será obrigatoriamente `200` (Sucesso), que o corpo da resposta possui a chave `data`, e que este dado é um vetor (Array) contendo os nossos jogos. É a prova irrefutável de que a API REST está de pé e respondendo como deveria.

---

## 3. Como demonstrar falhas (Para efeitos de QA)
Se o professor quiser ver um teste falhando de propósito (para provar que a ferramenta realmente funciona como auditora do código):

1. Vá no arquivo `backend/src/routes/games.routes.js`.
2. Em qualquer momento da rota `GET /`, mude algo que quebre a lógica (ex: digite `res.status(500).json(...)` em vez de `res.json(...)`).
3. Rode `npm run test` de novo.
4. O console vai estourar um erro gigantesco em vermelho indicando exatamente em que linha o código parou de cumprir a garantia de qualidade estipulada pelo arquivo `.test.js`. Depois, basta arrumar e ver o teste passar (ficar verde) de novo!
