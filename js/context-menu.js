// ═══════════════════════════════════════════════
// RIGHT-CLICK CONTEXT MENU
// ═══════════════════════════════════════════════
let _ctxEl = null;

function initContextMenu() {
  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'ctx-menu';
  document.body.appendChild(menu);
  _ctxEl = menu;

  // Close on click outside
  document.addEventListener('click', () => closeCtxMenu());
  document.addEventListener('contextmenu', e => {
    const row = e.target.closest('.task-row');
    if (!row) { closeCtxMenu(); return; }
    e.preventDefault();
    const id = parseInt(row.dataset.id);
    if (!id) return;

    // Auto-select the task if not selected
    if (!selectedIds.has(id)) {
      selectedIds.clear();
      selectedIds.add(id);
      applySelectionVisuals();
      updateBulkBar();
    }

    showCtxMenu(e.clientX, e.clientY, id);
  });
}

function showCtxMenu(x, y, id) {
  const t = taskMap.get(id);
  if (!t) return;
  const multi = selectedIds.size > 1;
  const lbl = multi ? `${selectedIds.size} tasks` : '';
  const level = getTaskLevel(t);

  let h = '';

  // Status submenu
  h += `<div class="ctx-sub">
    <div class="ctx-item ctx-has-sub">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>
      Đổi trạng thái
      <svg class="ctx-arrow" width="8" height="8" viewBox="0 0 8 8"><path d="M2 1l4 3-4 3" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
    </div>
    <div class="ctx-submenu">
      ${STATUS_LIST.map(s => `<div class="ctx-item" onclick="ctxSetStatus('${s}')">
        <span class="ctx-dot ${STATUS_CLS[s]}"></span>${STATUS_LBL[s]}
      </div>`).join('')}
    </div>
  </div>`;

  h += '<div class="ctx-sep"></div>';

  // Indent / Outdent
  h += `<div class="ctx-item" onclick="ctxIndent()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 4 15 12 9 20"/></svg>
    Sub-task <span class="ctx-key">Tab</span>
  </div>`;
  if (level > 0 || (multi && [...selectedIds].some(sid => (_levelCache[sid]||0) > 0))) {
    h += `<div class="ctx-item" onclick="ctxOutdent()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 4 9 12 15 20"/></svg>
      Lùi ra <span class="ctx-key">Shift+Tab</span>
    </div>`;
  }

  h += '<div class="ctx-sep"></div>';

  // Duplicate
  h += `<div class="ctx-item" onclick="ctxDuplicate()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    Nhân bản <span class="ctx-key">Ctrl+D</span>
  </div>`;

  h += '<div class="ctx-sep"></div>';

  // Delete
  h += `<div class="ctx-item ctx-danger" onclick="ctxDelete()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
    Xóa ${multi?lbl:''} <span class="ctx-key">Delete</span>
  </div>`;

  _ctxEl.innerHTML = h;
  _ctxEl.style.display = 'block';

  // Position: keep on screen
  const mw = _ctxEl.offsetWidth, mh = _ctxEl.offsetHeight;
  const cx = x + mw > window.innerWidth ? x - mw : x;
  const cy = y + mh > window.innerHeight ? y - mh : y;
  _ctxEl.style.left = Math.max(0, cx) + 'px';
  _ctxEl.style.top = Math.max(0, cy) + 'px';
}

function closeCtxMenu() {
  if (_ctxEl) _ctxEl.style.display = 'none';
}

// Context menu actions
function ctxSetStatus(status) {
  selectedIds.forEach(id => {
    const t = taskMap.get(id);
    if (!t) return;
    t.status = status;
    if (status === 'done') t.pct = 100;
  });
  saveData();
  closeCtxMenu();
  render({ keep: true });
}

function ctxIndent() {
  [...selectedIds].forEach(id => indentTask(id));
  closeCtxMenu();
}
function ctxOutdent() {
  [...selectedIds].forEach(id => outdentTask(id));
  closeCtxMenu();
}
function ctxDuplicate() {
  duplicateSelected();
  closeCtxMenu();
}
function ctxDelete() {
  const count = selectedIds.size;
  if (!confirm(`Xóa ${count} công việc đã chọn?`)) { closeCtxMenu(); return; }
  tasks = tasks.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  saveData();
  closeCtxMenu();
  render({ keep: true });
}

// ═══════════════════════════════════════════════
// KEYBOARD NAVIGATION — Arrow keys
// ═══════════════════════════════════════════════
function initKeyboardNav() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    if (selectedIds.size === 0) return;

    e.preventDefault();
    const rows = [...document.querySelectorAll('.task-row')];
    const ids = rows.map(r => parseInt(r.dataset.id));
    const lastId = [...selectedIds].pop();
    const curIdx = ids.indexOf(lastId);
    if (curIdx === -1) return;

    const nextIdx = e.key === 'ArrowDown'
      ? Math.min(curIdx + 1, ids.length - 1)
      : Math.max(curIdx - 1, 0);
    const nextId = ids[nextIdx];

    if (e.shiftKey) {
      selectedIds.add(nextId);
    } else {
      selectedIds.clear();
      selectedIds.add(nextId);
    }
    applySelectionVisuals();
    updateBulkBar();

    // Scroll into view
    const row = document.querySelector(`.task-row[data-id="${nextId}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
