// Shared constants + helpers
window.CE = {
  CATEGORIES: {
    road:        { label: 'Road / Pothole',     icon: '🕳️', color: '#c2410c' },
    garbage:     { label: 'Garbage',            icon: '🗑️', color: '#4d7c0f' },
    streetlight: { label: 'Streetlight',        icon: '💡', color: '#a16207' },
    water:       { label: 'Water / Drainage',   icon: '💧', color: '#0369a1' },
    other:       { label: 'Other',              icon: '📍', color: '#6b21a8' },
  },
  STATUSES: { pending: 'Pending', progress: 'In Progress', resolved: 'Resolved' },
  DEFAULT_CENTER: [12.823, 80.0444], // Kattankulathur, Chennai - change freely
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  ago(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.floor(h / 24) + ' d ago';
  },
  toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3500);
  },
};
