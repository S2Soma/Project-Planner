// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════
function onGroupByChange(v){ groupBy =v;           render({ keep:true }); }
function toggleGroup(k)    { collapsed[k]=!collapsed[k]; saveData(); render({ keep:true }); }

document.addEventListener('keydown', e=>{
  if (e.key==='Escape') { if(drag){cancelDrag();return;} if(selectedIds.size>0){deselectAll();return;} return; }
  if (e.key==='d' && (e.ctrlKey || e.metaKey) && selectedIds.size > 0) {
    e.preventDefault();
    duplicateSelected();
    return;
  }
  if (e.key==='Delete' && selectedIds.size > 0) {
    // Don't trigger when typing in a text input/textarea
    const el = document.activeElement;
    const tag = el?.tagName;
    const type = el?.type || '';
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'INPUT' && type !== 'checkbox') return;
    const count = selectedIds.size;
    if (!confirm(`Xóa ${count} công việc đã chọn?`)) return;
    tasks = tasks.filter(t => !selectedIds.has(t.id));
    selectedIds.clear();
    saveData();
    render({ keep: true });
  }
});

// ═══════════════════════════════════════════════
// FOCUS TASK — scroll timeline to task bar
// ═══════════════════════════════════════════════
function focusTask(id, which) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const bar = barFor(t);
  if (!bar) return;

  const sc = document.getElementById('tlScroll');
  if (!sc) return;

  let targetLeft;
  if (which === 'to') {
    // Scroll so end of bar is visible with 100px right margin
    targetLeft = (bar.si + bar.span) * COL - sc.clientWidth + 100;
  } else {
    // Scroll so start of bar is visible with 100px left margin
    targetLeft = bar.si * COL - 100;
  }
  sc.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });

  // Flash the task bar to draw attention
  setTimeout(() => {
    const barEl = document.querySelector(`.task-bar[data-id="${id}"]`);
    if (barEl) {
      barEl.classList.add('bar-flash');
      setTimeout(() => barEl.classList.remove('bar-flash'), 1500);
    }
  }, 300);
}

// ═══════════════════════════════════════════════
// YEAR MENU — multi-select dropdown
// ═══════════════════════════════════════════════
function toggleYearMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('yearMenu');
  menu.classList.toggle('open');
  if (menu.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', closeYearMenu), 0);
  }
}
function closeYearMenu() {
  document.getElementById('yearMenu').classList.remove('open');
  document.removeEventListener('click', closeYearMenu);
}
function toggleYear(y) {
  if (selectedYears.has(y)) {
    if (selectedYears.size <= 1) return; // must keep at least 1
    selectedYears.delete(y);
  } else {
    selectedYears.add(y);
  }
  saveYears();
  scrollInited = false;
  render();
  renderYearMenu();
}

// ═══════════════════════════════════════════════
// VIEW MODE — zoom presets
// ═══════════════════════════════════════════════
const ZOOM_PRESET = { week:9, month:6, year:1 };

function setViewMode(mode) {
  zoomIdx = ZOOM_PRESET[mode];
  scrollInited = false;
  render();
  updateViewUI();
}

function updateViewUI() {
  document.querySelectorAll('.view-tab').forEach(t => {
    const pi = ZOOM_PRESET[t.dataset.mode];
    t.classList.toggle('active', pi === zoomIdx);
  });
}

// ═══════════════════════════════════════════════
// TIMELINE RESIZER — drag to zoom
// ═══════════════════════════════════════════════
function initTlResizer() {
  const handle = document.getElementById('tlResizer');
  if (!handle) return;

  let startX, startCOL;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    startX   = e.clientX;
    startCOL = COL;
    handle.classList.add('active');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMove = e2 => {
      const dx = e2.clientX - startX;
      // Sensitivity: every 8px of drag = 1px of COL change
      const newCOL = Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length-1], Math.round(startCOL + dx / 8)));

      // Find closest zoom index
      let best = 0;
      for (let i = 1; i < ZOOM_LEVELS.length; i++) {
        if (Math.abs(ZOOM_LEVELS[i] - newCOL) < Math.abs(ZOOM_LEVELS[best] - newCOL)) best = i;
      }
      if (best === zoomIdx) return;

      const sc = document.getElementById('tlScroll');
      const lb = document.getElementById('leftBody');
      const oldCOL = ZOOM_LEVELS[zoomIdx];
      const newActual = ZOOM_LEVELS[best];

      // Preserve scroll center
      const centerDay = (sc.scrollLeft + sc.clientWidth / 2) / oldCOL;
      const vScroll = sc.scrollTop;
      const lbScroll = lb ? lb.scrollTop : 0;

      zoomIdx = best;
      scrollInited = true;
      render();

      sc.scrollLeft = Math.max(0, centerDay * newActual - sc.clientWidth / 2);
      sc.scrollTop = vScroll;
      if (lb) lb.scrollTop = lbScroll;
      updateViewUI();
    };

    const onUp = () => {
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ═══════════════════════════════════════════════
// TIMELINE PAN — click & drag to scroll
// ═══════════════════════════════════════════════
function initTlPan() {
  const sc = document.getElementById('tlScroll');
  if (!sc) return;

  let panning = false, panStartX, panStartY, panScrollX, panScrollY;

  sc.addEventListener('mousedown', e => {
    // Only left button, skip if clicking on interactive elements
    if (e.button !== 0) return;
    const tag = e.target.closest('.task-bar, .bar-resize, .drag-grip, button, input, select');
    if (tag) return;

    panning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panScrollX = sc.scrollLeft;
    panScrollY = sc.scrollTop;
    sc.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!panning) return;
    sc.scrollLeft = panScrollX - (e.clientX - panStartX);
    sc.scrollTop  = panScrollY - (e.clientY - panStartY);
    // Sync left panel vertical scroll
    const lb = document.getElementById('leftBody');
    if (lb) lb.scrollTop = sc.scrollTop;
  });

  document.addEventListener('mouseup', () => {
    if (!panning) return;
    panning = false;
    sc.style.cursor = '';
  });
}

// Ctrl+Scroll wheel zoom on timeline
document.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  const sc = document.getElementById('tlScroll');
  if (!sc || !sc.contains(e.target)) return;
  e.preventDefault();

  const dir = e.deltaY < 0 ? 1 : -1;
  const newIdx = zoomIdx + dir;
  if (newIdx < 0 || newIdx >= ZOOM_LEVELS.length) return;

  const oldCOL = ZOOM_LEVELS[zoomIdx];
  const newCOL = ZOOM_LEVELS[newIdx];
  const lb = document.getElementById('leftBody');

  const centerDay = (sc.scrollLeft + sc.clientWidth / 2) / oldCOL;
  const vScroll = sc.scrollTop;
  const lbScroll = lb ? lb.scrollTop : 0;

  zoomIdx = newIdx;
  scrollInited = true;
  render();

  sc.scrollLeft = Math.max(0, centerDay * newCOL - sc.clientWidth / 2);
  sc.scrollTop = vScroll;
  if (lb) lb.scrollTop = lbScroll;
  updateViewUI();
}, { passive: false });

// ═══════════════════════════════════════════════
// DRAG & DROP FILE IMPORT
// ═══════════════════════════════════════════════
(function initFileDrop() {
  let dragCount = 0;
  const overlay = document.createElement('div');
  overlay.id = 'drop-overlay';
  overlay.innerHTML = '<div class="drop-overlay-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Thả file để import</span><small>.xlsx, .xls, .json</small></div>';
  document.body.appendChild(overlay);

  document.addEventListener('dragenter', e => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCount++;
    overlay.classList.add('active');
  });

  document.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCount--;
    if (dragCount <= 0) { dragCount = 0; overlay.classList.remove('active'); }
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    dragCount = 0;
    overlay.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['json','xlsx','xls'].includes(ext)) {
      alert('Định dạng không hỗ trợ. Vui lòng thả file .xlsx, .xls hoặc .json');
      return;
    }
    projectName = file.name.replace(/\.[^.]+$/, '');
    saveProjectName();
    if (ext === 'json') importJSON(file);
    else importExcel(file);
  });
})();
