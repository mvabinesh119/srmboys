// Photo -> suggested category + description. Uses /api/analyze (Gemini, server-side key).
// If the API is unreachable or unconfigured, falls back to a simple keyword guess from the
// citizen's note so the form still works. The result says which source it came from.
(function () {
  const KEYWORDS = {
    road: ['pothole', 'road', 'crack', 'footpath', 'pavement', 'speed breaker'],
    garbage: ['garbage', 'trash', 'waste', 'dump', 'bin', 'litter', 'smell'],
    streetlight: ['light', 'lamp', 'dark', 'streetlight', 'bulb'],
    water: ['water', 'leak', 'drain', 'sewage', 'flood', 'pipe', 'overflow'],
  };
  const TEMPLATES = {
    road: 'A damaged section of road or footpath is causing a hazard for vehicles and pedestrians. Please inspect and repair.',
    garbage: 'Waste has accumulated and is not being cleared, creating a hygiene problem for nearby residents. Please arrange clearance.',
    streetlight: 'A streetlight is not working, leaving the area dark and unsafe after sunset. Please repair or replace it.',
    water: 'Water leakage or blocked drainage is affecting the area. Please inspect and fix to prevent waste and waterlogging.',
    other: 'A civic issue needs attention at this location. Please inspect.',
  };

  function guess(note) {
    const t = (note || '').toLowerCase();
    let best = 'other', score = 0;
    for (const [cat, words] of Object.entries(KEYWORDS)) {
      const s = words.filter(w => t.includes(w)).length;
      if (s > score) { best = cat; score = s; }
    }
    return {
      category: best, severity: 'medium', confidence: score ? 0.4 : 0,
      title: CE.CATEGORIES[best].label + ' issue',
      description: note && note.length > 15 ? note : TEMPLATES[best],
      source: 'demo',
    };
  }

  window.AI = {
    async analyze(base64, mime, note) {
      try {
        const r = await fetch('/api/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mime, note }),
        });
        if (!r.ok) throw new Error(String(r.status));
        return { ...(await r.json()), source: 'gemini' };
      } catch {
        return guess(note);
      }
    },
  };
})();
