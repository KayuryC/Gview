import { describe, it, expect } from 'vitest';
import {
  findBySlugLinear,
  createSlugIndex,
  findBySlugMap,
  filterByStatusLinear,
  createStatusIndex,
  filterByStatusMap,
} from '../../src/utils/catalogSearch.js';

describe('catalogSearch — Busca por Slug', () => {
  const sampleGames = [
    { id: '1', slug: 'hollow-knight', title: 'Hollow Knight', status: 'AVAILABLE' },
    { id: '2', slug: 'celeste', title: 'Celeste', status: 'FEATURED' },
    { id: '3', slug: 'dead-cells', title: 'Dead Cells', status: 'AVAILABLE' },
    { id: '4', slug: 'hades', title: 'Hades', status: 'COMING_SOON' },
  ];

  it('deve retornar exatamente o mesmo jogo para chaves existentes', () => {
    const slugIndex = createSlugIndex(sampleGames);
    for (const game of sampleGames) {
      const linear = findBySlugLinear(sampleGames, game.slug);
      const mapped = findBySlugMap(slugIndex, game.slug);
      expect(mapped).toEqual(linear);
      expect(mapped).toBe(game);
    }
  });

  it('deve retornar undefined para chaves ausentes', () => {
    const slugIndex = createSlugIndex(sampleGames);
    const linear = findBySlugLinear(sampleGames, 'nao-existe');
    const mapped = findBySlugMap(slugIndex, 'nao-existe');
    expect(linear).toBeUndefined();
    expect(mapped).toBeUndefined();
    expect(mapped).toEqual(linear);
  });

  it('deve lidar com coleções vazias e nulas', () => {
    expect(findBySlugLinear([], 'teste')).toBeUndefined();
    expect(findBySlugLinear(null, 'teste')).toBeUndefined();

    const emptyIndex = createSlugIndex([]);
    expect(findBySlugMap(emptyIndex, 'teste')).toBeUndefined();

    const nullIndex = createSlugIndex(null);
    expect(findBySlugMap(nullIndex, 'teste')).toBeUndefined();
  });

  it('deve preservar rigorosamente a PRIMEIRA ocorrência em caso de slugs duplicados (equivalência com Array.find)', () => {
    const gamesWithDuplicates = [
      { id: '1', slug: 'duplicate-game', title: 'Primeira Versão' },
      { id: '2', slug: 'other-game', title: 'Outro Jogo' },
      { id: '3', slug: 'duplicate-game', title: 'Segunda Versão (deve ser ignorada)' },
    ];

    const linear = findBySlugLinear(gamesWithDuplicates, 'duplicate-game');
    const slugIndex = createSlugIndex(gamesWithDuplicates);
    const mapped = findBySlugMap(slugIndex, 'duplicate-game');

    expect(linear.title).toBe('Primeira Versão');
    expect(mapped.title).toBe('Primeira Versão');
    expect(mapped).toBe(linear);
  });

  it('deve lidar com elementos inválidos ou sem slug na coleção', () => {
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

    expect(mapped).toEqual(linear);
    expect(mapped.title).toBe('Válido');

    expect(findBySlugLinear(gamesWithInvalid, 'inexistente')).toBeUndefined();
    expect(findBySlugMap(slugIndex, 'inexistente')).toBeUndefined();
  });

  it('deve manter equivalência com coleções sintéticas crescentes', () => {
    for (const size of [10, 100, 1000]) {
      const synthetic = Array.from({ length: size }, (_, i) => ({
        id: `id-${i}`,
        slug: `game-slug-${i}`,
        title: `Game ${i}`,
        status: i % 2 === 0 ? 'AVAILABLE' : 'FEATURED',
      }));

      const index = createSlugIndex(synthetic);

      const testSlugs = ['game-slug-0', `game-slug-${Math.floor(size / 2)}`, `game-slug-${size - 1}`, 'game-slug-999999'];
      for (const slug of testSlugs) {
        const linear = findBySlugLinear(synthetic, slug);
        const mapped = findBySlugMap(index, slug);
        expect(mapped).toEqual(linear);
      }
    }
  });
});

describe('catalogSearch — Filtro por Status', () => {
  const sampleGames = [
    { id: '1', slug: 'game-1', status: 'FEATURED' },
    { id: '2', slug: 'game-2', status: 'AVAILABLE' },
    { id: '3', slug: 'game-3', status: 'FEATURED' },
    { id: '4', slug: 'game-4', status: 'COMING_SOON' },
    { id: '5', slug: 'game-5', status: 'AVAILABLE' },
    { id: '6', slug: 'game-6', status: 'FEATURED' },
  ];

  it('deve retornar exatamente a mesma lista e na mesma ordem para cada status', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const statuses = ['FEATURED', 'AVAILABLE', 'COMING_SOON'];

    for (const st of statuses) {
      const linear = filterByStatusLinear(sampleGames, st);
      const mapped = filterByStatusMap(statusIndex, sampleGames, st);
      expect(mapped).toEqual(linear);
      expect(mapped.length).toBe(linear.length);
      for (let i = 0; i < linear.length; i++) {
        expect(mapped[i]).toBe(linear[i]);
      }
    }
  });

  it('deve retornar todos os itens se status for nulo/vazio', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const linear = filterByStatusLinear(sampleGames, null);
    const mapped = filterByStatusMap(statusIndex, sampleGames, null);
    expect(linear).toEqual(sampleGames);
    expect(mapped).toEqual(sampleGames);
  });

  it('deve retornar array vazio para status inexistente', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const linear = filterByStatusLinear(sampleGames, 'UNKNOWN_STATUS');
    const mapped = filterByStatusMap(statusIndex, sampleGames, 'UNKNOWN_STATUS');
    expect(linear).toEqual([]);
    expect(mapped).toEqual([]);
  });

  it('deve lidar com coleções vazias e nulas', () => {
    expect(filterByStatusLinear([], 'FEATURED')).toEqual([]);
    expect(filterByStatusLinear(null, 'FEATURED')).toEqual([]);

    const emptyIndex = createStatusIndex([]);
    expect(filterByStatusMap(emptyIndex, [], 'FEATURED')).toEqual([]);

    const nullIndex = createStatusIndex(null);
    expect(filterByStatusMap(nullIndex, null, 'FEATURED')).toEqual([]);
  });

  it('deve lidar com itens nulos ou sem status na coleção', () => {
    const gamesWithInvalid = [
      null,
      undefined,
      { id: '1', slug: 'sem-status' },
      { id: '2', slug: 'com-status', status: 'FEATURED' },
    ];

    const linear = filterByStatusLinear(gamesWithInvalid, 'FEATURED');
    const index = createStatusIndex(gamesWithInvalid);
    const mapped = filterByStatusMap(index, gamesWithInvalid, 'FEATURED');

    expect(mapped).toEqual(linear);
    expect(mapped.length).toBe(1);
    expect(mapped[0].slug).toBe('com-status');
  });

  it('deve suportar materialização por clone superficial explícito quando solicitado', () => {
    const statusIndex = createStatusIndex(sampleGames);
    const reference = filterByStatusMap(statusIndex, sampleGames, 'FEATURED', false);
    const cloned = filterByStatusMap(statusIndex, sampleGames, 'FEATURED', true);

    expect(cloned).toEqual(reference);
    expect(cloned).not.toBe(reference);
  });
});
