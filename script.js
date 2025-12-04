/* Shared script for index.html and photobooth.html
   Canvas-only implementation (no external libs)
*/

/* ---------- Landing modal & navigation ---------- */
const openLove = document.getElementById('openLove');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const openBoothBtn = document.getElementById('openBooth');

if (openLove && modal && closeModal) {
  openLove.addEventListener('click', () => modal.classList.add('show'));
  closeModal.addEventListener('click', () => modal.classList.remove('show'));
}

if (openBoothBtn) {
  openBoothBtn.addEventListener('click', () => window.location.href = 'photobooth.html');
}

/* ---------- Photobooth page code ---------- */
if (document.getElementById('preview')) {
  // Elements
  const framesRow = document.getElementById('framesRow');
  const upload = document.getElementById('upload');
  const useCamera = document.getElementById('useCamera');
  const exportBtn = document.getElementById('exportBtn');
  const canvasWrap = document.getElementById('canvasWrap');
  const preview = document.getElementById('preview');
  const addTextBtn = document.getElementById('addText');
  const slotButtons = document.querySelectorAll('.slot-btn');
  const photoInputs = document.getElementById('photoInputs');
  const secretInput = document.getElementById('secretInput');
  const trySecret = document.getElementById('trySecret');
  const secretMsg = document.getElementById('secretMsg');

  // Canvas sizes
  const PREVIEW_W = preview.width;
  const PREVIEW_H = preview.height;
  const EXPORT_W = 1080;
  const EXPORT_H = 2700;

  // Frames
  let frames = [
    { id: 'none', src: null, name: 'NONE', color: '#f8bbd0' },
    { id: 'pokemon', src: 'frames/pokemon1.png', name: 'Pokemon' },
    { id: 'shinchan', src: 'frames/shinchan.png', name: 'Shin Chan' },
    { id: 'sanrio1', src: 'frames/sanrio1.png', name: 'Sanrio' }
  ];
  let anniversaryFrame = { id: 'mha', src: 'frames/mha.png', name: 'My Hero Academia' };
  const SECRET_WORDS = ['zoey'];

  frames.forEach(f => { if (f.src) f.imgObj = new Image(); f.imgObj && (f.imgObj.src = f.src); });
  anniversaryFrame.imgObj = new Image(); anniversaryFrame.imgObj.src = anniversaryFrame.src;

  // State
  let photos = [null, null, null, null];
  let activeSlot = null;
  let selectedFrame = frames[0];
  let textBoxes = [];
  let activeTextBox = null;
  let draggingBox = null;
  let dragOffset = { x: 0, y: 0 };

  // Text toolbar
  const textToolbar = document.createElement('div');
  textToolbar.className = 'text-toolbar';
  textToolbar.style.display = 'none';
  textToolbar.innerHTML = '<button class="toolbar-del">✕</button>';
  canvasWrap.appendChild(textToolbar);
  const toolbarDel = textToolbar.querySelector('.toolbar-del');
  toolbarDel.addEventListener('click', e => {
    e.stopPropagation();
    if (!activeTextBox) return;
    canvasWrap.removeChild(activeTextBox);
    textBoxes = textBoxes.filter(t => t.el !== activeTextBox);
    activeTextBox = null;
    textToolbar.style.display = 'none';
    draw();
  });

  /* ---------- Frames UI ---------- */
  function buildFramesUI() {
    framesRow.innerHTML = '';
    frames.forEach(f => {
      const thumb = document.createElement('img');
      thumb.className = 'frame-thumb';
      thumb.alt = f.name;
      thumb.src = f.src || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#f3c7d1"/></svg>';
      thumb.title = f.name;
      thumb.addEventListener('click', () => { selectedFrame = f; draw(); });
      framesRow.appendChild(thumb);
    });
  }
  buildFramesUI();

  /* ---------- Slot selection ---------- */
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      slotButtons.forEach(b => b.classList.remove('active-slot'));
      btn.classList.add('active-slot');
      activeSlot = Number(btn.dataset.slot);
      photoInputs.style.display = 'flex';
    });
  });

  /* ---------- Upload ---------- */
  upload.addEventListener('change', e => {
    if (activeSlot === null) return alert('Select a slot first');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { loadPhoto(ev.target.result, activeSlot); upload.value = ''; };
    reader.readAsDataURL(file);
  });

  /* ---------- Camera (iOS + Android) ---------- */
 useCamera.addEventListener('click', async () => {
  if (activeSlot === null) return alert('Select a slot first');

  const ua = navigator.userAgent || '';
  const isiOS = /iP(hone|od|ad)/.test(ua);
  const isAndroid = /Android/.test(ua);

  // Check if getUserMedia is supported
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    let constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };

    if (isiOS || isAndroid) {
      // Try front camera
      constraints.video.facingMode = { exact: 'user' };
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // fallback if exact facingMode fails
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err2) {
        return alert('Camera not available or permission denied.');
      }
    }

    const v = document.createElement('video');
    v.srcObject = stream;
    v.playsInline = true;
    v.autoplay = true;
    v.muted = true;

    const cameraModal = document.createElement('div');
    cameraModal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.9);
      display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999;
    `;

    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = 'position: relative; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.5);';
    v.style.cssText = 'display:block; width:100%; max-width:90vw; max-height:70vh; object-fit:cover;';
    videoContainer.appendChild(v);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display:flex; gap:12px; margin-top:20px;';
    const captureBtn = document.createElement('button');
    captureBtn.innerText = '📸 Capture';
    captureBtn.style.cssText = 'padding:12px 24px; background:linear-gradient(90deg,var(--gold),#ffd84d); color:#222; border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:16px;';
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.cssText = 'padding:12px 24px; background:rgba(255,255,255,0.2); color:#fff; border:2px solid rgba(255,255,255,0.4); border-radius:12px; font-weight:700; cursor:pointer; font-size:16px;';
    buttonContainer.appendChild(captureBtn);
    buttonContainer.appendChild(cancelBtn);

    cameraModal.appendChild(videoContainer);
    cameraModal.appendChild(buttonContainer);
    document.body.appendChild(cameraModal);

    // Capture logic
    captureBtn.addEventListener('click', async () => {
      try {
        const track = stream.getVideoTracks()[0];
        const tmp = document.createElement('canvas');
        const ctx = tmp.getContext('2d');
        const vw = v.videoWidth;
        const vh = v.videoHeight;

        tmp.width = vw;
        tmp.height = vh;

        // Mirror for front camera
        const settings = track.getSettings ? track.getSettings() : {};
        const isFront = settings.facingMode === 'user' || settings.facingMode === 'front';
        if (isFront) {
          ctx.translate(vw, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(v, 0, 0, vw, vh);
        const dataUrl = tmp.toDataURL('image/png');

        stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(cameraModal);
        loadPhoto(dataUrl, activeSlot);
      } catch (err) {
        stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(cameraModal);
        alert('Failed to capture photo.');
      }
    });

    cancelBtn.addEventListener('click', () => {
      stream.getTracks().forEach(t => t.stop());
      document.body.removeChild(cameraModal);
    });

  } else {
    // fallback for devices without getUserMedia
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*;capture=camera';
    input.style.cssText = 'position:fixed; left:0; top:0; width:1px; height:1px; opacity:0.01; z-index:999999;';
    document.body.appendChild(input);

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => loadPhoto(ev.target.result, activeSlot);
      reader.readAsDataURL(file);
    });

    input.click();
    setTimeout(() => { document.body.removeChild(input); }, 10000);
  }
});


  /* ---------- Load Photo ---------- */
  function loadPhoto(dataURL, slotIndex) {
    const img = new Image();
    img.onload = () => { photos[slotIndex] = img; draw(); };
    img.src = dataURL;
  }

  /* ---------- Text boxes ---------- */
  function placeCaretAtEnd(el) {
    el.focus();
    if (window.getSelection && document.createRange) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  addTextBtn.addEventListener('click', () => {
    const DEFAULT_TEXT = 'Your text';
    const box = document.createElement('div');
    box.className = 'text-box placeholder';
    box.contentEditable = 'true';
    box.innerText = DEFAULT_TEXT;

    const wrapRect = canvasWrap.getBoundingClientRect();
    box.style.position = 'absolute';
    box.style.left = wrapRect.width / 2 - 40 + 'px';
    box.style.top = wrapRect.height / 2 - 15 + 'px';

    const del = document.createElement('div');
    del.className = 'del-btn';
    del.innerText = '✕';
    del.title = 'Delete text';
    del.setAttribute('contenteditable', 'false');
    del.style.pointerEvents = 'auto';
    del.addEventListener('mousedown', ev => ev.preventDefault());
    del.addEventListener('click', ev => {
      ev.stopPropagation();
      canvasWrap.removeChild(box);
      textBoxes = textBoxes.filter(t => t.el !== box);
      draw();
    });

    box.appendChild(del);
    canvasWrap.appendChild(box);

    const boxRect = box.getBoundingClientRect();
    const xPct = (boxRect.left - wrapRect.left) / wrapRect.width;
    const yPct = (boxRect.top - wrapRect.top) / wrapRect.height;
    textBoxes.push({ el: box, text: '', xPct, yPct });
    setActiveBox(box);

    box.addEventListener('focus', () => {
      if (box.classList.contains('placeholder')) { box.classList.remove('placeholder'); box.innerText = ''; }
      placeCaretAtEnd(box);
    });
    box.addEventListener('blur', () => {
      if (!box.innerText.trim()) { box.innerText = DEFAULT_TEXT; box.classList.add('placeholder'); }
    });
    box.addEventListener('input', () => {
      const tb = textBoxes.find(x => x.el === box);
      if (tb) tb.text = box.classList.contains('placeholder') ? '' : box.innerText;
      draw();
    });

    box.style.touchAction = 'none';
    box.addEventListener('pointerdown', e => {
      if (e.target.closest('.del-btn')) return;
      box.dataset.dragPending = 'true';
      box.dataset.startX = e.clientX;
      box.dataset.startY = e.clientY;
      setActiveBox(box);
    });

    placeCaretAtEnd(box);
    draw();
  });

  document.addEventListener('pointermove', e => {
    if (draggingBox) {
      const rect = canvasWrap.getBoundingClientRect();
      let nx = e.clientX - rect.left - dragOffset.x;
      let ny = e.clientY - rect.top - dragOffset.y;
      nx = Math.max(0, Math.min(rect.width, nx));
      ny = Math.max(0, Math.min(rect.height, ny));
      draggingBox.style.left = nx + 'px';
      draggingBox.style.top = ny + 'px';
      const tb = textBoxes.find(t => t.el === draggingBox);
      if (tb) { tb.xPct = nx / rect.width; tb.yPct = ny / rect.height; }
      draw();
      return;
    }
    const targetBox = e.target.closest?.('.text-box');
    if (targetBox && targetBox.dataset.dragPending === 'true') {
      const sx = parseFloat(targetBox.dataset.startX || '0');
      const sy = parseFloat(targetBox.dataset.startY || '0');
      const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (moved > 6) {
        draggingBox = targetBox;
        const r = draggingBox.getBoundingClientRect();
        dragOffset.x = e.clientX - r.left;
        dragOffset.y = e.clientY - r.top;
        draggingBox.setPointerCapture?.(e.pointerId);
      }
    }
  });

  document.addEventListener('pointerup', () => draggingBox = null);
  canvasWrap.addEventListener('pointerdown', e => { if (e.target === canvasWrap) clearActiveBox(); });
  document.addEventListener('pointerup', () => {
    document.querySelectorAll('.text-box').forEach(b => delete b.dataset.dragPending);
  });

  function setActiveBox(el) {
    clearActiveBox();
    el.classList.add('active');
    activeTextBox = el;
    textToolbar.style.display = 'block';
  }
  function clearActiveBox() {
    textBoxes.forEach(t => t.el.classList.remove('active'));
    activeTextBox = null;
    textToolbar.style.display = 'none';
  }

  /* ---------- Draw function ---------- */
  function draw() {
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    const slotH = PREVIEW_H / 4;
    photos.forEach((img, i) => {
      const y = i * slotH;
      if (!img) {
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, y, PREVIEW_W, slotH);
      } else {
        const imgRatio = img.width / img.height;
        const slotRatio = PREVIEW_W / slotH;
        let sw, sh, sx, sy;
        if (imgRatio > slotRatio) { sh = img.height; sw = sh * slotRatio; sx = (img.width - sw)/2; sy = 0; }
        else { sw = img.width; sh = sw / slotRatio; sx = 0; sy = (img.height - sh)/2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, y, PREVIEW_W, slotH);
      }
    });

    if (selectedFrame?.imgObj) {
      try { ctx.drawImage(selectedFrame.imgObj, 0, 0, PREVIEW_W, PREVIEW_H); } catch {}
    }

    const wrapRect = canvasWrap.getBoundingClientRect();
    textBoxes.forEach(tb => {
      const el = tb.el;
      if (!el) return;
      const elRect = el.getBoundingClientRect();
      const px = ((elRect.left + elRect.width/2) - wrapRect.left) / wrapRect.width * PREVIEW_W;
      const py = ((elRect.top + elRect.height/2) - wrapRect.top) / wrapRect.height * PREVIEW_H;
      const style = window.getComputedStyle(el);
      const fontSizePx = parseFloat(style.fontSize) || 20;
      const scale = PREVIEW_W / wrapRect.width;
      ctx.save();
      ctx.font = `${fontSizePx*scale}px "Playfair Display", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, fontSizePx*scale*0.08);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(el.innerText, px, py);
      ctx.fillStyle = '#fff';
      ctx.fillText(el.innerText, px, py);
      ctx.restore();
    });
  }

  /* ---------- Export HD ---------- */
  exportBtn.addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = EXPORT_W;
    out.height = EXPORT_H;
    const octx = out.getContext('2d');
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    const slotH = EXPORT_H / 4;
    photos.forEach((img, i) => {
      if (!img) return;
      const imgRatio = img.width / img.height;
      const slotRatio = EXPORT_W / slotH;
      let sw, sh, sx, sy;
      if (imgRatio > slotRatio) { sh = img.height; sw = sh*slotRatio; sx=(img.width-sw)/2; sy=0; }
      else { sw = img.width; sh = sw/slotRatio; sx=0; sy=(img.height-sh)/2; }
      octx.drawImage(img, sx, sy, sw, sh, 0, i*slotH, EXPORT_W, slotH);
    });

    if (selectedFrame?.imgObj) octx.drawImage(selectedFrame.imgObj, 0, 0, EXPORT_W, EXPORT_H);

    const wrapRect = canvasWrap.getBoundingClientRect();
    textBoxes.forEach(tb => {
      const el = tb.el;
      const elRect = el.getBoundingClientRect();
      const px = ((elRect.left + elRect.width/2) - wrapRect.left)/wrapRect.width*EXPORT_W;
      const py = ((elRect.top + elRect.height/2) - wrapRect.top)/wrapRect.height*EXPORT_H;
      const style = window.getComputedStyle(el);
      const fontSizePx = parseFloat(style.fontSize) || 20;
      const fontScale = EXPORT_W / wrapRect.width;
      octx.save();
      octx.font = `${fontSizePx*fontScale}px "Playfair Display", serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.lineWidth = Math.max(2, fontSizePx*fontScale*0.08);
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

  /* ---------- Secret frame unlock ---------- */
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

  trySecret.addEventListener('click', () => checkSecret(secretInput.value.trim()));
  secretInput.addEventListener('keyup', e => { if (e.key === 'Enter') checkSecret(secretInput.value.trim()); });

  /* ---------- Initial draw ---------- */
  draw();
  window.addEventListener('resize', draw);
}

