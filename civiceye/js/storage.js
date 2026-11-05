// Report store. Uses Supabase (Postgres + Storage) when js/config.js is filled in,
// otherwise falls back to localStorage so the app still works offline / before setup.
// Same async API either way: list(), add(), setStatus(), seedDemo(), clear().
(function () {
  const cfg = window.CIVICEYE_CONFIG || {};
  const REMOTE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const BASE = (cfg.SUPABASE_URL || '').replace(/\/$/, '');
  const H = () => ({ apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY });
  const newId = () => 'CE-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();

  const fromRow = r => ({
    id: r.id, category: r.category, severity: r.severity, title: r.title, description: r.description,
    status: r.status, image: r.image_url, aiSource: r.ai_source, createdAt: new Date(r.created_at).getTime(),
    location: { lat: r.lat, lng: r.lng, address: r.address },
  });

  const remote = {
    async list() {
      const r = await fetch(`${BASE}/rest/v1/reports?select=*&order=created_at.desc&limit=500`, { headers: H() });
      if (!r.ok) throw new Error('Load failed');
      return (await r.json()).map(fromRow);
    },
    async add(report) {
      const id = newId();
      let image_url = null;
      if (report.image) {
        try {
          const blob = await (await fetch(report.image)).blob();
          const path = `${id}.jpg`;
          const up = await fetch(`${BASE}/storage/v1/object/report-photos/${path}`, {
            method: 'POST', headers: { ...H(), 'Content-Type': 'image/jpeg' }, body: blob,
          });
          if (up.ok) image_url = `${BASE}/storage/v1/object/public/report-photos/${path}`;
        } catch { /* submit without photo rather than lose the report */ }
      }
      const row = {
        id, category: report.category, severity: report.severity, title: report.title, description: report.description,
        image_url, lat: report.location?.lat ?? null, lng: report.location?.lng ?? null,
        address: report.location?.address || null, ai_source: report.aiSource || null,
      };
      const r = await fetch(`${BASE}/rest/v1/reports`, {
        method: 'POST', headers: { ...H(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error('Could not save report');
      return fromRow((await r.json())[0]);
    },
    async setStatus(id, status) {
      await fetch(`${BASE}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
    },
    async seedDemo() {}, async clear() {},
  };

  // ---------- local fallback ----------
  const KEY = 'civiceye.reports.v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = list => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
  };

  const local = {
    async list() { return read().sort((a, b) => b.createdAt - a.createdAt); },
    async get(id) { return read().find(r => r.id === id); },
    async add(report) {
      const list = read();
      const r = { ...report, id: 'CE-' + Date.now().toString(36).toUpperCase(), status: 'pending', createdAt: Date.now() };
      list.push(r);
      if (!write(list)) { // storage full: retry without the photo
        r.image = null; if (!write(list)) throw new Error('Could not save report');
      }
      return r;
    },
    async setStatus(id, status) {
      const list = read(); const r = list.find(x => x.id === id);
      if (r) { r.status = status; write(list); }
    },
    async seedDemo() {
      const now = Date.now(), h = 3600e3, c = CE.DEFAULT_CENTER;
      const demo = [
        ['road', 'high', 'Deep pothole on main road', 'Large pothole near the bus stop, about 40 cm wide. Two-wheelers are swerving around it.', 'GST Road, near bus stop', 0.004, 0.006, 'pending', 3],
        ['garbage', 'medium', 'Overflowing garbage bin', 'Public bin is overflowing and waste is spilling onto the footpath.', 'Market Street', -0.006, 0.003, 'progress', 30],
        ['streetlight', 'medium', 'Streetlight not working', 'Streetlight has been off, leaving the junction dark after sunset.', 'University Gate Road', 0.002, -0.008, 'pending', 52],
        ['water', 'high', 'Water leakage from pipeline', 'Clean water is leaking from a damaged pipe and pooling on the road.', 'Anna Nagar 2nd Cross', -0.003, -0.004, 'resolved', 120],
      ].map(([category, severity, title, description, address, dl, dn, status, hrs], i) => ({
        id: 'CE-DEMO' + (i + 1), category, severity, title, description, status, image: null, demo: true,
        location: { lat: c[0] + dl, lng: c[1] + dn, address }, createdAt: now - hrs * h,
      }));
      write([...read().filter(r => !r.demo), ...demo]);
    },
    async clear() { write([]); },
  };

  window.ReportStore = { ...(REMOTE ? remote : local), mode: REMOTE ? 'supabase' : 'local' };
})();
