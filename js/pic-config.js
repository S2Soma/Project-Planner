// ═══════════════════════════════════════════════
// PIC CONFIG PANEL
// ═══════════════════════════════════════════════
function togglePicPanel() {
  document.getElementById('picPanel').classList.toggle('open');
}

function renderPicList() {
  const body = document.getElementById('picPanelBody');
  if (!body) return;
  if (!picList.length) {
    body.innerHTML = '<div class="pic-empty">Chưa có PIC nào</div>';
    return;
  }
  body.innerHTML = picList.map((p, i) =>
    `<div class="pic-item">
      <input type="color" class="pic-swatch" value="${p.color}"
        onchange="updatePicColor(${i}, this.value)">
      <input class="pic-name-input" value="${esc(p.name)}"
        onblur="updatePicName(${i}, this.value)"
        onkeydown="if(event.key==='Enter'){this.blur();event.stopPropagation();}">
      <button class="pic-del" onclick="removePic(${i})" title="Xóa">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`
  ).join('');
}

function addPic() {
  const nameEl = document.getElementById('picNewName');
  const colorEl = document.getElementById('picNewColor');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  if (picList.some(p => p.name === name)) { nameEl.focus(); return; }
  picList.push({ name, color: colorEl.value });
  savePics();
  nameEl.value = '';
  renderPicList();
  render({ keep: true });
}

function removePic(idx) {
  picList.splice(idx, 1);
  savePics();
  syncTaskColors();
  renderPicList();
  render({ keep: true });
}

function updatePicColor(idx, color) {
  picList[idx].color = color;
  savePics();
  syncTaskColors();
  render({ keep: true });
}

function updatePicName(idx, newName) {
  newName = newName.trim();
  if (!newName) return;
  const oldName = picList[idx].name;
  if (newName === oldName) return;
  // Rename in all tasks
  tasks.forEach(t => { if (t.owner === oldName) t.owner = newName; });
  picList[idx].name = newName;
  savePics();
  saveData();
  render({ keep: true });
}

// Sync all task colors based on current picList
function syncTaskColors() {
  tasks.forEach(t => { t.color = getPicColor(t.owner); });
  saveData();
}
