let activeSlot = null;
let selectedFrame = frames[0];
let textBoxes = []; // objects: {el, text, xPct, yPct}
  let activeTextBox = null;
let draggingBox = null;
let dragOffset = { x: 0, y: 0 };

  // Create a floating toolbar for text actions (delete) so it's always visible
  const textToolbar = document.createElement('div');
  textToolbar.className = 'text-toolbar';
  textToolbar.style.display = 'none';
  textToolbar.innerHTML = '<button class="toolbar-del">✕</button>';
  canvasWrap.appendChild(textToolbar);
  const toolbarDel = textToolbar.querySelector('.toolbar-del');
  toolbarDel.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeTextBox) return;
    try { canvasWrap.removeChild(activeTextBox); } catch (err) {}
    textBoxes = textBoxes.filter(t => t.el !== activeTextBox);
    activeTextBox = null;
    textToolbar.style.display = 'none';
    draw();
  });

/* Build frames thumbnails */
function buildFramesUI() {
framesRow.innerHTML = '';
@@ -388,6 +406,9 @@ if (document.getElementById('preview')) {
clearActiveBox();
el.classList.add('active');
textBoxes.forEach(t => t.el !== el ? t.el.classList.remove('active') : null);
    activeTextBox = el;
    // show toolbar
    textToolbar.style.display = 'block';
}
function clearActiveBox() { textBoxes.forEach(t => t.el.classList.remove('active')); }
