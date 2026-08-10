/** POR price / sample-type catalog PDFs from report-format assets. */
export function filterPorCatalogPdfs(formats, { hidePriceCatalog = false } = {}) {
  return (Array.isArray(formats) ? formats : []).filter((item) => {
    const title = (item.title || '').toLowerCase();
    if (!title.includes('por catalog')) return false;
    if (!(item.file_url || item.external_url)) return false;
    if (hidePriceCatalog && (title.includes('price') || title.includes('mrp') || title.includes('b2b'))) {
      return false;
    }
    return true;
  });
}
