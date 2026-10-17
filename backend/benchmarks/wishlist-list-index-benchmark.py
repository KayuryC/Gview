"""
Benchmark: Índice Composto Wishlist(userId, createdAt)
======================================================
Mede o impacto do índice Wishlist(userId, createdAt) na consulta:
    SELECT * FROM "Wishlist" WHERE "userId" = ? ORDER BY "createdAt" DESC

Metodologia:
- Banco SQLite em memória (não modifica dev.db).
- Testa entradas crescentes de n registros de wishlist para o usuário.
- Mede o tempo de consulta e ordenação antes e depois do índice.
- Registra planos de execução EXPLAIN QUERY PLAN antes e depois.
"""

import sqlite3
import time
import statistics

SIZES = [10, 100, 1_000, 10_000, 50_000]
RUNS = 21

def setup_schema(conn):
    conn.execute("""
        CREATE TABLE "Wishlist" (
            id TEXT PRIMARY KEY,
            userId TEXT,
            gameId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(userId, gameId)
        )
    """)

def populate(conn, n, user_id):
    rows = []
    for i in range(n):
        # timestamps decrescentes
        ts = f"2026-01-01 {i:05d}"
        rows.append((f"w-{i}", user_id, f"g-{i}", ts))
    conn.executemany('INSERT INTO "Wishlist" (id, userId, gameId, createdAt) VALUES (?, ?, ?, ?)', rows)
    conn.commit()

def run_benchmark():
    print("=" * 80)
    print("BENCHMARK ACADÊMICO: LISTAGEM DA WISHLIST POR USUÁRIO (TEMPO X n)")
    print("=" * 80)

    user_id = "test-user-id"

    # 1. Planos de execução
    c = sqlite3.connect(":memory:")
    setup_schema(c)
    populate(c, 100, user_id)

    print("\n1. Planos de Execução ANTES do índice composto:")
    plan_before = c.execute("""
        EXPLAIN QUERY PLAN
        SELECT * FROM "Wishlist"
        WHERE "userId" = ?
        ORDER BY "createdAt" DESC
    """, (user_id,)).fetchall()
    for step in plan_before:
        print(f"  {step[3]}")

    c.execute('CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt")')

    print("\n2. Planos de Execução DEPOIS do índice composto:")
    plan_after = c.execute("""
        EXPLAIN QUERY PLAN
        SELECT * FROM "Wishlist"
        WHERE "userId" = ?
        ORDER BY "createdAt" DESC
    """, (user_id,)).fetchall()
    for step in plan_after:
        print(f"  {step[3]}")
    c.close()

    print("\n3. Medições Empíricas de Listagem Ordenada (Mediana de 21 execuções):")
    print(f"{'n itens':>10} | {'Sem Índice (com Sort B-Tree)':>30} | {'Com Índice (Pré-ordenado)':>26} | {'Ganho':>10}")
    print("-" * 85)

    for n in SIZES:
        conn = sqlite3.connect(":memory:")
        setup_schema(conn)
        populate(conn, n, user_id)

        # Sem índice
        times_no_idx = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            conn.execute('SELECT * FROM "Wishlist" WHERE "userId" = ? ORDER BY "createdAt" DESC', (user_id,)).fetchall()
            times_no_idx.append((time.perf_counter() - t0) * 1000)

        # Com índice
        conn.execute('CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt")')
        times_with_idx = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            conn.execute('SELECT * FROM "Wishlist" WHERE "userId" = ? ORDER BY "createdAt" DESC', (user_id,)).fetchall()
            times_with_idx.append((time.perf_counter() - t0) * 1000)

        conn.close()

        med_no = statistics.median(times_no_idx)
        med_with = statistics.median(times_with_idx)
        speedup = med_no / med_with if med_with > 0 else 0

        print(f"{n:>10,} | {med_no:>27.4f} ms | {med_with:>23.4f} ms | {speedup:>9.2f}x")

    print("-" * 85)
    print("Conclusão: O índice composto Wishlist(userId, createdAt) elimina a estrutura B-Tree temporária")
    print("necessária para ordenar o resultado em memória, entregando registros já ordenados.")

if __name__ == "__main__":
    run_benchmark()
