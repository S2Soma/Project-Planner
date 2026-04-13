// ═══════════════════════════════════════════════
// CATEGORY REORDER — drag to reorder groups
// ═══════════════════════════════════════════════
let catReorder = null;

function startCatReorder(e, category) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  catReorder = {
    category,
    startY: e.clientY,
    moved: false,
    targetCategory: null,
    insertBefore: true
  };
  document.body.style.userSelect = 'none';
}

document.addEventListener('mousemove', e => {
  if (!catReorder) return;

  if (!catReorder.moved) {
    if (Math.abs(e.clientY - catReorder.startY) < 5) return;
    catReorder.moved = true;

    // Show ghost
    const ghost = document.getElementById('reorder-ghost');
    ghost.textContent = catReorder.category;
    ghost.style.display = 'block';

    // Dim source group row
    const srcRow = document.querySelector(`.group-row[data-category="${CSS.escape(catReorder.category)}"]`);
    if (srcRow) srcRow.classList.add('cat-dragging');
  }

  // Update ghost position
  const ghost = document.getElementById('reorder-ghost');
  ghost.style.left = (e.clientX + 16) + 'px';
  ghost.style.top = (e.clientY - 14) + 'px';

  // Find drop target among group rows
  const lb = document.getElementById('leftBody');
  const groupRows = [...lb.querySelectorAll('.group-row')];
  const calBody = document.querySelector('.cal-body');
  const calRect = calBody.getBoundingClientRect();
  const indicator = document.getElementById('reorder-indicator');

  let targetCategory = null;
  let insertBefore = true;
  let indicatorY = null;

  for (let i = 0; i < groupRows.length; i++) {
    const el = groupRows[i];
    const r = el.getBoundingClientRect();
    const midY = r.top + r.height / 2;

    if (e.clientY < midY) {
      targetCategory = el.dataset.category;
      insertBefore = true;
      indicatorY = r.top - 1;
      break;
    }
  }

  // If cursor is below all groups → insert after last
  if (targetCategory === null && groupRows.length > 0) {
    const last = groupRows[groupRows.length - 1];
    targetCategory = last.dataset.category;
    insertBefore = false;
    // Find the bottom of the last group's content
    const lastCat = last.dataset.category;
    const allItems = [...lb.querySelectorAll('.group-row, .task-row, .add-row-group')];
    let bottomEl = last;
    let foundCat = false;
    for (const item of allItems) {
      if (item.classList.contains('group-row') && item.dataset.category === lastCat) { foundCat = true; continue; }
      if (foundCat && item.classList.contains('group-row')) break;
      if (foundCat) bottomEl = item;
    }
    indicatorY = bottomEl.getBoundingClientRect().bottom - 1;
  }

  // Show indicator
  if (indicatorY !== null) {
    indicator.style.left = calRect.left + 'px';
    indicator.style.width = calRect.width + 'px';
    indicator.style.top = indicatorY + 'px';
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }

  catReorder.targetCategory = targetCategory;
  catReorder.insertBefore = insertBefore;
});

document.addEventListener('mouseup', e => {
  if (!catReorder) return;

  const { category, moved, targetCategory, insertBefore } = catReorder;

  // Cleanup visuals
  document.body.style.userSelect = '';
  document.getElementById('reorder-ghost').style.display = 'none';
  document.getElementById('reorder-indicator').style.display = 'none';
  const srcRow = document.querySelector(`.group-row[data-category="${CSS.escape(category)}"]`);
  if (srcRow) srcRow.classList.remove('cat-dragging');

  if (moved && targetCategory !== null && targetCategory !== category) {
    // Build current category order from tasks array
    const catOrder = [];
    tasks.forEach(t => {
      const cat = t.category || 'Chưa phân loại';
      if (!catOrder.includes(cat)) catOrder.push(cat);
    });

    // Remove source category from order
    const srcIdx = catOrder.indexOf(category);
    if (srcIdx >= 0) catOrder.splice(srcIdx, 1);

    // Find target position
    let tgtIdx = catOrder.indexOf(targetCategory);
    if (tgtIdx === -1) tgtIdx = catOrder.length;
    if (!insertBefore) tgtIdx++;

    // Insert at new position
    catOrder.splice(tgtIdx, 0, category);

    // Rebuild tasks array in new category order
    const tasksByCat = {};
    tasks.forEach(t => {
      const cat = t.category || 'Chưa phân loại';
      if (!tasksByCat[cat]) tasksByCat[cat] = [];
      tasksByCat[cat].push(t);
    });

    tasks = [];
    catOrder.forEach(cat => {
      if (tasksByCat[cat]) tasks.push(...tasksByCat[cat]);
    });

    saveData();
    render({ keep: true });
  }

  catReorder = null;
});

// ═══════════════════════════════════════════════
// TASK REORDER — drag to reorder rows (cross-group)
// ═══════════════════════════════════════════════
let reorder = null;

function startReorder(e, taskId) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const grip = e.currentTarget;
  const row = grip.closest('.task-row');
  if (!row) return;

  const srcTask = tasks.find(t => t.id === taskId);
  if (!srcTask) return;

  // Bulk reorder: if this task is selected and multiple are selected
  const isBulk = selectedIds.has(taskId) && selectedIds.size > 1;

  reorder = {
    taskId,
    startY: e.clientY,
    row,
    moved: false,
    targetId: null,
    targetCategory: null,
    insertBefore: true,
    bulk: isBulk,
    bulkIds: isBulk ? [...selectedIds] : [taskId]
  };

  document.body.style.userSelect = 'none';
}

document.addEventListener('mousemove', e => {
  if (!reorder) return;

  if (!reorder.moved) {
    if (Math.abs(e.clientY - reorder.startY) < 5) return;
    reorder.moved = true;

    // Show ghost
    const ghost = document.getElementById('reorder-ghost');
    const t = tasks.find(t => t.id === reorder.taskId);
    if (reorder.bulk) {
      ghost.textContent = `${reorder.bulkIds.length} công việc`;
    } else {
      ghost.textContent = t ? t.name : '';
    }
    ghost.style.display = 'block';

    // Dim source rows + Gantt bars
    reorder.bulkIds.forEach(id => {
      const r = document.querySelector(`.task-row[data-id="${id}"]`);
      if (r) r.classList.add('reorder-dragging');
      const b = document.querySelector(`.task-bar[data-id="${id}"]`);
      if (b) b.classList.add('reorder-dragging');
    });
  }

  // Update ghost position
  const ghost = document.getElementById('reorder-ghost');
  ghost.style.left = (e.clientX + 16) + 'px';
  ghost.style.top = (e.clientY - 14) + 'px';

  // Collect ALL drop zones: group headers + task rows
  const lb = document.getElementById('leftBody');
  const allItems = [...lb.querySelectorAll('.group-row, .task-row')];

  const calBody = document.querySelector('.cal-body');
  const calRect = calBody.getBoundingClientRect();
  const indicator = document.getElementById('reorder-indicator');

  let targetId = null;
  let targetCategory = null;
  let insertBefore = true;
  let indicatorY = null;

  // Find which item the cursor is over
  for (let i = 0; i < allItems.length; i++) {
    const el = allItems[i];
    const r = el.getBoundingClientRect();
    const midY = r.top + r.height / 2;

    if (e.clientY < midY) {
      if (el.classList.contains('group-row')) {
        const cat = el.dataset.category;
        const nextTask = findNextTaskAfterGroupRow(allItems, i);
        if (nextTask) {
          targetId = parseInt(nextTask.dataset.id);
          targetCategory = cat;
          insertBefore = true;
          indicatorY = r.bottom - 1;
        }
      } else {
        targetId = parseInt(el.dataset.id);
        const t = tasks.find(t => t.id === targetId);
        targetCategory = t ? (t.category || '') : null;
        insertBefore = true;
        indicatorY = r.top - 1;
      }
      break;
    }
  }

  // If cursor is below everything → insert after last task
  if (targetId === null && allItems.length > 0) {
    const last = allItems[allItems.length - 1];
    const lastRect = last.getBoundingClientRect();
    if (last.classList.contains('task-row')) {
      targetId = parseInt(last.dataset.id);
      const t = tasks.find(t => t.id === targetId);
      targetCategory = t ? (t.category || '') : null;
      insertBefore = false;
      indicatorY = lastRect.bottom - 1;
    } else {
      targetCategory = last.dataset.category;
      targetId = '__group__';
      insertBefore = false;
      indicatorY = lastRect.bottom - 1;
    }
  }

  // Show indicator
  if (indicatorY !== null) {
    indicator.style.left = calRect.left + 'px';
    indicator.style.width = calRect.width + 'px';
    indicator.style.top = indicatorY + 'px';
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }

  reorder.targetId = targetId;
  reorder.targetCategory = targetCategory;
  reorder.insertBefore = insertBefore;
});

// Helper: find next task-row after a group-row in the items list
function findNextTaskAfterGroupRow(items, groupIdx) {
  for (let j = groupIdx + 1; j < items.length; j++) {
    if (items[j].classList.contains('task-row')) return items[j];
    if (items[j].classList.contains('group-row')) return null; // hit next group
  }
  return null;
}

document.addEventListener('mouseup', e => {
  if (!reorder) return;

  const { taskId, moved, targetId, targetCategory, insertBefore, bulk, bulkIds } = reorder;

  // Cleanup visuals
  document.body.style.userSelect = '';
  document.getElementById('reorder-ghost').style.display = 'none';
  document.getElementById('reorder-indicator').style.display = 'none';
  bulkIds.forEach(id => {
    const r = document.querySelector(`.task-row[data-id="${id}"]`);
    if (r) r.classList.remove('reorder-dragging');
    const b = document.querySelector(`.task-bar[data-id="${id}"]`);
    if (b) b.classList.remove('reorder-dragging');
  });

  if (moved && targetId !== null) {
    if (bulk) {
      // Bulk reorder: extract all selected tasks in their current order
      const movedTasks = [];
      const movedSet = new Set(bulkIds);
      // Collect in current order
      tasks.forEach(t => { if (movedSet.has(t.id)) movedTasks.push(t); });
      // Remove them
      tasks = tasks.filter(t => !movedSet.has(t.id));

      // Update category
      if (groupBy !== 'none' && targetCategory !== null) {
        movedTasks.forEach(t => t.category = targetCategory);
      }

      if (targetId === '__group__') {
        // Append to end
        tasks.push(...movedTasks);
      } else {
        let tgtIdx = tasks.findIndex(t => t.id === parseInt(targetId));
        if (tgtIdx === -1) {
          tasks.push(...movedTasks);
        } else {
          if (!insertBefore) tgtIdx++;
          tasks.splice(tgtIdx, 0, ...movedTasks);
        }
      }

      saveData();
      render({ keep: true });
    } else {
      // Single task reorder (original logic)
      const srcIdx = tasks.findIndex(t => t.id === taskId);
      if (srcIdx === -1) { reorder = null; return; }

      if (groupBy !== 'none' && targetCategory !== null) {
        tasks[srcIdx].category = targetCategory;
      }

      if (targetId === '__group__') {
        const [task] = tasks.splice(srcIdx, 1);
        tasks.push(task);
        saveData();
        render({ keep: true });
      } else if (taskId !== parseInt(targetId)) {
        const [task] = tasks.splice(srcIdx, 1);
        let tgtIdx = tasks.findIndex(t => t.id === parseInt(targetId));
        if (tgtIdx === -1) { tasks.splice(srcIdx, 0, task); reorder = null; return; }
        if (!insertBefore) tgtIdx++;
        tasks.splice(tgtIdx, 0, task);
        saveData();
        render({ keep: true });
      } else {
        saveData();
        render({ keep: true });
      }
    }
  }

  reorder = null;
});
