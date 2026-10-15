function findBySlugLinear(items, slug) {
  if (!items || !Array.isArray(items)) return undefined;
  return items.find(item => item && item.slug === slug);
}

function createSlugIndex(items) {
  const map = new Map();
  if (!items || !Array.isArray(items)) return map;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.slug != null && !map.has(item.slug)) {
      map.set(item.slug, item);
    }
  }
  return map;
}

function findBySlugMap(slugIndex, slug) {
  if (!slugIndex || !(slugIndex instanceof Map)) return undefined;
  return slugIndex.get(slug);
}

function filterByStatusLinear(items, status) {
  if (!items || !Array.isArray(items)) return [];
  if (!status) return items;
  return items.filter(item => item && item.status === status);
}

function createStatusIndex(items) {
  const map = new Map();
  if (!items || !Array.isArray(items)) return map;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.status != null) {
      let bucket = map.get(item.status);
      if (!bucket) {
        bucket = [];
        map.set(item.status, bucket);
      }
      bucket.push(item);
    }
  }
  return map;
}

function filterByStatusMap(statusIndex, items, status, clone = false) {
  if (!status) return items || [];
  if (!statusIndex || !(statusIndex instanceof Map)) return [];
  const bucket = statusIndex.get(status);
  if (!bucket) return [];
  return clone ? bucket.slice() : bucket;
}

module.exports = {
  findBySlugLinear,
  createSlugIndex,
  findBySlugMap,
  filterByStatusLinear,
  createStatusIndex,
  filterByStatusMap,
};
