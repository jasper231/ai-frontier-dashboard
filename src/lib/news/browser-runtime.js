/* Browser-only entry point. The static generator embeds this file into dist/index.html. */
(function () {
  'use strict';
  function start() {
    const root = document.getElementById('dashboard-root');
    if (!root) return;
    const batch = JSON.parse(document.getElementById('news-snapshot').textContent);
    const definitions = JSON.parse(document.getElementById('category-definitions').textContent);
    let selectedView = 'Latest';
    function render() {
      const model = globalThis.FrontierData.createView(batch, definitions, selectedView, new Date().toISOString());
      root.innerHTML = globalThis.FrontierRender.renderDashboard(model);
    }
    // Bind to the stable root before rendering; new buttons retain the delegated handler.
    root.addEventListener('click', function (event) {
      const target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
      const button = target && typeof target.closest === 'function' ? target.closest('[data-view]') : null;
      if (!button) return; // Native title/source links keep their default navigation.
      const view = button.getAttribute('data-view');
      if (!globalThis.FrontierData.views.includes(view)) return;
      selectedView = view;
      render();
      const selectedButton = root.querySelector('[data-view="' + selectedView + '"]');
      if (selectedButton) selectedButton.focus({ preventScroll: true });
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
