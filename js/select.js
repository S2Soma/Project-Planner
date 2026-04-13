// ═══════════════════════════════════════════════
// MULTI-SELECT
// ═══════════════════════════════════════════════
let lastClickedId = null;

function toggleSelect(id, e) {
  if (e) e.stopPropagation();

  if (e && e.shiftKey && lastClickedId !== null) {
    rangeSelect(lastClickedId, id);
  } else {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
  }

  lastClickedId = id;
  applySelectionVisuals();
  updateBulkBar();
}

function rangeSelect(fromId, toId) {
  const rows = [...document.querySelectorAll('.task-row')];
  const ids = rows.map(r => parseInt(r.dataset.id));
  const fromIdx = ids.indexOf(fromId);
  const toIdx = ids.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1) return;

  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  for (let i = start; i <= end; i++) selectedIds.add(ids[i]);
}

function toggleSelectAll() {
  const visibleIds = [...document.querySelectorAll('.task-row')]
    .map(r => parseInt(r.dataset.id));
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  if (allSelected) visibleIds.forEach(id => selectedIds.delete(id));
  else visibleIds.forEach(id => selectedIds.add(id));

  applySelectionVisuals();
  updateBulkBar();
}

function deselectAll() {
  selectedIds.clear();
  lastClickedId = null;
  applySelectionVisuals();
  updateBulkBar();
}

function applySelectionVisuals() {
  document.querySelectorAll('.task-row').forEach(row => {
    const id = parseInt(row.dataset.id);
    const sel = selectedIds.has(id);
    row.classList.toggle('selected', sel);
    const cb = row.querySelector('.sel-cb');
    if (cb) cb.checked = sel;
  });

  document.querySelectorAll('.task-bar').forEach(bar => {
    const id = parseInt(bar.dataset.id);
    bar.classList.toggle('selected', selectedIds.has(id));
  });

  const headerCb = document.querySelector('.sel-cb-all');
  if (headerCb) {
    const visibleIds = [...document.querySelectorAll('.task-row')]
      .map(r => parseInt(r.dataset.id));
    const selCount = visibleIds.filter(id => selectedIds.has(id)).length;
    headerCb.checked = visibleIds.length > 0 && selCount === visibleIds.length;
    headerCb.indeterminate = selCount > 0 && selCount < visibleIds.length;
  }
}

function bulkDelete() {
  const count = selectedIds.size;
  if (count === 0) return;
  if (!confirm(`Xóa ${count} công việc đã chọn?`)) return;

  tasks = tasks.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  lastClickedId = null;
  saveData();
  render({ keep: true });
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;

  if (selectedIds.size > 0) {
    bar.classList.add('visible');
    const countEl = bar.querySelector('.bulk-count');
    if (countEl) countEl.textContent = `${selectedIds.size} công việc đã chọn`;
  } else {
    bar.classList.remove('visible');
  }
}

function pruneSelection() {
  const taskIds = new Set(tasks.map(t => t.id));
  for (const id of selectedIds) {
    if (!taskIds.has(id)) selectedIds.delete(id);
  }
}
