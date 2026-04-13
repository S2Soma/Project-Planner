// ═══════════════════════════════════════════════
// PANEL COLLAPSE / RESIZE
// ═══════════════════════════════════════════════
let panelCollapsed = false;
let panelWidth = 734; // default = --lp-w

function initPanel() {
  try {
    const saved = localStorage.getItem('pmm_panel');
    if (saved) {
      const d = JSON.parse(saved);
      panelCollapsed = !!d.collapsed;
      panelWidth = d.width || 734;
    }
  } catch(e) {}
  applyPanelState(false);
  initPanelResize();
}

function savePanelState() {
  localStorage.setItem('pmm_panel', JSON.stringify({ collapsed: panelCollapsed, width: panelWidth }));
}

function applyPanelState(animate) {
  const panel = document.getElementById('leftPanel');
  const resizer = document.getElementById('panelResizer');
  if (animate) {
    panel.classList.add('panel-animate');
    panel.addEventListener('transitionend', function handler() {
      panel.classList.remove('panel-animate');
      panel.removeEventListener('transitionend', handler);
    });
  }
  if (panelCollapsed) {
    panel.style.width = '0px';
    panel.classList.add('collapsed');
    resizer.classList.add('panel-collapsed');
  } else {
    panel.style.width = panelWidth + 'px';
    panel.classList.remove('collapsed');
    resizer.classList.remove('panel-collapsed');
  }
}

function togglePanel() {
  panelCollapsed = !panelCollapsed;
  savePanelState();
  applyPanelState(true);
}

function initPanelResize() {
  const resizer = document.getElementById('panelResizer');
  let startX, startW;

  resizer.addEventListener('mousedown', e => {
    // Click on toggle button → toggle, don't resize
    if (e.target.closest('.resizer-toggle')) {
      togglePanel();
      return;
    }
    if (panelCollapsed) return;
    e.preventDefault();
    startX = e.clientX;
    startW = panelWidth;
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const panel = document.getElementById('leftPanel');
    panel.classList.remove('panel-animate');

    const onMove = e2 => {
      const dx = e2.clientX - startX;
      panelWidth = Math.max(280, Math.min(1200, startW + dx));
      panel.style.width = panelWidth + 'px';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      resizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      savePanelState();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ═══════════════════════════════════════════════
// COLUMN VISIBILITY
// ═══════════════════════════════════════════════
const COL_LABELS = {
  desc:'Description', note:'Note', pic:'Main PIC',
  status:'Status', from:'Start Date', to:'End Date'
};

function saveColVisible() {
  localStorage.setItem('pmm_cols', JSON.stringify(colVisible));
}

function applyColVisibility() {
  const panel = document.getElementById('leftPanel');
  let w = COL_WIDTHS.sel + COL_WIDTHS.name; // checkbox + name always visible
  for (const key of Object.keys(COL_LABELS)) {
    if (colVisible[key]) {
      panel.classList.remove('hide-' + key);
      w += COL_WIDTHS[key];
    } else {
      panel.classList.add('hide-' + key);
    }
  }
  // Update panel width if not collapsed
  if (!panelCollapsed) {
    panelWidth = w;
    panel.style.width = w + 'px';
    savePanelState();
  }
}

function toggleColMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('colMenu');
  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    return;
  }
  menu.innerHTML = Object.entries(COL_LABELS).map(([key, label]) =>
    `<label class="col-menu-item" onclick="event.stopPropagation()">
      <input type="checkbox" ${colVisible[key]?'checked':''}
        onchange="toggleColumn('${key}')">
      <span>${label}</span>
    </label>`
  ).join('');
  menu.classList.add('open');
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeColMenu);
  }, 0);
}

function closeColMenu() {
  document.getElementById('colMenu').classList.remove('open');
  document.removeEventListener('click', closeColMenu);
}

function toggleColumn(key) {
  colVisible[key] = !colVisible[key];
  saveColVisible();
  applyColVisibility();
}
