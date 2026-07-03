(function () {
  var params = new URLSearchParams(location.search);
  var agent = params.get('agent');
  var apiBase = params.get('api') || location.origin;
  var slugInput = document.getElementById('slugInput');
  if (agent) slugInput.value = agent;

  function loadWidget(slug) {
    if (!slug) return;
    var existing = document.getElementById('emble-embed-script');
    if (existing) existing.remove();
    var root = document.getElementById('emble-widget-root');
    if (root) root.remove();

    var s = document.createElement('script');
    s.id = 'emble-embed-script';
    s.src = apiBase + '/embed.js';
    s.setAttribute('data-agent', slug);
    s.setAttribute('data-api', apiBase);
    s.async = true;
    document.body.appendChild(s);
    document.getElementById('hint').textContent = 'Виджет загружен для агента: ' + slug;
  }

  document.getElementById('loadBtn').addEventListener('click', function () {
    loadWidget(slugInput.value.trim());
  });
  if (agent) loadWidget(agent);
})();
