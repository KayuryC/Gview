"""
Benchmark: Índice Submission(createdAt) para Listagem de Submissões
===================================================================
Mede o impacto do índice Submission(createdAt) na consulta de listagem:
    SELECT * FROM "Submission" ORDER BY "createdAt" DESC

Metodologia:
- Banco SQLite em memória (não modifica dev.db).
- Mede o tempo com entradas crescentes de n submissões.
- Registra os planos EXPLAIN QUERY PLAN antes e depois do índice.
"""

import sqlite3
import time
import statistics

SIZES = [10, 100, 1_000, 10_000, 50_000, 100_000]
RUNS = 21

def setup_schema(conn):
    conn.execute("""
        CREATE TABLE "Submission" (
            id TEXT PRIMARY KEY,
            gameTitle TEXT,
            projectUrl TEXT,
            description TEXT,
            launchPlans TEXT,
            targetPlatforms TEXT,
            launchDateRange TEXT,
            demoLink TEXT,
            nextFestParticipation INTEGER DEFAULT 0,
            heardAbout TEXT,
            additionalInfo TEXT,
            contactRole TEXT,
            contactEmail TEXT,
            studioName TEXT,
            attachmentUrl TEXT,
            reviewStatus TEXT DEFAULT 'PENDING',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME
        )
    """)

def populate(conn, n):
    rows = []
    for i in range(n):
        ts = f"2026-01-01 {i:06d}"
        rows.append((
            f"sub-{i}", f"Game {i}", "https://example.com", "Long description of the game",
            "Steam release", "PC", "Q4 2026", "https://demo.com", 0, "Twitter",
            "None", "Developer", "dev@example.com", "Studio", None, "PENDING", ts, "2026-01-01"
        ))
    conn.executemany('INSERT INTO "Submission" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', rows)
    conn.commit()

def run_benchmark():
    print("=" * 80)
    print("BENCHMARK ACADÊMICO: LISTAGEM DE SUBMISSÕES (TEMPO X n)")
    print("=" * 80)

    # 1. Planos de execução
    c = sqlite3.connect(":memory:")
    setup_schema(c)
    populate(c, 100)

    print("\n1. Planos de Execução ANTES do índice:")
    plan_before = c.execute('EXPLAIN QUERY PLAN SELECT * FROM "Submission" ORDER BY "createdAt" DESC').fetchall()
    for step in plan_before:
        print(f"  {step[3]}")

    c.execute('CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt" DESC)')

    print("\n2. Planos de Execução DEPOIS do índice:")
    plan_after = c.execute('EXPLAIN QUERY PLAN SELECT * FROM "Submission" ORDER BY "createdAt" DESC').fetchall()
    for step in plan_after:
        print(f"  {step[3]}")
    c.close()

    print("\n3. Medições Empíricas de Listagem Ordenada (Mediana de 21 execuções):")
    print(f"{'n Submissões':>14} | {'Sem Índice (com Sort B-Tree)':>30} | {'Com Índice (Pré-ordenado)':>26} | {'Ganho':>10}")
    print("-" * 87)

    for n in SIZES:
        conn = sqlite3.connect(":memory:")
        setup_schema(conn)
        populate(conn, n)

        # Sem índice
        times_no_idx = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            conn.execute('SELECT * FROM "Submission" ORDER BY "createdAt" DESC').fetchall()
            times_no_idx.append((time.perf_counter() - t0) * 1000)

        # Com índice
        conn.execute('CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt" DESC)')
        times_with_idx = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            conn.execute('SELECT * FROM "Submission" ORDER BY "createdAt" DESC').fetchall()
            times_with_idx.append((time.perf_counter() - t0) * 1000)

        conn.close()

        med_no = statistics.median(times_no_idx)
        med_with = statistics.median(times_with_idx)
        speedup = med_no / med_with if med_with > 0 else 0

        print(f"{n:>14,} | {med_no:>27.4f} ms | {med_with:>23.4f} ms | {speedup:>9.2f}x")

    print("-" * 87)
    print("Conclusão: O índice Submission(createdAt) elimina a estrutura B-Tree temporária necessária para")
    print("ordenar os registros da tabela em memória, entregando-os pré-ordenados.")

if __name__ == "__main__":
    run_benchmark()
