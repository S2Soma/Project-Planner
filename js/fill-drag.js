// ═══════════════════════════════════════════════
// FILL DRAG — Excel-style drag-to-fill for PIC/Status
// ═══════════════════════════════════════════════
let _fill = null;

function startFillDrag(e, srcId, field) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const srcTask = taskMap.get(srcId);
  if (!srcTask) return;

  const srcRow = e.target.closest('.task-row');
  if (!srcRow) return;

  _fill = {
    srcId,
    field,
    value: srcTask[field],
    color: field === 'owner' ? getPicColor(srcTask.owner) : null,
    startY: e.clientY,
    moved: false,
    highlightedIds: []
  };

  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'crosshair';

  // Highlight source row
  srcRow.classList.add('fill-source');
}

document.addEventListener('mousemove', e => {
  if (!_fill) return;

  if (!_fill.moved && Math.abs(e.clientY - _fill.startY) < 4) return;
  _fill.moved = true;

  // Clear previous highlights
  document.querySelectorAll('.fill-target').forEach(el => el.classList.remove('fill-target'));

  // Find all task rows and determine which are below/above cursor
  const rows = [...document.querySelectorAll('.task-row')];
  const srcIdx = rows.findIndex(r => parseInt(r.dataset.id) === _fill.srcId);
  if (srcIdx === -1) return;

  const newHighlighted = [];
  const goingDown = e.clientY > _fill.startY;

  for (let i = 0; i < rows.length; i++) {
    if (i === srcIdx) continue;
    const rect = rows[i].getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (goingDown && i > srcIdx && midY < e.clientY) {
      rows[i].classList.add('fill-target');
      newHighlighted.push(parseInt(rows[i].dataset.id));
    } else if (!goingDown && i < srcIdx && midY > e.clientY) {
      rows[i].classList.add('fill-target');
      newHighlighted.push(parseInt(rows[i].dataset.id));
    }
  }

  _fill.highlightedIds = newHighlighted;
});

document.addEventListener('mouseup', e => {
  if (!_fill) return;

  const { field, value, color, moved, highlightedIds } = _fill;

  // Cleanup
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  document.querySelectorAll('.fill-source').forEach(el => el.classList.remove('fill-source'));
  document.querySelectorAll('.fill-target').forEach(el => el.classList.remove('fill-target'));

  if (moved && highlightedIds.length > 0) {
    highlightedIds.forEach(id => {
      const t = taskMap.get(id);
      if (!t) return;
      t[field] = value;
      if (field === 'owner') t.color = getPicColor(value);
    });
    saveData();
    render({ keep: true });
  }

  _fill = null;
});
