"""
Benchmark: índice composto Game(status, createdAt)
===================================================
Mede o impacto do índice na consulta:
    SELECT * FROM "Game" WHERE status = ? ORDER BY createdAt DESC

Metodologia
-----------
- Banco SQLite em memória (não afeta dev.db).
- 100.000 registros com distribuição realista de status.
- 31 execuções por cenário; mediana e percentis reportados.
- EXPLAIN QUERY PLAN capturado antes e depois do índice.
- Limitações: ambiente sintético; latência real da API inclui
  overhead de rede, Prisma e Node.js não medidos aqui.
"""

import sqlite3
import time
import statistics
import random
import string

# ─── Parâmetros ──────────────────────────────────────────────────────────────
N_ROWS       = 100_000
N_RUNS       = 31
FILTER_STATUS = "FEATURED"
STATUSES     = ["FEATURED", "AVAILABLE", "COMING_SOON"]
STATUS_DIST  = [0.20, 0.60, 0.20]  # proporção por status

# ─── Helpers ─────────────────────────────────────────────────────────────────
def random_str(n=12):
    return "".join(random.choices(string.ascii_lowercase, k=n))

def create_schema(conn):
    conn.execute("""
        CREATE TABLE "Game" (
            id               TEXT PRIMARY KEY,
            title            TEXT,
            slug             TEXT UNIQUE,
            shortDescription TEXT,
            fullDescription  TEXT,
            coverUrl         TEXT,
            trailerUrl       TEXT,
            demoUrl          TEXT,
            status           TEXT DEFAULT 'AVAILABLE',
            genre            TEXT,
            studioName       TEXT,
            launchWindow     TEXT,
            createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt        DATETIME
        )
    """)

def seed(conn, n):
    """Insere n registros com distribuição de status configurada."""
    rows = []
    for i in range(n):
        status = random.choices(STATUSES, STATUS_DIST)[0]
        slug   = f"game-{i}-{random_str(6)}"
        # createdAt distribuído ao longo de 2 anos (em segundos Unix)
        ts = 1_700_000_000 + random.randint(0, 63_072_000)
        rows.append((
            f"id-{i}", f"Game {i}", slug, "Short desc", None,
            None, None, None, status, "RPG", "Studio", None,
            ts, ts
        ))
    conn.executemany("""
        INSERT INTO "Game"
            (id, title, slug, shortDescription, fullDescription,
             coverUrl, trailerUrl, demoUrl, status, genre, studioName,
             launchWindow, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, rows)
    conn.commit()

def explain(conn, status_filter=None):
    """Retorna o plano EXPLAIN QUERY PLAN."""
    if status_filter:
        rows = conn.execute(
            'EXPLAIN QUERY PLAN SELECT * FROM "Game" WHERE "status" = ? ORDER BY "createdAt" DESC',
            (status_filter,)
        ).fetchall()
    else:
        rows = conn.execute(
            'EXPLAIN QUERY PLAN SELECT * FROM "Game" ORDER BY "createdAt" DESC'
        ).fetchall()
    return [r[3] for r in rows]

def benchmark(conn, status_filter, n_runs):
    """Mede o tempo mediano de n_runs execuções."""
    times = []
    for _ in range(n_runs):
        t0 = time.perf_counter()
        if status_filter:
            conn.execute(
                'SELECT * FROM "Game" WHERE "status" = ? ORDER BY "createdAt" DESC',
                (status_filter,)
            ).fetchall()
        else:
            conn.execute(
                'SELECT * FROM "Game" ORDER BY "createdAt" DESC'
            ).fetchall()
        times.append((time.perf_counter() - t0) * 1000)
    return times

def report(label, times):
    med  = statistics.median(times)
    mn   = min(times)
    mx   = max(times)
    p95  = sorted(times)[int(len(times) * 0.95)]
    print(f"  {label:<30}  mediana={med:.3f}ms  min={mn:.3f}ms  p95={p95:.3f}ms  max={mx:.3f}ms")
    return med

# ─── Execução ────────────────────────────────────────────────────────────────
def main():
    print(f"Benchmark: Game(status, createdAt) — {N_ROWS:,} registros, {N_RUNS} execuções\n")

    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA journal_mode=WAL")

    print("Criando schema e inserindo dados...")
    create_schema(conn)
    seed(conn, N_ROWS)

    # Contagem por status
    for s in STATUSES:
        c = conn.execute('SELECT COUNT(*) FROM "Game" WHERE status=?', (s,)).fetchone()[0]
        print(f"  {s}: {c:,} registros")
    print()

    # ── FASE 1: sem índice ────────────────────────────────────────────────────
    print("=== SEM ÍNDICE ===")
    plan_before_filtered   = explain(conn, FILTER_STATUS)
    plan_before_unfiltered = explain(conn, None)
    print(f"  Plano (filtrado por status):  {plan_before_filtered}")
    print(f"  Plano (sem filtro):            {plan_before_unfiltered}")
    times_sem_filtered   = benchmark(conn, FILTER_STATUS, N_RUNS)
    times_sem_unfiltered = benchmark(conn, None, N_RUNS)
    med_sem_f = report(f"Com filtro status={FILTER_STATUS!r}", times_sem_filtered)
    med_sem_u = report("Sem filtro (full scan + sort)", times_sem_unfiltered)
    print()

    # ── Criar índice ──────────────────────────────────────────────────────────
    print("Criando índice Game_status_createdAt_idx...")
    conn.execute('CREATE INDEX "Game_status_createdAt_idx" ON "Game"("status", "createdAt")')
    conn.commit()
    print()

    # ── FASE 2: com índice ────────────────────────────────────────────────────
    print("=== COM ÍNDICE ===")
    plan_after_filtered   = explain(conn, FILTER_STATUS)
    plan_after_unfiltered = explain(conn, None)
    print(f"  Plano (filtrado por status):  {plan_after_filtered}")
    print(f"  Plano (sem filtro):            {plan_after_unfiltered}")
    times_com_filtered   = benchmark(conn, FILTER_STATUS, N_RUNS)
    times_com_unfiltered = benchmark(conn, None, N_RUNS)
    med_com_f = report(f"Com filtro status={FILTER_STATUS!r}", times_com_filtered)
    med_com_u = report("Sem filtro", times_com_unfiltered)
    print()

    # ── Resumo ────────────────────────────────────────────────────────────────
    print("=== RESUMO ===")
    if med_sem_f > 0 and med_com_f > 0:
        melhoria_f = (1 - med_com_f / med_sem_f) * 100
        fator_f    = med_sem_f / med_com_f
        print(f"  Consulta filtrada:   {med_sem_f:.3f}ms → {med_com_f:.3f}ms  "
              f"({melhoria_f:+.1f}%  {fator_f:.2f}x mais rápida)")
    if med_sem_u > 0 and med_com_u > 0:
        melhoria_u = (1 - med_com_u / med_sem_u) * 100
        print(f"  Consulta não filtrada: {med_sem_u:.3f}ms → {med_com_u:.3f}ms  "
              f"({melhoria_u:+.1f}%)")

    print()
    print("Limitações: banco em memória, SQLite puro (sem Prisma/Node.js/rede).")
    print("Os tempos refletem apenas a camada SQL. Resultados em produção variam.")

    conn.close()

if __name__ == "__main__":
    main()
