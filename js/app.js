// ===== TXWATERPRO — APP.JS =====

const SUPABASE_URL = 'https://bvpesxpptgdwkhsewhke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cGVzeHBwdGdkd2toc2V3aGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzcwNTksImV4cCI6MjA5MTk1MzA1OX0._th9UdQKqIWvqgTrxxpd5IfTlexCUeyWC5aGwRJYZj8';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STATE =====
let allData = [];
let filtered = [];
let displayed = 0;
const PAGE_SIZE = 24;
let isListView = false;
let searchTimeout = null;

// ===== DOM REFS =====
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');
const filterType    = document.getElementById('filterType');
const filterCity    = document.getElementById('filterCity');
const resetBtn      = document.getElementById('resetBtn');
const resultsGrid   = document.getElementById('resultsGrid');
const resultsCount  = document.getElementById('resultsCount');
const loadMoreBtn   = document.getElementById('loadMoreBtn');
const emptyState    = document.getElementById('emptyState');
const gridViewBtn   = document.getElementById('gridViewBtn');
const listViewBtn   = document.getElementById('listViewBtn');
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const modalContent  = document.getElementById('modalContent');
const statTotal     = document.getElementById('statTotal');

// ===== INIT =====
async function init() {
  await loadData();
  populateFilters();
  renderResults(true);
  bindEvents();
}

// ===== LOAD FROM SUPABASE =====
async function loadData() {
  const { data, error } = await db
    .from('licensed_professionals')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    resultsCount.textContent = 'Error loading data. Please refresh.';
    return;
  }

  allData = data || [];
  filtered = [...allData];
  if (statTotal) statTotal.textContent = allData.length.toLocaleString();
}

// ===== POPULATE FILTERS =====
function populateFilters() {
  // License types
  const types = [...new Set(allData.map(p => p.license_type).filter(Boolean))].sort();
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    filterType.appendChild(opt);
  });

  // Cities
  const cities = [...new Set(allData.map(p => p.city).filter(c => c && c.trim()))].sort();
  cities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterCity.appendChild(opt);
  });
}

// ===== FILTER + SEARCH =====
function applyFilters() {
  const query  = searchInput.value.toLowerCase().trim();
  const type   = filterType.value;
  const city   = filterCity.value;

  filtered = allData.filter(p => {
    const matchQuery = !query || [
      p.full_name, p.city, p.license_number, p.license_type, p.email, p.address
    ].some(f => f && f.toLowerCase().includes(query));

    const matchType = !type || p.license_type === type;
    const matchCity = !city || p.city === city;

    return matchQuery && matchType && matchCity;
  });

  displayed = 0;
  resultsGrid.innerHTML = '';
  renderResults(true);
}

// ===== RENDER =====
function renderResults(fresh = false) {
  const batch = filtered.slice(displayed, displayed + PAGE_SIZE);

  if (fresh && filtered.length === 0) {
    emptyState.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    resultsCount.textContent = '0 professionals found';
    return;
  }

  emptyState.style.display = 'none';

  batch.forEach((pro, i) => {
    const card = buildCard(pro, i);
    resultsGrid.appendChild(card);
  });

  displayed += batch.length;

  resultsCount.textContent = filtered.length === allData.length
    ? `${allData.length.toLocaleString()} licensed professionals`
    : `${filtered.length.toLocaleString()} of ${allData.length.toLocaleString()} professionals`;

  loadMoreBtn.style.display = displayed < filtered.length ? 'block' : 'none';
}

// ===== BUILD CARD =====
function buildCard(pro, animIdx) {
  const card = document.createElement('div');
  card.className = 'pro-card';
  card.style.animationDelay = `${Math.min(animIdx * 25, 300)}ms`;

  const initials = getInitials(pro.full_name);
  const badge    = getBadgeClass(pro.license_type);
  const badgeLabel = shortLicenseType(pro.license_type);
  const location = [pro.city, pro.state].filter(Boolean).join(', ') || 'Texas';

  card.innerHTML = `
    <div class="card-header">
      <div class="card-avatar">${initials}</div>
      <div class="card-name-block">
        <div class="card-name">${pro.full_name}</div>
        <div class="card-license-num">${pro.license_number || 'License on file'}</div>
      </div>
      <span class="card-badge ${badge}">${badgeLabel}</span>
    </div>
    <div class="card-body">
      <div class="card-detail">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${location}</span>
      </div>
      ${pro.phone ? `<div class="card-detail">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        <span>${pro.phone}</span>
      </div>` : ''}
      ${pro.email ? `<div class="card-detail">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>${pro.email}</span>
      </div>` : ''}
    </div>
    <div class="card-footer">
      <span class="card-view-btn">View Profile →</span>
    </div>
  `;

  card.addEventListener('click', () => openModal(pro));
  return card;
}

// ===== MODAL =====
function openModal(pro) {
  const initials = getInitials(pro.full_name);
  const badge    = getBadgeClass(pro.license_type);
  const location = [pro.address, pro.city, pro.state, pro.zip].filter(Boolean).join(', ') || 'Texas';

  modalContent.innerHTML = `
    <div class="modal-top">
      <div class="modal-avatar">${initials}</div>
      <div>
        <div class="modal-name">${pro.full_name}</div>
        <div class="modal-type">${pro.license_type || 'Licensed Professional'}</div>
      </div>
    </div>
    <div class="modal-fields">
      ${pro.license_number ? modalField(iconId(), 'License Number', `<span style="font-family:var(--font-mono)">${pro.license_number}</span>`) : ''}
      ${modalField(iconLicense(), 'License Type', `<span class="card-badge ${badge}" style="display:inline-block">${pro.license_type}</span>`)}
      ${location ? modalField(iconPin(), 'Location', location) : ''}
      ${pro.phone ? modalField(iconPhone(), 'Phone', `<a href="tel:${pro.phone}">${pro.phone}</a>`) : ''}
      ${pro.email ? modalField(iconEmail(), 'Email', `<a href="mailto:${pro.email}">${pro.email}</a>`) : ''}
    </div>
  `;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function modalField(iconSvg, label, value) {
  return `
    <div class="modal-field">
      <div class="modal-field-icon">${iconSvg}</div>
      <div class="modal-field-body">
        <div class="modal-field-label">${label}</div>
        <div class="modal-field-value">${value}</div>
      </div>
    </div>
  `;
}

// ===== ICONS =====
const iconId    = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
const iconPin   = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const iconPhone = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;
const iconEmail = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
const iconLicense = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

// ===== HELPERS =====
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortLicenseType(type) {
  if (!type) return 'Licensed';
  const map = {
    'Water Treatment Operators':         'Water Ops',
    'Wastewater Treatment Operators':    'WW Treatment',
    'Wastewater Collection Operators':   'WW Collection',
    'Water Distribution Operators':      'Distribution',
    'Landscape Irrigator':               'Irrigator',
    'Backflow Prevention Assembly Tester': 'Backflow',
    'On-Site Sewage Facilities (OSSF)':  'OSSF',
    'Customer Service Inspector':        'CS Inspector',
    'Water Operations Company':          'Water Co.',
    'Water Treatment Specialists':       'WTS',
    'OSSF Maintenance Provider':         'OSSF Maint.',
    'LPST Project Manager':              'LPST Mgr',
  };
  for (const [key, val] of Object.entries(map)) {
    if (type.includes(key.split(' ')[0]) && type.includes(key.split(' ')[1] || '')) {
      return map[key] || type.slice(0,14);
    }
  }
  return type.length > 14 ? type.slice(0, 13) + '…' : type;
}

function getBadgeClass(type) {
  if (!type) return 'badge-default';
  const t = type.toLowerCase();
  if (t.includes('water treatment') || t.includes('water ops') || t.includes('water operation')) return 'badge-water-treatment';
  if (t.includes('wastewater') || t.includes('ww')) return 'badge-wastewater';
  if (t.includes('irrigat') || t.includes('landscape')) return 'badge-landscape';
  if (t.includes('backflow')) return 'badge-backflow';
  if (t.includes('ossf') || t.includes('sewage') || t.includes('septic')) return 'badge-ossf';
  if (t.includes('distribution')) return 'badge-distribution';
  return 'badge-default';
}

// ===== EVENTS =====
function bindEvents() {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const hasVal = searchInput.value.length > 0;
    searchClear.classList.toggle('visible', hasVal);
    searchTimeout = setTimeout(applyFilters, 200);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    applyFilters();
    searchInput.focus();
  });

  filterType.addEventListener('change', applyFilters);
  filterCity.addEventListener('change', applyFilters);

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    filterType.value = '';
    filterCity.value = '';
    applyFilters();
  });

  loadMoreBtn.addEventListener('click', () => {
    renderResults(false);
  });

  gridViewBtn.addEventListener('click', () => {
    isListView = false;
    resultsGrid.classList.remove('list-view');
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
  });

  listViewBtn.addEventListener('click', () => {
    isListView = true;
    resultsGrid.classList.add('list-view');
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ===== KICK OFF =====
init();
