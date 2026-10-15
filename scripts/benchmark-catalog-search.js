const fs = require('fs');
const path = require('path');
const {
  findBySlugLinear,
  createSlugIndex,
  findBySlugMap,
  filterByStatusLinear,
  createStatusIndex,
  filterByStatusMap,
} = require('../backend/src/utils/catalogSearch.js');

function nanoToMs(nano) {
  return Number(nano) / 1_000_000;
}

function runBenchmark() {
  console.log('Iniciando Benchmark: Busca por Slug e Filtro por Categoria...\n');

  const sizes = [10, 100, 1000, 10000, 100000];
  const repetitions = 30;
  const warmupIterations = 5;
  const queryCount = 100;

  const slugResults = [];
  const statusResults = [];

  console.log('--- 1. Busca por Slug ---');

  for (const n of sizes) {
    console.log(`Testando n = ${n}...`);
    const items = Array.from({ length: n }, (_, i) => ({
      id: `game-${i}`,
      slug: `slug-game-${i}`,
      title: `Jogo ${i}`,
      status: i % 3 === 0 ? 'FEATURED' : i % 3 === 1 ? 'AVAILABLE' : 'COMING_SOON',
    }));

    const queries = Array.from({ length: queryCount }, (_, i) => {
      if (i % 2 === 0) {
        const randIdx = Math.floor(Math.random() * n);
        return `slug-game-${randIdx}`;
      } else {
        return `slug-inexistente-${i}`;
      }
    });

    const verifyIndex = createSlugIndex(items);
    for (const q of queries) {
      const lin = findBySlugLinear(items, q);
      const mp = findBySlugMap(verifyIndex, q);
      if (lin !== mp) {
        throw new Error(`Inconsistência na busca por slug para chave: ${q}`);
      }
    }

    const firstSlug = items[0].slug;
    const absentSlug = 'slug-inexistente-xyz';

    for (let w = 0; w < warmupIterations; w++) {
      findBySlugLinear(items, firstSlug);
      const tempIdx = createSlugIndex(items);
      findBySlugMap(tempIdx, firstSlug);
    }

    let linearBestTotal = 0n;
    let mapBestTotal = 0n;
    let linearWorstTotal = 0n;
    let mapWorstTotal = 0n;
    let linearQueryTotal = 0n;
    let mapSetupTotal = 0n;
    let mapQueryTotal = 0n;

    for (let r = 0; r < repetitions; r++) {
      let t0 = process.hrtime.bigint();
      findBySlugLinear(items, firstSlug);
      let t1 = process.hrtime.bigint();
      linearBestTotal += (t1 - t0);

      const prebuiltIndex = createSlugIndex(items);
      t0 = process.hrtime.bigint();
      findBySlugMap(prebuiltIndex, firstSlug);
      t1 = process.hrtime.bigint();
      mapBestTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      findBySlugLinear(items, absentSlug);
      t1 = process.hrtime.bigint();
      linearWorstTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      findBySlugMap(prebuiltIndex, absentSlug);
      t1 = process.hrtime.bigint();
      mapWorstTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      for (let q = 0; q < queryCount; q++) {
        findBySlugLinear(items, queries[q]);
      }
      t1 = process.hrtime.bigint();
      linearQueryTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      const freshIndex = createSlugIndex(items);
      t1 = process.hrtime.bigint();
      mapSetupTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      for (let q = 0; q < queryCount; q++) {
        findBySlugMap(freshIndex, queries[q]);
      }
      t1 = process.hrtime.bigint();
      mapQueryTotal += (t1 - t0);
    }

    const repsBig = BigInt(repetitions);
    const avgLinearBestMs = nanoToMs(linearBestTotal / repsBig);
    const avgMapBestMs = nanoToMs(mapBestTotal / repsBig);
    const avgLinearWorstMs = nanoToMs(linearWorstTotal / repsBig);
    const avgMapWorstMs = nanoToMs(mapWorstTotal / repsBig);
    const avgLinearQMs = nanoToMs(linearQueryTotal / repsBig);
    const avgMapSetupMs = nanoToMs(mapSetupTotal / repsBig);
    const avgMapQMs = nanoToMs(mapQueryTotal / repsBig);
    const avgMapTotalMs = avgMapSetupMs + avgMapQMs;

    slugResults.push({
      n,
      queryCount,
      linearBestMs: avgLinearBestMs.toFixed(6),
      mapBestMs: avgMapBestMs.toFixed(6),
      linearWorstMs: avgLinearWorstMs.toFixed(6),
      mapWorstMs: avgMapWorstMs.toFixed(6),
      linearQueriesTotalMs: avgLinearQMs.toFixed(6),
      mapSetupMs: avgMapSetupMs.toFixed(6),
      mapQueriesOnlyMs: avgMapQMs.toFixed(6),
      mapTotalWithSetupMs: avgMapTotalMs.toFixed(6),
    });
  }

  console.log('\n--- 2. Filtro por Status ---');

  for (const n of sizes) {
    console.log(`Testando n = ${n}...`);
    const items = Array.from({ length: n }, (_, i) => ({
      id: `game-${i}`,
      slug: `slug-game-${i}`,
      status: i % 3 === 0 ? 'FEATURED' : i % 3 === 1 ? 'AVAILABLE' : 'COMING_SOON',
    }));

    const statusQueries = ['FEATURED', 'AVAILABLE', 'COMING_SOON', 'FEATURED'];

    const verifyStatusIndex = createStatusIndex(items);
    for (const st of statusQueries) {
      const lin = filterByStatusLinear(items, st);
      const mp = filterByStatusMap(verifyStatusIndex, items, st, false);
      if (lin.length !== mp.length || lin.some((it, idx) => it !== mp[idx])) {
        throw new Error(`Inconsistência no filtro por status para: ${st}`);
      }
    }

    for (let w = 0; w < warmupIterations; w++) {
      filterByStatusLinear(items, 'FEATURED');
      const tempIdx = createStatusIndex(items);
      filterByStatusMap(tempIdx, items, 'FEATURED');
    }

    let linearFilterTotal = 0n;
    let mapSetupTotal = 0n;
    let mapLookupTotal = 0n;
    let mapMaterializedTotal = 0n;

    for (let r = 0; r < repetitions; r++) {
      let t0 = process.hrtime.bigint();
      for (const st of statusQueries) {
        filterByStatusLinear(items, st);
      }
      let t1 = process.hrtime.bigint();
      linearFilterTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      const statusIdx = createStatusIndex(items);
      t1 = process.hrtime.bigint();
      mapSetupTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      for (const st of statusQueries) {
        filterByStatusMap(statusIdx, items, st, false);
      }
      t1 = process.hrtime.bigint();
      mapLookupTotal += (t1 - t0);

      t0 = process.hrtime.bigint();
      for (const st of statusQueries) {
        filterByStatusMap(statusIdx, items, st, true);
      }
      t1 = process.hrtime.bigint();
      mapMaterializedTotal += (t1 - t0);
    }

    const repsBig = BigInt(repetitions);
    const avgLinearMs = nanoToMs(linearFilterTotal / repsBig);
    const avgMapSetupMs = nanoToMs(mapSetupTotal / repsBig);
    const avgMapLookupMs = nanoToMs(mapLookupTotal / repsBig);
    const avgMapMaterializedMs = nanoToMs(mapMaterializedTotal / repsBig);
    const avgMapTotalRefMs = avgMapSetupMs + avgMapLookupMs;
    const avgMapTotalCloneMs = avgMapSetupMs + avgMapMaterializedMs;

    statusResults.push({
      n,
      queriesCount: statusQueries.length,
      linearFilterMs: avgLinearMs.toFixed(6),
      mapSetupMs: avgMapSetupMs.toFixed(6),
      mapLookupOnlyMs: avgMapLookupMs.toFixed(6),
      mapMaterializedOnlyMs: avgMapMaterializedMs.toFixed(6),
      mapTotalRefMs: avgMapTotalRefMs.toFixed(6),
      mapTotalCloneMs: avgMapTotalCloneMs.toFixed(6),
    });
  }

  const csvDir = path.join(__dirname, 'results');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  const slugCsvHeader = 'n,queryCount,linearBestMs,mapBestMs,linearWorstMs,mapWorstMs,linearQueriesTotalMs,mapSetupMs,mapQueriesOnlyMs,mapTotalWithSetupMs\n';
  const slugCsvRows = slugResults.map(r => Object.values(r).join(',')).join('\n');
  const slugCsvPath = path.join(csvDir, 'benchmark-slug-search.csv');
  fs.writeFileSync(slugCsvPath, slugCsvHeader + slugCsvRows + '\n');
  console.log(`\nResultados de Busca por Slug salvos em: ${slugCsvPath}`);

  const statusCsvHeader = 'n,queriesCount,linearFilterMs,mapSetupMs,mapLookupOnlyMs,mapMaterializedOnlyMs,mapTotalRefMs,mapTotalCloneMs\n';
  const statusCsvRows = statusResults.map(r => Object.values(r).join(',')).join('\n');
  const statusCsvPath = path.join(csvDir, 'benchmark-status-filter.csv');
  fs.writeFileSync(statusCsvPath, statusCsvHeader + statusCsvRows + '\n');
  console.log(`Resultados de Filtro por Status salvos em: ${statusCsvPath}`);

  console.log('\n--- TABELA RESUMO: BUSCA POR SLUG (q = 100 consultas) ---');
  console.table(slugResults);

  console.log('\n--- TABELA RESUMO: FILTRO POR STATUS (4 consultas por categoria) ---');
  console.table(statusResults);
}

runBenchmark();
