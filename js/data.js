// ═══════════════════════════════════════════════
// TASK MAP — O(1) lookups + cached computations
// ═══════════════════════════════════════════════
let taskMap = new Map();     // id → task
let _levelCache = {};        // id → level
let _hiddenCache = {};       // id → boolean
let _childrenCache = {};     // id → boolean (has children)
let _dateIndex = {};         // date string → day index
let _weekStartIdx = {};      // wn → first day index

function rebuildCaches() {
  // Task map
  taskMap.clear();
  tasks.forEach(t => taskMap.set(t.id, t));

  // Children cache
  _childrenCache = {};
  tasks.forEach(t => { if (t.parentId) _childrenCache[t.parentId] = true; });

  // Level cache
  _levelCache = {};
  tasks.forEach(t => { _levelCache[t.id] = _calcLevel(t); });

  // Hidden cache
  _hiddenCache = {};
  tasks.forEach(t => { _hiddenCache[t.id] = _calcHidden(t); });

  // Date index (for barFor)
  _dateIndex = {};
  days.forEach((d, i) => { _dateIndex[d.date] = i; });

  // Week start index
  _weekStartIdx = {};
  if (proposeMode) {
    weeks.forEach(w => { _weekStartIdx[w.wn] = w.wn * 7; });
  } else {
    days.forEach((d, i) => {
      if (_weekStartIdx[d.wn] === undefined) _weekStartIdx[d.wn] = i;
    });
  }

  // Auto-calc parent progress
  _calcParentProgress();
}

function _calcLevel(t) {
  let level = 0, cur = t, seen = new Set();
  while (cur && cur.parentId) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    const parent = taskMap.get(cur.parentId);
    if (!parent) break;
    level++;
    cur = parent;
  }
  return level;
}

function _calcHidden(t) {
  let cur = t, seen = new Set();
  while (cur && cur.parentId) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    if (collapsedTasks[cur.parentId]) return true;
    const parent = taskMap.get(cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return false;
}

function _calcParentProgress() {
  // Build children map
  const childrenOf = {};
  tasks.forEach(t => {
    if (t.parentId) {
      if (!childrenOf[t.parentId]) childrenOf[t.parentId] = [];
      childrenOf[t.parentId].push(t);
    }
  });
  // Update parent pct from children average
  Object.entries(childrenOf).forEach(([pid, children]) => {
    const parent = taskMap.get(parseInt(pid));
    if (!parent) return;
    const avg = Math.round(children.reduce((s, c) => s + (c.pct || 0), 0) / children.length);
    parent.pct = avg;
    if (children.every(c => c.status === 'done')) parent.status = 'done';
  });
}

// Fast accessors using caches
function getTaskLevel(t) { return _levelCache[t.id] || 0; }
function hasChildren(id) { return !!_childrenCache[id]; }
function isTaskHidden(t) { return !!_hiddenCache[t.id]; }
function getWeekStartIdx(wn) { return _weekStartIdx[wn] || 0; }

// ═══════════════════════════════════════════════
// SUBTASK HELPERS
// ═══════════════════════════════════════════════
let collapsedTasks = {};

function loadCollapsedTasks() {
  try {
    const s = localStorage.getItem('pmm_collapsedTasks');
    if (s) collapsedTasks = JSON.parse(s);
  } catch(e) {}
}
function saveCollapsedTasks() {
  localStorage.setItem('pmm_collapsedTasks', JSON.stringify(collapsedTasks));
}

function getDescendantIds(id) {
  const ids = [];
  tasks.forEach(t => {
    if (t.parentId === id) {
      ids.push(t.id);
      ids.push(...getDescendantIds(t.id));
    }
  });
  return ids;
}

function toggleTaskCollapse(id) {
  collapsedTasks[id] = !collapsedTasks[id];
  saveCollapsedTasks();
  render({ keep: true });
}

function indentTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx <= 0) return;
  const t = tasks[idx];
  const curLevel = _levelCache[t.id] || 0;
  for (let i = idx - 1; i >= 0; i--) {
    const above = tasks[i];
    if (above.category !== t.category) break;
    const aboveLevel = _levelCache[above.id] || 0;
    if (aboveLevel === curLevel) {
      t.parentId = above.id;
      saveData();
      render({ keep: true });
      return;
    }
    if (aboveLevel < curLevel) break;
  }
}

function outdentTask(id) {
  const t = taskMap.get(id);
  if (!t || !t.parentId) return;
  const parent = taskMap.get(t.parentId);
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
  if (proposeMode) return;
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
// BAR — uses cached date index
// ═══════════════════════════════════════════════
function barFor(t) {
  if (!days.length) return null;
  if (proposeMode) {
    if (t.propFrom == null || t.propTo == null) return null;
    const si = t.propFrom * 7;
    const ei = (t.propTo + 1) * 7 - 1;
    if (si >= days.length) return null;
    return { si, span: Math.min(ei, days.length - 1) - si + 1 };
  }
  if (!t.from || !t.to) return null;
  const fi = _dateIndex[t.from];
  const li = _dateIndex[t.to];
  if (fi == null || li == null) return null;
  return { si: fi, span: li - fi + 1 };
}
function pctCol(p) { return p>=80?'#00A651':p>=50?'#d97706':'#dc2626'; }
