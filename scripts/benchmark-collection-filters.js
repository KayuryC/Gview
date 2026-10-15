const fs = require('fs');
const path = require('path');

function nanoToMs(nano) {
  return Number(nano) / 1_000_000;
}

async function runBenchmark() {
  console.log('Iniciando Benchmark: Diferença de Coleções (Ingênua vs. Set)...\n');

  const {
    filterAvailableGamesNaive,
    filterAvailableGamesSet,
  } = await import('../frontend/src/utils/collectionFilters.js');

  const sizes = [10, 100, 1000, 10000, 50000];
  const results = [];

  for (const n of sizes) {
    const m = Math.floor(n * 0.5);
    console.log(`Testando n = ${n} (catálogo), m = ${m} (itens na coleção)...`);

    const allGames = Array.from({ length: n }, (_, i) => ({
      id: `game-${i}`,
      title: `Jogo ${i}`,
    }));

    const collectionItems = Array.from({ length: m }, (_, i) => ({
      id: `item-${i}`,
      gameId: `game-${i * 2}`,
    }));

    const verificationNaive = filterAvailableGamesNaive(allGames, collectionItems);
    const verificationSet = filterAvailableGamesSet(allGames, collectionItems);
    if (
      verificationNaive.length !== verificationSet.length ||
      verificationNaive.some((g, idx) => g.id !== verificationSet[idx].id)
    ) {
      throw new Error(`Inconsistência detectada entre as versões ingênua e Set para n = ${n}`);
    }

    const repetitions = n <= 1000 ? 50 : n <= 10000 ? 20 : 5;

    for (let w = 0; w < 3; w++) {
      filterAvailableGamesNaive(allGames.slice(0, 50), collectionItems.slice(0, 25));
      filterAvailableGamesSet(allGames.slice(0, 50), collectionItems.slice(0, 25));
    }

    let naiveTotalNano = 0n;
    let setSetupTotalNano = 0n;
    let setFilterTotalNano = 0n;

    for (let r = 0; r < repetitions; r++) {
      let t0 = process.hrtime.bigint();
      filterAvailableGamesNaive(allGames, collectionItems);
      let t1 = process.hrtime.bigint();
      naiveTotalNano += (t1 - t0);

      t0 = process.hrtime.bigint();
      const existingIds = new Set();
      for (let i = 0; i < collectionItems.length; i++) {
        existingIds.add(collectionItems[i].gameId);
      }
      t1 = process.hrtime.bigint();
      setSetupTotalNano += (t1 - t0);

      t0 = process.hrtime.bigint();
      allGames.filter(game => !existingIds.has(game.id));
      t1 = process.hrtime.bigint();
      setFilterTotalNano += (t1 - t0);
    }

    const repsBig = BigInt(repetitions);
    const avgNaiveMs = nanoToMs(naiveTotalNano / repsBig);
    const avgSetSetupMs = nanoToMs(setSetupTotalNano / repsBig);
    const avgSetFilterMs = nanoToMs(setFilterTotalNano / repsBig);
    const avgSetTotalMs = avgSetSetupMs + avgSetFilterMs;
    const speedup = (avgNaiveMs / avgSetTotalMs).toFixed(2);

    results.push({
      n,
      m,
      repetitions,
      naiveTotalMs: avgNaiveMs.toFixed(6),
      setSetupOnlyMs: avgSetSetupMs.toFixed(6),
      setFilterOnlyMs: avgSetFilterMs.toFixed(6),
      setTotalWithSetupMs: avgSetTotalMs.toFixed(6),
      speedupFactor: `${speedup}x`,
    });
  }

  console.log('Executando medição específica para n = 100.000 (1 iteração)...');
  const n100k = 100000;
  const m100k = 50000;
  const all100k = Array.from({ length: n100k }, (_, i) => ({ id: `g-${i}` }));
  const items100k = Array.from({ length: m100k }, (_, i) => ({ gameId: `g-${i * 2}` }));

  let t0 = process.hrtime.bigint();
  const set100k = new Set();
  for (let i = 0; i < items100k.length; i++) {
    set100k.add(items100k[i].gameId);
  }
  let t1 = process.hrtime.bigint();
  const setSetup100kMs = nanoToMs(t1 - t0);

  t0 = process.hrtime.bigint();
  const set100kOut = all100k.filter(g => !set100k.has(g.id));
  t1 = process.hrtime.bigint();
  const setFilter100kMs = nanoToMs(t1 - t0);
  const setTotal100kMs = setSetup100kMs + setFilter100kMs;

  console.log(`Set para n = 100.000 concluído em ${setTotal100kMs.toFixed(2)} ms.`);
  console.log('Iniciando versão ingênua para n = 100.000...');

  t0 = process.hrtime.bigint();
  const naive100kOut = filterAvailableGamesNaive(all100k, items100k);
  t1 = process.hrtime.bigint();
  const naive100kMs = nanoToMs(t1 - t0);
  console.log(`Ingênuo para n = 100.000 concluído em ${naive100kMs.toFixed(2)} ms.`);

  if (
    naive100kOut.length !== set100kOut.length ||
    naive100kOut[0]?.id !== set100kOut[0]?.id ||
    naive100kOut[naive100kOut.length - 1]?.id !== set100kOut[set100kOut.length - 1]?.id
  ) {
    throw new Error('Inconsistência detectada entre as versões ingênua e Set para n = 100.000');
  }

  const speedup100k = (naive100kMs / setTotal100kMs).toFixed(2);

  results.push({
    n: n100k,
    m: m100k,
    repetitions: 1,
    naiveTotalMs: naive100kMs.toFixed(6),
    setSetupOnlyMs: setSetup100kMs.toFixed(6),
    setFilterOnlyMs: setFilter100kMs.toFixed(6),
    setTotalWithSetupMs: setTotal100kMs.toFixed(6),
    speedupFactor: `${speedup100k}x`,
  });

  const csvDir = path.join(__dirname, 'results');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  const csvHeader = 'n,m,repetitions,naiveTotalMs,setSetupOnlyMs,setFilterOnlyMs,setTotalWithSetupMs,speedupFactor\n';
  const csvRows = results.map(r => Object.values(r).join(',')).join('\n');
  const csvPath = path.join(csvDir, 'benchmark-collection-filter.csv');
  fs.writeFileSync(csvPath, csvHeader + csvRows + '\n');
  console.log(`\nResultados salvos em: ${csvPath}`);

  console.log('\n--- TABELA RESUMO: DIFERENÇA DE COLEÇÕES (Ingênua O(n*m) vs Set O(n+m)) ---');
  console.table(results);
}

runBenchmark();
