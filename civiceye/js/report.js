(function () {
  const $ = id => document.getElementById(id);
  const state = { image: null, loc: null, ai: null };
  let map, marker;

  // ---------- category select ----------
  $('category').innerHTML = '<option value="">Choose a category…</option>' +
    Object.entries(CE.CATEGORIES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');

  // ---------- photo ----------
  const fileInput = $('photo'), drop = $('drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => fileInput.files[0] && handleFile(fileInput.files[0]));
  $('removePhoto').addEventListener('click', () => {
    state.image = null; fileInput.value = '';
    $('preview').hidden = true; drop.hidden = false; setAI(null);
  });

  function compress(file, max = 900) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('Not an image'));
      img.src = url;
    });
  }

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) return CE.toast('Please choose an image file.');
    try { state.image = await compress(file); } catch { return CE.toast('Could not read that image.'); }
    $('previewImg').src = state.image; $('preview').hidden = false; drop.hidden = true;
    runAI();
  }

  // ---------- AI ----------
  async function runAI() {
    if (!state.image) return;
    setAI('loading');
    const b64 = state.image.split(',')[1];
    const res = await AI.analyze(b64, 'image/jpeg', $('note').value.trim());
    state.ai = res; setAI(res);
    $('category').value = res.category || '';
    $('severity').value = res.severity || 'medium';
    $('title').value = res.title || '';
    $('description').value = res.description || '';
  }
  function setAI(res) {
    const b = $('aiStatus');
    if (!res) { b.hidden = true; return; }
    b.hidden = false; b.className = 'ai-status';
    if (res === 'loading') { b.classList.add('loading'); b.innerHTML = '<span class="spin"></span> Analysing your photo…'; return; }
    if (res.source === 'gemini') {
      const pct = Math.round((res.confidence || 0) * 100);
      b.classList.add('ok'); b.textContent = `✨ AI suggestion (${pct}% confident). Check it and edit anything that's wrong.`;
    } else {
      b.classList.add('demo'); b.textContent = 'AI is offline, so this is a basic draft from your note. Please pick the category and edit the description.';
    }
  }
  $('reanalyse').addEventListener('click', runAI);

  // ---------- location ----------
  function setLoc(lat, lng, address) {
    state.loc = { lat, lng, address: address ?? state.loc?.address ?? '' };
    if (address !== undefined) $('address').value = address;
    $('coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (map) {
      if (!marker) marker = L.marker([lat, lng], { draggable: true }).addTo(map)
        .on('dragend', e => { const p = e.target.getLatLng(); setLoc(p.lat, p.lng); reverse(p.lat, p.lng); });
      else marker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }
  }
  async function reverse(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`);
      const d = await r.json();
      if (d.display_name && !$('address').dataset.edited) { $('address').value = d.display_name; state.loc.address = d.display_name; }
    } catch { /* best effort */ }
  }
  $('address').addEventListener('input', e => { e.target.dataset.edited = '1'; if (state.loc) state.loc.address = e.target.value; });

  if (window.L) {
    map = L.map('map').setView(CE.DEFAULT_CENTER, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    map.on('click', e => { setLoc(e.latlng.lat, e.latlng.lng); reverse(e.latlng.lat, e.latlng.lng); });
  } else {
    $('map').outerHTML = '<p class="hint">Map could not load (offline?). Use "Use my location" or type the address.</p>';
  }

  $('locate').addEventListener('click', () => {
    if (!navigator.geolocation) return CE.toast('Location is not supported on this device.');
    $('locate').disabled = true;
    navigator.geolocation.getCurrentPosition(
      p => { $('locate').disabled = false; $('address').dataset.edited = ''; setLoc(p.coords.latitude, p.coords.longitude); reverse(p.coords.latitude, p.coords.longitude); },
      () => { $('locate').disabled = false; CE.toast('Could not get your location. Tap the map or type the address.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // ---------- submit ----------
  const form = $('reportForm');
  function fail(id, msg) {
    const el = $(id); el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    $('formError').textContent = msg; $('formError').hidden = false; return false;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); $('formError').hidden = true;
    if (!state.image) return fail('drop', 'Add a photo of the issue first.') ;
    if (!$('category').value) return fail('category', 'Choose a category.');
    if ($('description').value.trim().length < 10) return fail('description', 'Add a short description (at least 10 characters).');
    const address = $('address').value.trim();
    if (!state.loc && !address) return fail('address', 'Confirm the location: tap the map, use your location, or type the address.');

    $('submit').disabled = true; $('submit').textContent = 'Submitting…';
    try {
      const r = await ReportStore.add({
        image: state.image,
        category: $('category').value,
        severity: $('severity').value,
        title: $('title').value.trim() || CE.CATEGORIES[$('category').value].label,
        description: $('description').value.trim(),
        location: { lat: state.loc?.lat ?? null, lng: state.loc?.lng ?? null, address },
        aiSource: state.ai?.source || 'none',
      });
      location.href = 'dashboard.html?new=' + encodeURIComponent(r.id);
    } catch {
      $('submit').disabled = false; $('submit').textContent = 'Submit report';
      $('formError').textContent = 'Could not save the report. Please try again.'; $('formError').hidden = false;
    }
  });
})();
