const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findBySlugLinear,
  createSlugIndex,
  findBySlugMap,
  filterByStatusLinear,
  createStatusIndex,
  filterByStatusMap,
} = require('../backend/src/utils/catalogSearch.js');

test('catalogSearch — Busca por Slug: equivalência, casos extremos e duplicatas', async (t) => {
  const sampleGames = [
    { id: '1', slug: 'hollow-knight', title: 'Hollow Knight', status: 'AVAILABLE' },
    { id: '2', slug: 'celeste', title: 'Celeste', status: 'FEATURED' },
    { id: '3', slug: 'dead-cells', title: 'Dead Cells', status: 'AVAILABLE' },
    { id: '4', slug: 'hades', title: 'Hades', status: 'COMING_SOON' },
  ];

  await t.test('deve retornar exatamente o mesmo jogo para chaves existentes', () => {
    const slugIndex = createSlugIndex(sampleGames);
    for (const game of sampleGames) {
      const linear = findBySlugLinear(sampleGames, game.slug);
      const mapped = findBySlugMap(slugIndex, game.slug);
      assert.deepStrictEqual(mapped, linear);
      assert.strictEqual(mapped, game);
    }
  });

  await t.test('deve retornar undefined para chaves ausentes', () => {
    const slugIndex = createSlugIndex(sampleGames);
    const linear = findBySlugLinear(sampleGames, 'nao-existe');
    const mapped = findBySlugMap(slugIndex, 'nao-existe');
    assert.strictEqual(linear, undefined);
    assert.strictEqual(mapped, undefined);
    assert.deepStrictEqual(mapped, linear);
  });

  await t.test('deve lidar com coleções vazias e nulas', () => {
    assert.strictEqual(findBySlugLinear([], 'teste'), undefined);
    assert.strictEqual(findBySlugLinear(null, 'teste'), undefined);

    const emptyIndex = createSlugIndex([]);
    assert.strictEqual(findBySlugMap(emptyIndex, 'teste'), undefined);

    const nullIndex = createSlugIndex(null);
    assert.strictEqual(findBySlugMap(nullIndex, 'teste'), undefined);
  });

  await t.test('deve preservar rigorosamente a PRIMEIRA ocorrência em caso de slugs duplicados (como Array.find)', () => {
    const gamesWithDuplicates = [
      { id: '1', slug: 'duplicate-game', title: 'Primeira Versão' },
      { id: '2', slug: 'other-game', title: 'Outro Jogo' },
      { id: '3', slug: 'duplicate-game', title: 'Segunda Versão (deve ser ignorada)' },
    ];

    const linear = findBySlugLinear(gamesWithDuplicates, 'duplicate-game');
    const slugIndex = createSlugIndex(gamesWithDuplicates);
    const mapped = findBySlugMap(slugIndex, 'duplicate-game');

    assert.strictEqual(linear.title, 'Primeira Versão');
    assert.strictEqual(mapped.title, 'Primeira Versão');
    assert.strictEqual(mapped, linear);
  });

  await t.test('deve lidar com elementos inválidos ou sem slug na coleção', () => {
    const gamesWithInvalid = [
      null,
      undefined,
      {},
      { id: '1', title: 'Sem slug' },
      { id: '2', slug: 'valido', title: 'Válido' },
    ];

    const linear = findBySlugLinear(gamesWithInvalid, 'valido');
    const slugIndex = createSlugIndex(gamesWithInvalid);
    const mapped = findBySlugMap(slugIndex, 'valido');

    assert.deepStrictEqual(mapped, linear);
    assert.strictEqual(mapped.title, 'Válido');

    assert.strictEqual(findBySlugLinear(gamesWithInvalid, 'inexistente'), undefined);
    assert.strictEqual(findBySlugMap(slugIndex, 'inexistente'), undefined);
  });

  await t.test('deve manter equivalência com coleções sintéticas crescentes', () => {
    for (const size of [10, 100, 1000, 10000]) {
      const synthetic = Array.from({ length: size }, (_, i) => ({
        id: `id-${i}`,
        slug: `game-slug-${i}`,
        title: `Game ${i}`,
        status: i % 2 === 0 ? 'AVAILABLE' : 'FEATURED',
      }));

      const index = createSlugIndex(synthetic);

      const testSlugs = ['game-slug-0', `game-slug-${Math.floor(size / 2)}`, `game-slug-${size - 1}`, 'game-slug-inexistente'];
      for (const slug of testSlugs) {
        const linear = findBySlugLinear(synthetic, slug);
        const mapped = findBySlugMap(index, slug);
        assert.deepStrictEqual(mapped, linear);
      }
    }
  });
});

test('catalogSearch — Filtro por Status: equivalência, ordem e casos extremos', async (t) => {
  const sampleGames = [
    { id: '1', slug: 'game-1', status: 'FEATURED' },
    { id: '2', slug: 'game-2', status: 'AVAILABLE' },
    { id: '3', slug: 'game-3', status: 'FEATURED' },
    { id: '4', slug: 'game-4', status: 'COMING_SOON' },
    { id: '5', slug: 'game-5', status: 'AVAILABLE' },
    { id: '6', slug: 'game-6', status: 'FEATURED' },
  ];

  await t.test('deve retornar exatamente a mesma lista e na mesma ordem para cada status', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const statuses = ['FEATURED', 'AVAILABLE', 'COMING_SOON'];

    for (const st of statuses) {
      const linear = filterByStatusLinear(sampleGames, st);
      const mapped = filterByStatusMap(statusIndex, sampleGames, st);
      assert.deepStrictEqual(mapped, linear);
      assert.strictEqual(mapped.length, linear.length);
      for (let i = 0; i < linear.length; i++) {
        assert.strictEqual(mapped[i], linear[i]);
      }
    }
  });

  await t.test('deve retornar todos os itens se status for nulo/vazio', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const linear = filterByStatusLinear(sampleGames, null);
    const mapped = filterByStatusMap(statusIndex, sampleGames, null);
    assert.deepStrictEqual(linear, sampleGames);
    assert.deepStrictEqual(mapped, sampleGames);
  });

  await t.test('deve retornar array vazio para status inexistente', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const linear = filterByStatusLinear(sampleGames, 'STATUS_INEXISTENTE');
    const mapped = filterByStatusMap(statusIndex, sampleGames, 'STATUS_INEXISTENTE');
    assert.deepStrictEqual(linear, []);
    assert.deepStrictEqual(mapped, []);
  });

  await t.test('deve lidar com coleções vazias e nulas', () => {
    assert.deepStrictEqual(filterByStatusLinear([], 'FEATURED'), []);
    assert.deepStrictEqual(filterByStatusLinear(null, 'FEATURED'), []);

    const emptyIndex = createStatusIndex([]);
    assert.deepStrictEqual(filterByStatusMap(emptyIndex, [], 'FEATURED'), []);

    const nullIndex = createStatusIndex(null);
    assert.deepStrictEqual(filterByStatusMap(nullIndex, null, 'FEATURED'), []);
  });

  await t.test('deve lidar com itens nulos ou sem status na coleção', () => {
    const gamesWithInvalid = [
      null,
      undefined,
      { id: '1', slug: 'sem-status' },
      { id: '2', slug: 'com-status', status: 'FEATURED' },
    ];

    const linear = filterByStatusLinear(gamesWithInvalid, 'FEATURED');
    const index = createStatusIndex(gamesWithInvalid);
    const mapped = filterByStatusMap(index, gamesWithInvalid, 'FEATURED');

    assert.deepStrictEqual(mapped, linear);
    assert.strictEqual(mapped.length, 1);
    assert.strictEqual(mapped[0].slug, 'com-status');
  });

  await t.test('deve suportar materialização por cópia superficial (clone = true)', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const reference = filterByStatusMap(statusIndex, sampleGames, 'FEATURED', false);
    const cloned = filterByStatusMap(statusIndex, sampleGames, 'FEATURED', true);

    assert.deepStrictEqual(cloned, reference);
    assert.notStrictEqual(cloned, reference);
  });
});

test('collectionFilters — Diferença de Conjuntos: equivalência, ordem e duplicatas', async (t) => {
  const { filterAvailableGamesNaive, filterAvailableGamesSet } = await import('../frontend/src/utils/collectionFilters.js');

  const sampleAllGames = [
    { id: 'g1', title: 'Game 1' },
    { id: 'g2', title: 'Game 2' },
    { id: 'g3', title: 'Game 3' },
    { id: 'g4', title: 'Game 4' },
    { id: 'g5', title: 'Game 5' },
  ];

  await t.test('deve retornar exatamente a mesma lista e ordem entre a versão ingênua e a versão com Set', () => {
    const collectionItems = [
      { id: 'item-1', gameId: 'g2' },
      { id: 'item-2', gameId: 'g4' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, collectionItems);
    const optimized = filterAvailableGamesSet(sampleAllGames, collectionItems);

    assert.deepStrictEqual(optimized, naive);
    assert.deepStrictEqual(optimized.map(g => g.id), ['g1', 'g3', 'g5']);
    assert.strictEqual(optimized[0].id, 'g1');
    assert.strictEqual(optimized[1].id, 'g3');
    assert.strictEqual(optimized[2].id, 'g5');
  });

  await t.test('deve retornar todos os jogos se a coleção estiver vazia ou nula', () => {
    assert.deepStrictEqual(filterAvailableGamesNaive(sampleAllGames, []), sampleAllGames);
    assert.deepStrictEqual(filterAvailableGamesSet(sampleAllGames, []), sampleAllGames);
    assert.deepStrictEqual(filterAvailableGamesNaive(sampleAllGames, null), sampleAllGames);
    assert.deepStrictEqual(filterAvailableGamesSet(sampleAllGames, null), sampleAllGames);
  });

  await t.test('deve retornar array vazio se todos os jogos já estiverem na coleção', () => {
    const allIn = sampleAllGames.map(g => ({ gameId: g.id }));
    assert.deepStrictEqual(filterAvailableGamesNaive(sampleAllGames, allIn), []);
    assert.deepStrictEqual(filterAvailableGamesSet(sampleAllGames, allIn), []);
  });

  await t.test('deve lidar corretamente com IDs duplicados na coleção', () => {
    const duplicates = [
      { id: 'item-1', gameId: 'g1' },
      { id: 'item-2', gameId: 'g1' },
      { id: 'item-3', gameId: 'g3' },
      { id: 'item-4', gameId: 'g3' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, duplicates);
    const optimized = filterAvailableGamesSet(sampleAllGames, duplicates);

    assert.deepStrictEqual(optimized, naive);
    assert.deepStrictEqual(optimized.map(g => g.id), ['g2', 'g4', 'g5']);
  });

  await t.test('deve lidar com itens nulos ou sem gameId na coleção', () => {
    const malformed = [
      null,
      {},
      { gameId: null },
      { gameId: 'g1' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, malformed);
    const optimized = filterAvailableGamesSet(sampleAllGames, malformed);

    assert.deepStrictEqual(optimized, naive);
    assert.deepStrictEqual(optimized.map(g => g.id), ['g2', 'g3', 'g4', 'g5']);
  });

  await t.test('deve lidar com catálogo contendo itens inválidos ou nulos', () => {
    const catalogWithInvalid = [
      null,
      undefined,
      {},
      { id: 'g1', title: 'Game 1' },
      { id: 'g2', title: 'Game 2' },
    ];
    const collectionItems = [{ id: 'item-1', gameId: 'g1' }];

    const naive = filterAvailableGamesNaive(catalogWithInvalid, collectionItems);
    const optimized = filterAvailableGamesSet(catalogWithInvalid, collectionItems);

    assert.deepStrictEqual(optimized, naive);
    assert.deepStrictEqual(optimized.map(g => g.id), ['g2']);
  });

  await t.test('deve manter equivalência com coleções sintéticas crescentes', () => {
    for (const size of [10, 100, 1000]) {
      const all = Array.from({ length: size }, (_, i) => ({ id: `g-${i}`, title: `Game ${i}` }));
      const inCollection = Array.from({ length: Math.floor(size * 0.4) }, (_, i) => ({
        id: `c-${i}`,
        gameId: `g-${i * 2}`,
      }));

      const naive = filterAvailableGamesNaive(all, inCollection);
      const optimized = filterAvailableGamesSet(all, inCollection);

      assert.deepStrictEqual(optimized, naive);
      assert.strictEqual(optimized.length, all.length - inCollection.length);
    }
  });
});
