/** Use role-based effective_price from API when present, else catalog price. */
export function getEffectiveTestPrice(test) {
  if (!test) return 0;
  const effective = Number(test.effective_price);
  if (Number.isFinite(effective) && effective > 0) {
    return effective;
  }
  const billed = Number(test.price);
  if (Number.isFinite(billed) && billed >= 0) {
    return billed;
  }
  return 0;
}

export function getCatalogTestPrice(test) {
  if (!test) return 0;
  const catalog = Number(test.catalog_price);
  if (Number.isFinite(catalog) && catalog >= 0) {
    return catalog;
  }
  return Number(test.price || 0);
}

/** Normalize a test so `price` is always the franchise billed / final price. */
export function withEffectivePrice(test) {
  if (!test) return test;
  const catalog = Number(test.catalog_price ?? test.price ?? 0);
  const effective = getEffectiveTestPrice({
    ...test,
    // Prefer API effective_price; do not treat already-overwritten price as catalog.
    price: catalog,
  });
  return {
    ...test,
    catalog_price: catalog,
    effective_price: effective,
    price: effective,
  };
}
