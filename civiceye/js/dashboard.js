(function () {
  const $ = id => document.getElementById(id);
  const f = { status: 'all', category: 'all' };
  let reports = [], map, layer;
  const newId = new URLSearchParams(location.search).get('new');

  $('fCategory').innerHTML = '<option value="all">All categories</option>' +
    Object.entries(CE.CATEGORIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  $('fCategory').onchange = e => { f.category = e.target.value; render(); };
  document.querySelectorAll('[data-status]').forEach(b => b.onclick = () => {
    f.status = b.dataset.status;
    document.querySelectorAll('[data-status]').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });

  if (window.L) {
    map = L.map('map').setView(CE.DEFAULT_CENTER, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    layer = L.layerGroup().addTo(map);
  } else { $('mapWrap').hidden = true; }

  if (ReportStore.mode === 'supabase') { $('seed').hidden = true; $('clear').hidden = true; $('tools').hidden = true; }

  async function load() {
    try { reports = await ReportStore.list(); } catch { CE.toast('Could not load reports. Check your connection.'); reports = []; }
    render();
  }

  function render() {
    const c = { all: reports.length, pending: 0, progress: 0, resolved: 0 };
    reports.forEach(r => c[r.status]++);
    $('nTotal').textContent = c.all; $('nPending').textContent = c.pending;
    $('nProgress').textContent = c.progress; $('nResolved').textContent = c.resolved;

    const shown = reports.filter(r => (f.status === 'all' || r.status === f.status) && (f.category === 'all' || r.category === f.category));
    $('empty').hidden = reports.length > 0;
    $('noMatch').hidden = !(reports.length && !shown.length);

    $('list').innerHTML = shown.map(r => {
      const cat = CE.CATEGORIES[r.category] || CE.CATEGORIES.other;
      return `<article class="card ${r.id === newId ? 'is-new' : ''}" id="${CE.esc(r.id)}">
        ${r.image ? `<img src="${r.image}" alt="Photo of ${CE.esc(r.title)}" loading="lazy">` : `<div class="noimg" style="--c:${cat.color}">${cat.icon}</div>`}
        <div class="card-body">
          <div class="meta"><span class="chip" style="--c:${cat.color}">${cat.icon} ${cat.label}</span>
            <span class="sev sev-${r.severity}">${CE.esc(r.severity)}</span>
            ${r.demo ? '<span class="demo-tag">sample</span>' : ''}</div>
          <h3>${CE.esc(r.title)}</h3>
          <p>${CE.esc(r.description)}</p>
          <p class="where">📍 ${CE.esc(r.location?.address || 'Pinned on map')}</p>
          <div class="foot"><span>${CE.esc(r.id)} · ${CE.ago(r.createdAt)}</span>
            <label class="status st-${r.status}"><span class="sr">Status</span>
              <select data-id="${CE.esc(r.id)}">${Object.entries(CE.STATUSES).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          </div>
        </div></article>`;
    }).join('');

    $('list').querySelectorAll('select').forEach(s => s.onchange = async () => { await ReportStore.setStatus(s.dataset.id, s.value); load(); });

    if (layer) {
      layer.clearLayers();
      const pts = [];
      shown.filter(r => r.location?.lat != null).forEach(r => {
        const cat = CE.CATEGORIES[r.category] || CE.CATEGORIES.other;
        L.circleMarker([r.location.lat, r.location.lng], { radius: 9, color: '#fff', weight: 2, fillColor: cat.color, fillOpacity: .95 })
          .bindPopup(`<strong>${CE.esc(r.title)}</strong><br>${cat.label} · ${CE.STATUSES[r.status]}`).addTo(layer);
        pts.push([r.location.lat, r.location.lng]);
      });
      if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });
    }
    if (newId) { const el = document.getElementById(newId); if (el && !render.done) { render.done = 1; el.scrollIntoView({ block: 'center' }); CE.toast('Report submitted ✓ ' + newId); } }
  }

  $('seed').onclick = async () => { await ReportStore.seedDemo(); load(); };
  $('clear').onclick = async () => { if (confirm('Delete all reports stored in this browser?')) { await ReportStore.clear(); load(); } };
  load();
})();
