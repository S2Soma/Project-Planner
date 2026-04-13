// ═══════════════════════════════════════════════
// PASTE TASKS — bulk add from Excel / text list
// ═══════════════════════════════════════════════

function openPasteModal(category) {
  const modal = document.getElementById('pasteModal');
  if (!modal) return;
  modal.classList.add('open');
  document.getElementById('pasteCategory').value = category || '';
  const ta = document.getElementById('pasteArea');
  ta.value = '';
  ta.focus();
  updatePastePreview();
}

function closePasteModal() {
  const modal = document.getElementById('pasteModal');
  if (modal) modal.classList.remove('open');
}

function updatePastePreview() {
  const raw = document.getElementById('pasteArea').value;
  const names = parsePasteInput(raw);
  const preview = document.getElementById('pastePreview');
  if (!names.length) {
    preview.innerHTML = '<span class="paste-hint">Dán danh sách tên công việc vào ô trên (mỗi dòng 1 công việc)</span>';
    return;
  }
  preview.innerHTML = `<span class="paste-count">${names.length} công việc sẽ được thêm:</span>` +
    names.map((n, i) => `<div class="paste-item">${i + 1}. ${esc(n)}</div>`).join('');
}

function parsePasteInput(raw) {
  if (!raw || !raw.trim()) return [];
  // Split by newline, then handle tab-separated (Excel copies with tabs)
  return raw.split(/\r?\n/)
    .map(line => {
      // Take the first non-empty cell if tab-separated (Excel paste)
      const cells = line.split('\t');
      // Find the first non-empty cell that looks like a task name
      for (const cell of cells) {
        const trimmed = cell.trim();
        if (trimmed && !/^\d+$/.test(trimmed)) return trimmed; // skip pure numbers (row numbers)
      }
      // If all cells are numbers or empty, try the first non-empty
      for (const cell of cells) {
        const trimmed = cell.trim();
        if (trimmed) return trimmed;
      }
      return '';
    })
    .filter(name => name.length > 0);
}

function confirmPasteTasks() {
  const raw = document.getElementById('pasteArea').value;
  const names = parsePasteInput(raw);
  if (!names.length) return;

  const categoryInput = document.getElementById('pasteCategory').value.trim();
  const category = categoryInput || 'Chưa phân loại';

  const td = new Date().toISOString().slice(0, 10);
  const te = new Date(); te.setDate(te.getDate() + 13);
  const endDate = te.toISOString().slice(0, 10);
  let maxId = tasks.reduce((m, t) => Math.max(m, t.id || 0), 0);

  names.forEach(name => {
    maxId++;
    tasks.push({
      id: maxId,
      name: name,
      category: category,
      description: '',
      notes: '',
      owner: '',
      from: td,
      to: endDate,
      status: 'todo',
      pct: 0,
      color: '#33B96A'
    });
  });

  saveData();
  closePasteModal();
  render({ keep: true });
}

// Close modal on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('pasteModal');
    if (modal && modal.classList.contains('open')) {
      closePasteModal();
      e.stopPropagation();
    }
  }
});
