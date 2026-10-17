"""
Benchmark: Verificação de Jogo na Wishlist
===========================================
Compara a abordagem anterior com a refatorada:
- Abordagem anterior:
    Banco: busca lista completa do usuário (JOIN Wishlist e Game, ORDER BY createdAt DESC) -> O(n)
    Cliente: busca linear com list.some(...) sobre os n itens -> O(n)
- Abordagem refatorada:
    Banco: busca pontual usando a constraint UNIQUE(userId, gameId) -> O(1) relativo a n
    Cliente: atribuição direta do booleano -> O(1)

Entrada n: número de jogos na wishlist do usuário.
Testado com n = 10, 100, 1.000, 10.000, 50.000.
"""

import sqlite3
import time
import statistics

TEST_SIZES = [10, 100, 1_000, 10_000, 50_000]
RUNS = 21

def setup_db(conn):
    conn.execute("""
        CREATE TABLE "Game" (
            id TEXT PRIMARY KEY,
            title TEXT,
            slug TEXT UNIQUE,
            shortDescription TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE "Wishlist" (
            id TEXT PRIMARY KEY,
            userId TEXT,
            gameId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
            FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
            UNIQUE(userId, gameId)
        )
    """)

def populate_data(conn, n, user_id):
    # Inserir n jogos e vinculá-los à wishlist do usuário
    games = [(f"game-{i}", f"Game {i}", f"game-{i}", "Desc") for i in range(n)]
    conn.executemany('INSERT INTO "Game" (id, title, slug, shortDescription) VALUES (?, ?, ?, ?)', games)

    wishlist = [(f"w-{i}", user_id, f"game-{i}") for i in range(n)]
    conn.executemany('INSERT INTO "Wishlist" (id, userId, gameId) VALUES (?, ?, ?)', wishlist)
    conn.commit()

def run_benchmark():
    print("=" * 75)
    print("BENCHMARK ACADÊMICO: VERIFICAÇÃO DE JOGO NA WISHLIST (TEMPO X n)")
    print("=" * 75)

    user_id = "user-test"

    print("\n1. Planos de Execução (EXPLAIN QUERY PLAN)")
    temp_conn = sqlite3.connect(":memory:")
    setup_db(temp_conn)
    populate_data(temp_conn, 100, user_id)

    plan_before = temp_conn.execute("""
        EXPLAIN QUERY PLAN
        SELECT w.id, w.gameId, g.title, g.shortDescription
        FROM "Wishlist" w
        JOIN "Game" g ON g.id = w.gameId
        WHERE w.userId = ?
        ORDER BY w.createdAt DESC
    """, (user_id,)).fetchall()

    plan_after = temp_conn.execute("""
        EXPLAIN QUERY PLAN
        SELECT id FROM "Wishlist"
        WHERE userId = ? AND gameId = ?
        LIMIT 1
    """, (user_id, "game-99")).fetchall()

    print("  Plano ANTERIOR (busca lista completa com join):")
    for step in plan_before:
        print(f"    {step[3]}")

    print("  Plano REFATORADO (busca pontual com índice único):")
    for step in plan_after:
        print(f"    {step[3]}")
    temp_conn.close()

    print("\n2. Medição com Entradas Crescentes (Mediana de 21 execuções)")
    print(f"{'n':>7} | {'Anterior (Banco+Busca)':>24} | {'Refatorado (Pontual)':>22} | {'Fator de Ganho':>14}")
    print("-" * 75)

    for n in TEST_SIZES:
        conn = sqlite3.connect(":memory:")
        setup_db(conn)
        populate_data(conn, n, user_id)

        target_game = f"game-{n-1}" # pior caso para busca linear: elemento no fim da lista

        # Medição ANTERIOR
        times_before = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            # 1. Consulta SQL retornando a lista inteira
            rows = conn.execute("""
                SELECT w.id, w.gameId, g.title, g.shortDescription
                FROM "Wishlist" w
                JOIN "Game" g ON g.id = w.gameId
                WHERE w.userId = ?
                ORDER BY w.createdAt DESC
            """, (user_id,)).fetchall()
            # 2. Busca linear no cliente (simulando Array.prototype.some)
            found = False
            for r in rows:
                if r[1] == target_game:
                    found = True
                    break
            times_before.append((time.perf_counter() - t0) * 1000)

        # Medição REFATORADA
        times_after = []
        for _ in range(RUNS):
            t0 = time.perf_counter()
            # 1. Consulta pontual com índice único
            row = conn.execute("""
                SELECT id FROM "Wishlist"
                WHERE userId = ? AND gameId = ?
                LIMIT 1
            """, (user_id, target_game)).fetchone()
            # 2. Atribuição direta booleana no cliente
            found = bool(row)
            times_after.append((time.perf_counter() - t0) * 1000)

        conn.close()

        med_before = statistics.median(times_before)
        med_after = statistics.median(times_after)
        speedup = med_before / med_after if med_after > 0 else 0

        print(f"{n:>7,} | {med_before:>21.4f} ms | {med_after:>19.4f} ms | {speedup:>13.1f}x")

    print("-" * 75)
    print("Conclusão: Enquanto a abordagem anterior cresce linearmente O(n),")
    print("a abordagem refatorada permanece em tempo constante O(1) relativo a n.")

if __name__ == "__main__":
    run_benchmark()
