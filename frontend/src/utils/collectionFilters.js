export function filterAvailableGamesNaive(allGames, collectionItems) {
  if (!allGames || !Array.isArray(allGames)) return [];
  if (!collectionItems || !Array.isArray(collectionItems) || collectionItems.length === 0) {
    return allGames.slice();
  }
  return allGames.filter(game => {
    if (!game || game.id == null) return false;
    return !collectionItems.some(item => item && item.gameId === game.id);
  });
}

export function filterAvailableGamesSet(allGames, collectionItems) {
  if (!allGames || !Array.isArray(allGames)) return [];
  if (!collectionItems || !Array.isArray(collectionItems) || collectionItems.length === 0) {
    return allGames.slice();
  }
  const existingIds = new Set();
  for (let i = 0; i < collectionItems.length; i++) {
    const item = collectionItems[i];
    if (item && item.gameId != null) {
      existingIds.add(item.gameId);
    }
  }
  return allGames.filter(game => game && game.id != null && !existingIds.has(game.id));
}
