import { describe, it, expect } from 'vitest';
import {
  filterAvailableGamesNaive,
  filterAvailableGamesSet,
} from '../utils/collectionFilters.js';

describe('collectionFilters — Diferença de Conjuntos (Disponíveis para Coleção)', () => {
  const sampleAllGames = [
    { id: 'g1', title: 'Game 1' },
    { id: 'g2', title: 'Game 2' },
    { id: 'g3', title: 'Game 3' },
    { id: 'g4', title: 'Game 4' },
    { id: 'g5', title: 'Game 5' },
  ];

  it('deve retornar exatamente a mesma lista e ordem entre a versão ingênua e a versão com Set', () => {
    const collectionItems = [
      { id: 'item-1', gameId: 'g2' },
      { id: 'item-2', gameId: 'g4' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, collectionItems);
    const optimized = filterAvailableGamesSet(sampleAllGames, collectionItems);

    expect(optimized).toEqual(naive);
    expect(optimized.map(g => g.id)).toEqual(['g1', 'g3', 'g5']);
    expect(optimized[0].id).toBe('g1');
    expect(optimized[1].id).toBe('g3');
    expect(optimized[2].id).toBe('g5');
  });

  it('deve retornar todos os jogos se a coleção estiver vazia ou nula', () => {
    expect(filterAvailableGamesNaive(sampleAllGames, [])).toEqual(sampleAllGames);
    expect(filterAvailableGamesSet(sampleAllGames, [])).toEqual(sampleAllGames);

    expect(filterAvailableGamesNaive(sampleAllGames, null)).toEqual(sampleAllGames);
    expect(filterAvailableGamesSet(sampleAllGames, null)).toEqual(sampleAllGames);
  });

  it('deve retornar array vazio se todos os jogos já estiverem na coleção', () => {
    const allIn = sampleAllGames.map(g => ({ gameId: g.id }));
    const naive = filterAvailableGamesNaive(sampleAllGames, allIn);
    const optimized = filterAvailableGamesSet(sampleAllGames, allIn);

    expect(naive).toEqual([]);
    expect(optimized).toEqual([]);
  });

  it('deve lidar corretamente com IDs duplicados na coleção', () => {
    const duplicates = [
      { id: 'item-1', gameId: 'g1' },
      { id: 'item-2', gameId: 'g1' },
      { id: 'item-3', gameId: 'g3' },
      { id: 'item-4', gameId: 'g3' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, duplicates);
    const optimized = filterAvailableGamesSet(sampleAllGames, duplicates);

    expect(optimized).toEqual(naive);
    expect(optimized.map(g => g.id)).toEqual(['g2', 'g4', 'g5']);
  });

  it('deve lidar com coleções com itens sem gameId ou nulos', () => {
    const malformed = [
      null,
      {},
      { gameId: null },
      { gameId: 'g1' },
    ];

    const naive = filterAvailableGamesNaive(sampleAllGames, malformed);
    const optimized = filterAvailableGamesSet(sampleAllGames, malformed);

    expect(optimized).toEqual(naive);
    expect(optimized.map(g => g.id)).toEqual(['g2', 'g3', 'g4', 'g5']);
  });

  it('deve lidar com catálogo contendo itens inválidos ou nulos', () => {
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

    expect(optimized).toEqual(naive);
    expect(optimized.map(g => g.id)).toEqual(['g2']);
  });

  it('deve manter equivalência com entradas sintéticas crescentes', () => {
    for (const size of [10, 100, 1000]) {
      const all = Array.from({ length: size }, (_, i) => ({ id: `g-${i}`, title: `Game ${i}` }));
      const inCollection = Array.from({ length: Math.floor(size * 0.4) }, (_, i) => ({
        id: `c-${i}`,
        gameId: `g-${i * 2}`,
      }));

      const naive = filterAvailableGamesNaive(all, inCollection);
      const optimized = filterAvailableGamesSet(all, inCollection);

      expect(optimized).toEqual(naive);
      expect(optimized.length).toBe(all.length - inCollection.length);
    }
  });
});
