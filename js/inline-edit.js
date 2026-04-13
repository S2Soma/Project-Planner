// ═══════════════════════════════════════════════
// INLINE EDIT
// ═══════════════════════════════════════════════
function saveIL(el) {
  const id    = parseInt(el.dataset.id);
  const field = el.dataset.field;
  const val   = el.value;
  if (val === el.dataset.orig) return;
  el.dataset.orig = val;
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t[field] = val;
  saveData();
  // If name changed → update bar label in timeline
  if (field === 'name') {
    const lbl = document.querySelector(`.task-bar[data-id="${id}"] .bar-lbl`);
    if (lbl) lbl.textContent = val;
    hideTip();
  }
}

function ilKey(e, el) {
  if (e.key === 'Enter')   { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape')  { el.value = el.dataset.orig || ''; el.blur(); }
  e.stopPropagation();
}

function changeStatus(el) {
  const id = parseInt(el.dataset.id);
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.status = el.value;
  if (t.status === 'done') t.pct = 100;
  saveData();
  // Update dropdown styling
  el.className = `status-select ${STATUS_CLS[t.status]}`;
  // Update bar progress
  if (t.status === 'done') {
    const prog = document.querySelector(`.task-bar[data-id="${id}"] .bar-prog`);
    if (prog) prog.style.width = '100%';
  }
}

function savePicSelect(el) {
  const id = parseInt(el.dataset.id);
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.owner = el.value;
  t.color = getPicColor(t.owner);
  saveData();
  // Update bar color in-place
  const bar = document.querySelector(`.task-bar[data-id="${id}"]`);
  if (bar) bar.style.background = t.color;
}

function deleteById(id) {
  if (!confirm('Xóa công việc này?')) return;
  tasks = tasks.filter(t => t.id !== id);
  selectedIds.delete(id);
  saveData();
  render({ keep: true });
}

// Highlight row when bar is clicked
function highlightTask(id) {
  const row = document.querySelector(`.task-row[data-id="${id}"]`);
  if (!row) return;
  row.scrollIntoView({ behavior:'smooth', block:'nearest' });
  row.classList.add('hl');
  setTimeout(() => row.classList.remove('hl'), 900);
}

// Update date cells after drag
function updateDateCells(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const row = document.querySelector(`.task-row[data-id="${id}"]`);
  if (!row) return;
  const cells = row.querySelectorAll('.dcell');
  if (cells[0]) cells[0].textContent = fmtDate(t.from)||'—';
  if (cells[1]) cells[1].textContent = fmtDate(t.to)||'—';
}

// ═══════════════════════════════════════════════
// INLINE CREATE — task & category
// ═══════════════════════════════════════════════
function addTaskInline(category) {
  const td = new Date().toISOString().slice(0,10);
  const te = new Date(); te.setDate(te.getDate()+13);
  const maxId = tasks.reduce((m,t) => Math.max(m, t.id||0), 0);
  const newTask = {
    id: maxId+1,
    name: '',
    category: category || 'Chưa phân loại',
    description: '',
    notes: '',
    owner: '',
    from: td,
    to: te.toISOString().slice(0,10),
    status: 'todo',
    pct: 0,
    color: '#33B96A'
  };
  tasks.push(newTask);
  saveData();
  render({ keep: true });
  setTimeout(() => {
    const inp = document.querySelector(`.task-row[data-id="${newTask.id}"] .fi-name`);
    if (inp) { inp.focus(); inp.select(); }
  }, 50);
}

function addCategoryInline() {
  const row = document.getElementById('addCatRow');
  if (!row) return;
  // Prevent double-click
  if (row.querySelector('input')) return;
  row.onclick = null;
  row.innerHTML = `<input class="fi add-cat-input" type="text" placeholder="Tên danh mục mới..."
    onblur="confirmAddCategory(this)" onkeydown="addCatKey(event,this)">`;
  const inp = row.querySelector('input');
  if (inp) inp.focus();
}

function confirmAddCategory(el) {
  const name = el.value.trim();
  if (!name) { render({ keep: true }); return; }
  // Create a new task in this new category
  addTaskInline(name);
}

function addCatKey(e, el) {
  if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') { el.value = ''; el.blur(); }
  e.stopPropagation();
}
