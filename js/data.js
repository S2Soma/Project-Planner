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
