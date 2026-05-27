/** Simple inner page helper for device / sub pages */
window.ClasmoPage = function (activeId, title, breadcrumb) {
  document.addEventListener('DOMContentLoaded', function () {
    window.ClasmoLayout.renderShell(activeId);
    const main = document.querySelector('.dash-main');
    if (main && breadcrumb) {
      const bc = document.createElement('nav');
      bc.className = 'breadcrumb';
      bc.setAttribute('aria-label', 'Breadcrumb');
      bc.innerHTML = '<ul>' + breadcrumb + '</ul>';
      main.insertBefore(bc, main.firstChild);
    }
    const h = document.querySelector('.page-heading');
    if (h) h.textContent = title;
  });
};
