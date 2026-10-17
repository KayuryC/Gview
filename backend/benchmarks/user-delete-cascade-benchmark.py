"""
Benchmark: Índices de Relações de Usuário e Exclusão em Cascata
===============================================================
Mede o impacto dos índices GameJam(creatorId) e GameJamEntry(developerId)
nas operações de exclusão em cascata disparadas ao deletar um usuário:
    DELETE FROM "GameJam" WHERE "creatorId" = ?
    DELETE FROM "GameJamEntry" WHERE "developerId" = ?

Metodologia:
- Banco SQLite em memória (não modifica dev.db).
- Mede o tempo de busca e remoção em cascata com entradas crescentes de N registros.
- Planos de execução EXPLAIN QUERY PLAN antes e depois dos índices.
"""

import sqlite3
import time
import statistics

SIZES = [100, 1_000, 10_000, 50_000, 100_000]
RUNS = 21

def setup_schema(conn):
    conn.execute('CREATE TABLE "User" (id TEXT PRIMARY KEY, name TEXT)')
    conn.execute("""
        CREATE TABLE "GameJam" (
            id TEXT PRIMARY KEY,
            title TEXT,
            creatorId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
    target_user_id = "target-user-id"

    # Inserir n GameJams e n GameJamEntries, com 5 registros pertencentes ao target_user
    gj_rows = []
    gje_rows = []
    for i in range(n):
        cid = target_user_id if i < 5 else f"user-{i}"
        did = target_user_id if i < 5 else f"dev-{i}"
        gj_rows.append((f"gj-{i}", f"Jam {i}", cid))
        gje_rows.append((f"gje-{i}", f"jam-{i}", f"game-{i}", did))

    conn.executemany('INSERT INTO "GameJam" (id, title, creatorId) VALUES (?, ?, ?)', gj_rows)
    conn.executemany('INSERT INTO "GameJamEntry" (id, jamId, gameId, developerId) VALUES (?, ?, ?, ?)', gje_rows)
    conn.commit()

def run_benchmark():
    print("=" * 80)
    print("BENCHMARK ACADÊMICO: ÍNDICES DE FK PARA EXCLUSÃO DE CONTAS DE USUÁRIOS")
    print("=" * 80)

    # 1. Planos de execução
    c = sqlite3.connect(":memory:")
    setup_schema(c)
    populate(c, 100)

    print("\n1. Planos de Execução ANTES dos índices:")
    print("  GameJam (creatorId):", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJam" WHERE "creatorId" = ?', ("target-user-id",)).fetchall()[0][3])
    print("  GameJamEntry (developerId):", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJamEntry" WHERE "developerId" = ?', ("target-user-id",)).fetchall()[0][3])

    c.execute('CREATE INDEX "GameJam_creatorId_idx" ON "GameJam"("creatorId")')
    c.execute('CREATE INDEX "GameJamEntry_developerId_idx" ON "GameJamEntry"("developerId")')

    print("\n2. Planos de Execução DEPOIS dos índices:")
    print("  GameJam (creatorId):", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJam" WHERE "creatorId" = ?', ("target-user-id",)).fetchall()[0][3])
    print("  GameJamEntry (developerId):", c.execute('EXPLAIN QUERY PLAN DELETE FROM "GameJamEntry" WHERE "developerId" = ?', ("target-user-id",)).fetchall()[0][3])
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
            conn.execute('DELETE FROM "GameJam" WHERE "creatorId" = ?', ("target-user-id",))
            conn.execute('DELETE FROM "GameJamEntry" WHERE "developerId" = ?', ("target-user-id",))
            times_no_idx.append((time.perf_counter() - t0) * 1000)
            conn.close()

        # Medir com índice
        times_with_idx = []
        for _ in range(RUNS):
            conn = sqlite3.connect(":memory:")
            setup_schema(conn)
            conn.execute('CREATE INDEX "GameJam_creatorId_idx" ON "GameJam"("creatorId")')
            conn.execute('CREATE INDEX "GameJamEntry_developerId_idx" ON "GameJamEntry"("developerId")')
            populate(conn, n)
            t0 = time.perf_counter()
            conn.execute('DELETE FROM "GameJam" WHERE "creatorId" = ?', ("target-user-id",))
            conn.execute('DELETE FROM "GameJamEntry" WHERE "developerId" = ?', ("target-user-id",))
            times_with_idx.append((time.perf_counter() - t0) * 1000)
            conn.close()

        med_no = statistics.median(times_no_idx)
        med_with = statistics.median(times_with_idx)
        speedup = med_no / med_with if med_with > 0 else 0

        print(f"{n:>12,} | {med_no:>17.4f} ms | {med_with:>18.4f} ms | {speedup:>9.1f}x")

    print("-" * 80)
    print("Conclusão: Sem índices, a exclusão em cascata percorre integralmente GameJam e GameJamEntry O(N).")
    print("Com índices, o custo de localização dos registros dependentes cai para O(log N + k).")

if __name__ == "__main__":
    run_benchmark()
