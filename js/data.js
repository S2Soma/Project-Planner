// ═══════════════════════════════════════════════
// SUBTASK HELPERS
// ═══════════════════════════════════════════════
let collapsedTasks = {};  // { taskId: true } — collapsed parent tasks

function loadCollapsedTasks() {
  try {
    const s = localStorage.getItem('pmm_collapsedTasks');
    if (s) collapsedTasks = JSON.parse(s);
  } catch(e) {}
}
function saveCollapsedTasks() {
  localStorage.setItem('pmm_collapsedTasks', JSON.stringify(collapsedTasks));
}

function getTaskLevel(t) {
  let level = 0, cur = t;
  while (cur && cur.parentId) {
    const parent = tasks.find(p => p.id === cur.parentId);
    if (!parent || parent.id === cur.id) break;
    level++;
    cur = parent;
  }
  return level;
}

function hasChildren(id) {
  return tasks.some(t => t.parentId === id);
}

function getDescendantIds(id) {
  const ids = [];
  const children = tasks.filter(t => t.parentId === id);
  children.forEach(c => {
    ids.push(c.id);
    ids.push(...getDescendantIds(c.id));
  });
  return ids;
}

function isTaskHidden(t) {
  // A task is hidden if any ancestor is collapsed
  let cur = t;
  while (cur && cur.parentId) {
    if (collapsedTasks[cur.parentId]) return true;
    const parent = tasks.find(p => p.id === cur.parentId);
    if (!parent || parent.id === cur.id) break;
    cur = parent;
  }
  return false;
}

function toggleTaskCollapse(id) {
  collapsedTasks[id] = !collapsedTasks[id];
  saveCollapsedTasks();
  render({ keep: true });
}

function indentTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx <= 0) return;
  // Find the previous sibling (same parentId, just above)
  const t = tasks[idx];
  const prevSibling = tasks.slice(0, idx).reverse().find(p =>
    p.id !== id && p.category === t.category && !getDescendantIds(id).includes(p.id)
  );
  if (!prevSibling) return;
  t.parentId = prevSibling.id;
  saveData();
  render({ keep: true });
}

function outdentTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t || !t.parentId) return;
  const parent = tasks.find(p => p.id === t.parentId);
  t.parentId = parent ? parent.parentId || null : null;
  if (!t.parentId) delete t.parentId;
  saveData();
  render({ keep: true });
}

// ═══════════════════════════════════════════════
// FILTER & GROUP
// ═══════════════════════════════════════════════
function getFiltered() {
  return tasks;
}
function getGrouped(list) {
  if (groupBy === 'none') return [{ key:'', tasks:list }];
  const map = {};
  list.forEach(t => {
    const k = t.category || 'Chưa phân loại';
    if (!map[k]) map[k] = [];
    map[k].push(t);
  });
  return Object.entries(map).map(([key, tasks]) => ({ key, tasks }));
}

// ═══════════════════════════════════════════════
// AUTO-DELAY — mark overdue tasks
// ═══════════════════════════════════════════════
function autoDelay() {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  tasks.forEach(t => {
    if (t.to && t.to < today && t.status !== 'done' && t.status !== 'delay') {
      t.status = 'delay';
      changed = true;
    }
  });
  if (changed) saveData();
}

// ═══════════════════════════════════════════════
// BAR
// ═══════════════════════════════════════════════
function barFor(t) {
  if (!days.length || !t.from || !t.to) return null;
  const fi = days.findIndex(d => d.date === t.from);
  let li = -1;
  for (let i = days.length-1; i >= 0; i--) { if (days[i].date === t.to){ li=i; break; } }
  if (fi < 0 || li < 0) return null;
  return { si:fi, span:li-fi+1 };
}
function pctCol(p) { return p>=80?'#00A651':p>=50?'#d97706':'#dc2626'; }
