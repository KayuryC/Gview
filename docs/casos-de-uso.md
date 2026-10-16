# Casos de Uso — Gview

Este documento detalha as interações mapeadas para o sistema Gview. Atores padronizados: **visitante**, **usuário**, **administrador**, e **desenvolvedor**.

---

## 🛠️ CRUD 1: Contas de Usuário

### UC01 — Cadastrar conta (Create)
- **Ator:** visitante
- **Pré-condição:** e-mail não cadastrado.
- **Fluxo principal:** visitante preenche formulário; sistema cria conta.
- **Pós-condição:** conta registrada.

### UC02 — Realizar login e acessar perfil (Read)
- **Ator:** usuário
- **Pré-condição:** conta ativa.
- **Fluxo principal:** usuário informa credenciais; sistema autentica e permite acesso à leitura do perfil.
- **Pós-condição:** sessão autenticada e perfil carregado.

### UC03 — Editar dados do perfil (Update)
- **Ator:** usuário
- **Pré-condição:** usuário logado.
- **Fluxo principal:** usuário altera o "Nome de exibição"; sistema salva.
- **Pós-condição:** nome atualizado.

### UC04 — Excluir conta (Delete)
- **Ator:** usuário
- **Pré-condição:** usuário logado.
- **Fluxo principal:** usuário confirma exclusão permanente na Zona de Perigo; sistema deleta a conta e dados associados.
- **Pós-condição:** conta removida do banco.

---

## 🛠️ CRUD 2: Avaliações (Reviews)

### UC05 — Avaliar uma demo (Create)
- **Ator:** usuário
- **Pré-condição:** jogo disponível.
- **Fluxo principal:** usuário envia nota e comentário na página do jogo.
- **Pós-condição:** avaliação registrada.

### UC06 — Ler avaliações do jogo (Read)
- **Ator:** visitante
- **Pré-condição:** jogo possui avaliações.
- **Fluxo principal:** visitante acessa a página do jogo e visualiza as notas e comentários.
- **Pós-condição:** leitura das avaliações concluída.

### UC07 — Editar própria avaliação (Update)
- **Ator:** usuário
- **Pré-condição:** possuir uma avaliação no jogo acessado.
- **Fluxo principal:** usuário clica em "Editar", altera texto/nota e salva.
- **Pós-condição:** avaliação modificada.

### UC08 — Apagar própria avaliação (Delete)
- **Ator:** usuário
- **Pré-condição:** possuir uma avaliação no jogo.
- **Fluxo principal:** usuário clica em "Excluir" e confirma; sistema remove a avaliação do jogo.
- **Pós-condição:** comentário e nota deletados.

---

## 🛠️ CRUD 3: Catálogo de Jogos

### UC09 — Importar/Cadastrar novo Jogo (Create)
- **Ator:** administrador
- **Pré-condição:** permissão administrativa.
- **Fluxo principal:** administrador insere ID da RAWG; sistema importa os dados e insere o novo jogo no banco.
- **Pós-condição:** novo jogo cadastrado no catálogo.

### UC10 — Visualizar catálogo de Demos (Read)
- **Ator:** visitante
- **Pré-condição:** catálogo disponível.
- **Fluxo principal:** visitante navega pelas seções "Destaques", "Todas as Demos" e "Em Breve".
- **Pós-condição:** catálogo visualizado e demos acessadas.

### UC11 — Editar dados de um Jogo (Update)
- **Ator:** administrador
- **Pré-condição:** jogo existente.
- **Fluxo principal:** administrador altera Título, Estúdio, Gênero ou Status de lançamento do jogo direto no painel.
- **Pós-condição:** dados do jogo e seção de exibição alterados.

### UC12 — Remover Jogo do catálogo (Delete)
- **Ator:** administrador
- **Pré-condição:** jogo existente.
- **Fluxo principal:** administrador clica em Excluir no painel de jogos.
- **Pós-condição:** jogo completamente deletado da plataforma.

---

## 🛠️ CRUD 4: Submissões de Jogos (Formulário Dev)

### UC13 — Enviar submissão de jogo (Create)
- **Ator:** desenvolvedor
- **Pré-condição:** formulário acessível.
- **Fluxo principal:** desenvolvedor preenche dados (título, e-mail, demo) e submete à curadoria.
- **Pós-condição:** submissão pendente registrada.

### UC14 — Consultar fila de submissões (Read)
- **Ator:** administrador
- **Pré-condição:** admin autenticado.
- **Fluxo principal:** administrador visualiza todas as submissões recebidas.
- **Pós-condição:** fila de submissões lida.

### UC15 — Analisar/Editar status da submissão (Update)
- **Ator:** administrador
- **Pré-condição:** submissão pendente.
- **Fluxo principal:** administrador aprova ou rejeita a entrada mudando o status da submissão.
- **Pós-condição:** status alterado.

### UC16 — Deletar registro de submissão (Delete)
- **Ator:** administrador
- **Pré-condição:** submissão existente.
- **Fluxo principal:** (Ação de API existente) administrador remove uma submissão permanentemente do banco.
- **Pós-condição:** registro deletado.

---

## 🛠️ CRUD 5: Game Jams (Eventos)

### UC17 — Criar uma Game Jam (Create)
- **Ator:** administrador
- **Pré-condição:** usuário com permissão.
- **Fluxo principal:** administrador preenche Título, Data e Tema da Jam no painel e grava.
- **Pós-condição:** novo evento cadastrado.

### UC18 — Listar Game Jams (Read)
- **Ator:** visitante
- **Pré-condição:** catálogo de Jams acessível.
- **Fluxo principal:** visitante abre a aba "Game Jams" e lê os detalhes dos eventos.
- **Pós-condição:** eventos visualizados.

### UC19 — Modificar regras da Jam (Update)
- **Ator:** administrador
- **Pré-condição:** Jam cadastrada.
- **Fluxo principal:** administrador edita o tema ou período de início/fim do evento. *(Em planejamento para interface, mas coberto pela arquitetura)*
- **Pós-condição:** evento atualizado.

### UC20 — Excluir Game Jam (Delete)
- **Ator:** administrador
- **Pré-condição:** evento cancelado.
- **Fluxo principal:** administrador remove o evento via painel de controle.
- **Pós-condição:** Jam deletada.

---

## 📌 Funcionalidades Adicionais (Extra)

### UC21 — Gerenciar Lista de Desejos (Wishlist)
- **Ator:** usuário
- **Pré-condição:** usuário logado.
- **Fluxo:** usuário adiciona ou remove jogos de sua própria "Wishlist" para salvar demos que quer jogar depois.
