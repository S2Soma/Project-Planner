// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
loadData();
loadCollapsedTasks();
_doRender(); // sync first render
initPanel();
initColResize();
initTlResizer();
initTlPan();
applyColVisibility();
updateViewUI();
initProposeUI();
initContextMenu();
initKeyboardNav();
renderPicList();
renderYearMenu();
