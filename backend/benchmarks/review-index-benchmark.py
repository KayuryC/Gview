
import sqlite3
import statistics
import time

N = 100_000
conn = sqlite3.connect(":memory:")

conn.execute("""
CREATE TABLE ReviewBench (
    id INTEGER PRIMARY KEY,
    gameId INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    payload TEXT
)
""")

conn.executemany(
    """
    INSERT INTO ReviewBench (id, gameId, createdAt, payload)
    VALUES (?, ?, ?, ?)
    """,
    ((i, i % 100, i, "review") for i in range(1, N + 1)),
)
conn.commit()

query = """
SELECT id, gameId, createdAt, payload
FROM ReviewBench
WHERE gameId = ?
ORDER BY createdAt DESC
"""

def measure():
    samples = []
    for _ in range(9):
        start = time.perf_counter()
        rows = conn.execute(query, (42,)).fetchall()
        samples.append(time.perf_counter() - start)
    return statistics.median(samples), len(rows)

def explain():
    return [
        row[3]
        for row in conn.execute(
            "EXPLAIN QUERY PLAN " + query, (42,)
        )
    ]

before, count_before = measure()
plan_before = explain()

conn.execute(
    """
    CREATE INDEX idx_ReviewBench_game_created
    ON ReviewBench(gameId, createdAt)
    """
)
conn.commit()

after, count_after = measure()
plan_after = explain()

print(f"Registros na tabela: {N}")
print(
    f"Resultados por consulta: antes={count_before}, "
    f"depois={count_after}"
)
print(f"Mediana sem índice: {before * 1000:.3f} ms")
print(f"Mediana com índice: {after * 1000:.3f} ms")
print(f"Razão antes/depois: {before / after:.2f}x")
print(f"Plano sem índice: {plan_before}")
print(f"Plano com índice: {plan_after}")

conn.close()
