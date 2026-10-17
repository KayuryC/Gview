"""
Benchmark: Índices de FK para Exclusão de Jogos e Cascata
=========================================================
Mede o impacto dos índices Wishlist(gameId) e GameJamEntry(gameId)
nas operações de exclusão em cascata:
    DELETE FROM "Wishlist" WHERE "gameId" = ?
    DELETE FROM "GameJamEntry" WHERE "gameId" = ?

Metodologia:
- Banco SQLite em memória (não modifica dev.db).
- Testa entradas crescentes de N registros dependentes.
- Mede o tempo de busca e remoção dos registros associados ao jogo excluído.
- Registra os planos EXPLAIN QUERY PLAN antes e depois dos índices.
"""

import sqlite3
import time
import statistics

SIZES = [100, 1_000, 10_000, 50_000, 100_000]
RUNS = 21

def setup_schema(conn):
    conn.execute('CREATE TABLE "Game" (id TEXT PRIMARY KEY, title TEXT)')
    conn.execute("""
        CREATE TABLE "Wishlist" (
            id TEXT PRIMARY KEY,
            userId TEXT,
            gameId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(userId, gameId)
        )
    """)
    conn.execute("""
        CREATE TABLE "GameJamEntry" (
            id TEXT PRIMARY KEY,
            jamId TEXT,
            gameId TEXT,
            developerId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(jamId, gameId)
        )
    """)

def populate(conn, n):
    target_game_id = "target-game-id"
    other_game_id = "other-game-id"

    # Inserir n registros onde a maioria pertence a outros jogos e alguns ao target
    w_rows = []
    gje_rows = []
    for i in range(n):
        gid = target_game_id if i < 5 else f"game-{i}"
        w_rows.append((f"w-{i}", f"user-{i}", gid))
        gje_rows.append((f"gje-{i}", f"jam-{i}", gid, f"dev-{i}"))

    conn.executemany('INSERT INTO "Wishlist" (id, userId, gameId) VALUES (?, ?, ?)', w_rows)
    conn.executemany('INSERT INTO "GameJamEntry" (id, jamId, gameId, developerId) VALUES (?, ?, ?, ?)', gje_rows)
    conn.commit()

def run_benchmark():
    print("=" * 80)
    print("BENCHMARK ACADÊMICO: ÍNDICES DE FK PARA EXCLUSÃO EM CASCATA DE JOGOS")
    print("=" * 80)

    # 1. Planos de execução
    c = sqlite3.connect(":memory:")
    setup_schema(c)
    populate(c, 100)

    print("\n1. Planos de Execução ANTES dos índices:")
    print("  Wishlist:", c.execute('EXPLAIN QUERY PLAN DELETE FROM "Wishlist" WHERE "gameId" = ?', ("target-game-id",)).fetchall()[0][3])
    print("  GameJamEntry:", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJamEntry" WHERE "gameId" = ?', ("target-game-id",)).fetchall()[0][3])

    c.execute('CREATE INDEX "Wishlist_gameId_idx" ON "Wishlist"("gameId")')
    c.execute('CREATE INDEX "GameJamEntry_gameId_idx" ON "GameJamEntry"("gameId")')

    print("\n2. Planos de Execução DEPOIS dos índices:")
    print("  Wishlist:", c.execute('EXPLAIN QUERY PLAN DELETE FROM "Wishlist" WHERE "gameId" = ?', ("target-game-id",)).fetchall()[0][3])
    print("  GameJamEntry:", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJamEntry" WHERE "gameId" = ?', ("target-game-id",)).fetchall()[0][3])
    c.close()

    print("\n3. Medições Empíricas de Exclusão (Mediana de 21 execuções):")
    print(f"{'N registros':>12} | {'Sem Índice (SCAN)':>20} | {'Com Índice (SEARCH)':>21} | {'Ganho':>10}")
    print("-" * 80)

    for n in SIZES:
        # Medir sem índice
        times_no_idx = []
        for _ in range(RUNS):
            conn = sqlite3.connect(":memory:")
            setup_schema(conn)
            populate(conn, n)
            t0 = time.perf_counter()
            conn.execute('DELETE FROM "Wishlist" WHERE "gameId" = ?', ("target-game-id",))
            conn.execute('DELETE FROM "GameJamEntry" WHERE "gameId" = ?', ("target-game-id",))
            times_no_idx.append((time.perf_counter() - t0) * 1000)
            conn.close()

        # Medir com índice
        times_with_idx = []
        for _ in range(RUNS):
            conn = sqlite3.connect(":memory:")
            setup_schema(conn)
            conn.execute('CREATE INDEX "Wishlist_gameId_idx" ON "Wishlist"("gameId")')
            conn.execute('CREATE INDEX "GameJamEntry_gameId_idx" ON "GameJamEntry"("gameId")')
            populate(conn, n)
            t0 = time.perf_counter()
            conn.execute('DELETE FROM "Wishlist" WHERE "gameId" = ?', ("target-game-id",))
            conn.execute('DELETE FROM "GameJamEntry" WHERE "gameId" = ?', ("target-game-id",))
            times_with_idx.append((time.perf_counter() - t0) * 1000)
            conn.close()

        med_no = statistics.median(times_no_idx)
        med_with = statistics.median(times_with_idx)
        speedup = med_no / med_with if med_with > 0 else 0

        print(f"{n:>12,} | {med_no:>17.4f} ms | {med_with:>18.4f} ms | {speedup:>9.1f}x")

    print("-" * 80)
    print("Conclusão: Sem índices, a remoção em cascata exige varredura total O(N) nas tabelas dependentes.")
    print("Com índices, a busca dos registros dependentes cai para O(log N + k).")

if __name__ == "__main__":
    run_benchmark()
