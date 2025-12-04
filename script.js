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
@@ -388,160 +406,163 @@
clearActiveBox();
el.classList.add('active');
textBoxes.forEach(t => t.el !== el ? t.el.classList.remove('active') : null);
    activeTextBox = el;
    // show toolbar
    textToolbar.style.display = 'block';
}
function clearActiveBox() { textBoxes.forEach(t => t.el.classList.remove('active')); }

/* Draw */
function draw() {
const ctx = preview.getContext('2d');
ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

const slotH = PREVIEW_H / 4;
for (let i = 0; i < 4; i++) {
const y = i * slotH;
if (!photos[i]) {
ctx.fillStyle = '#eee';
ctx.fillRect(0, y, PREVIEW_W, slotH);
} else {
const img = photos[i];
const imgRatio = img.width / img.height;
const slotRatio = PREVIEW_W / slotH;
let sw, sh, sx, sy;
// Cover mode: crop image to fill slot without empty spaces
if (imgRatio > slotRatio) {
// Image is wider than slot: crop height
sh = img.height;
sw = img.height * slotRatio;
sx = (img.width - sw) / 2;
sy = 0;
} else {
// Image is taller than slot: crop width
sw = img.width;
sh = img.width / slotRatio;
sx = 0;
sy = (img.height - sh) / 2;
}
ctx.drawImage(img, sx, sy, sw, sh, 0, y, PREVIEW_W, slotH);
}
}

// frame overlay
if (selectedFrame && selectedFrame.imgObj) {
try { ctx.drawImage(selectedFrame.imgObj, 0, 0, PREVIEW_W, PREVIEW_H); } catch(e) {}
}

// draw text boxes based on DOM positions
const wrapRect = canvasWrap.getBoundingClientRect();
textBoxes.forEach(tb => {
const el = tb.el;
if (!el) return;
const elRect = el.getBoundingClientRect();
const cx = (elRect.left + elRect.width / 2) - wrapRect.left;
const cy = (elRect.top + elRect.height / 2) - wrapRect.top;
const px = (cx / wrapRect.width) * PREVIEW_W;
const py = (cy / wrapRect.height) * PREVIEW_H;
const style = window.getComputedStyle(el);
const fontSizePx = parseFloat(style.fontSize) || 20;
const scale = PREVIEW_W / wrapRect.width;
ctx.save();
ctx.font = `${fontSizePx * scale}px "Playfair Display", serif`;
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.lineWidth = Math.max(2, (fontSizePx * scale) * 0.08);
ctx.strokeStyle = 'rgba(0,0,0,0.35)';
ctx.strokeText(el.innerText, px, py);
ctx.fillStyle = '#fff';
ctx.fillText(el.innerText, px, py);
ctx.restore();
});
}

/* Export HD */
exportBtn.addEventListener('click', () => {
const out = document.createElement('canvas');
out.width = EXPORT_W; out.height = EXPORT_H;
const octx = out.getContext('2d');
octx.fillStyle = '#fff'; octx.fillRect(0, 0, EXPORT_W, EXPORT_H);

const slotH = EXPORT_H / 4;
for (let i = 0; i < 4; i++) {
if (!photos[i]) continue;
const img = photos[i];
const imgRatio = img.width / img.height;
const slotRatio = EXPORT_W / slotH;
let sw, sh, sx, sy;
// Cover mode: crop image to fill slot without empty spaces
if (imgRatio > slotRatio) {
// Image is wider than slot: crop height
sh = img.height;
sw = img.height * slotRatio;
sx = (img.width - sw) / 2;
sy = 0;
} else {
// Image is taller than slot: crop width
sw = img.width;
sh = img.width / slotRatio;
sx = 0;
sy = (img.height - sh) / 2;
}
const dy = i * slotH;
octx.drawImage(img, sx, sy, sw, sh, 0, dy, EXPORT_W, slotH);
}

if (selectedFrame && selectedFrame.imgObj) {
octx.drawImage(selectedFrame.imgObj, 0, 0, EXPORT_W, EXPORT_H);
}

const wrapRect = canvasWrap.getBoundingClientRect();
textBoxes.forEach(tb => {
const el = tb.el;
const elRect = el.getBoundingClientRect();
const cx = (elRect.left + elRect.width / 2) - wrapRect.left;
const cy = (elRect.top + elRect.height / 2) - wrapRect.top;
const px = (cx / wrapRect.width) * EXPORT_W;
const py = (cy / wrapRect.height) * EXPORT_H;
const style = window.getComputedStyle(el);
const fontSizePx = parseFloat(style.fontSize) || 20;
const fontScale = EXPORT_W / wrapRect.width;
octx.save();
octx.font = `${fontSizePx * fontScale}px "Playfair Display", serif`;
octx.textAlign = 'center'; octx.textBaseline = 'middle';
octx.lineWidth = Math.max(2, (fontSizePx * fontScale) * 0.08);
octx.strokeStyle = 'rgba(0,0,0,0.35)';
octx.strokeText(el.innerText, px, py);
octx.fillStyle = '#fff';
octx.fillText(el.innerText, px, py);
octx.restore();
});

const link = document.createElement('a');
link.download = `Anniversary_${new Date().toISOString().slice(0,10)}.png`;
link.href = out.toDataURL('image/png');
link.click();
});

/* Secret frame unlock */
trySecret.addEventListener('click', () => checkSecret(secretInput.value.trim()));
secretInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') checkSecret(secretInput.value.trim()); });

function checkSecret(input) {
if (!input) return;
const normalized = input.toLowerCase();
if (SECRET_WORDS.includes(normalized)) {
if (!frames.find(f => f.id === anniversaryFrame.id)) {
frames.push(anniversaryFrame);
anniversaryFrame.imgObj = new Image();
anniversaryFrame.imgObj.src = anniversaryFrame.src;
buildFramesUI();
}
secretMsg.textContent = 'PLUS ULTRA!!✨';
} else {
secretMsg.textContent = '—❌ Wrong! Hint: name of our future';
}
}

/* initial draw */
draw();
window.addEventListener('resize', () => draw());
}
