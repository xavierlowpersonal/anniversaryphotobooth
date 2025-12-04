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

// If landing page Open Photobooth exists, redirect to photobooth.html (works when hosted)
if (openBoothBtn) {
  openBoothBtn.addEventListener('click', () => {
    // prefer direct navigation to photobooth page
    window.location.href = 'photobooth.html';
  });
}

/* ---------- Photobooth page code (only runs if preview canvas exists) ---------- */
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

  // Sizes
  const PREVIEW_W = preview.width; // 600
  const PREVIEW_H = preview.height; // 1500
  const EXPORT_W = 1080;
  const EXPORT_H = 2700;

  // Frames - ensure these files exist in frames/
  let frames = [
    { id: 'none', src: null, name: 'NONE', color: '#f8bbd0' },
    { id: 'pokemon', src: 'frames/pokemon1.png', name: 'Pokemon' },
    { id: 'shinchan', src: 'frames/shinchan.png', name: 'Shin Chan' },
    { id: 'sanrio1', src: 'frames/sanrio1.png', name: 'Sanrio' }
  ];

  
  let anniversaryFrame = { id: 'mha', src: 'frames/mha.png', name: 'My Hero Academia' };
  const SECRET_WORDS = ['zoey'];

  // preload frames
  frames.forEach(f => { if (f.src) { f.imgObj = new Image(); f.imgObj.src = f.src; } });
  anniversaryFrame.imgObj = new Image(); anniversaryFrame.imgObj.src = anniversaryFrame.src;

  // Photos & state
  let photos = [null, null, null, null];
  let activeSlot = null;
  let selectedFrame = frames[0];
  let textBoxes = []; // objects: {el, text, xPct, yPct}
  let draggingBox = null;
  let dragOffset = { x: 0, y: 0 };

  /* Build frames thumbnails */
  function buildFramesUI() {
    framesRow.innerHTML = '';
    frames.forEach((f) => {
      const thumb = document.createElement('img');
      thumb.className = 'frame-thumb';
      thumb.alt = f.name;
      thumb.src = f.src || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width=\"100%\" height=\"100%\" fill=\"#f3c7d1\"/></svg>';
      thumb.title = f.name;
      thumb.addEventListener('click', () => {
        selectedFrame = f;
        draw();
      });
      framesRow.appendChild(thumb);
    });
  }
  buildFramesUI();

  /* Slot selection */
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      slotButtons.forEach(b => b.classList.remove('active-slot'));
      btn.classList.add('active-slot');
      activeSlot = Number(btn.dataset.slot);
      photoInputs.style.display = 'flex';
    });
  });

  /* Upload */
  upload.addEventListener('change', (e) => {
    if (activeSlot === null) return alert('Select a slot first');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      loadPhoto(ev.target.result, activeSlot);
      upload.value = '';
    };
    reader.readAsDataURL(file);
  });

  /* Camera */
  useCamera.addEventListener('click', async () => {
    if (activeSlot === null) return alert('Select a slot first');

    // Prefer native camera on mobile devices by using a file input with the
    // `capture` attribute. Some Android browsers honor the attribute only when
    // set as an HTML attribute (setAttribute), so we use that for better support.
    const ua = navigator.userAgent || '';
    const isMobile = /Mobi|Android|iP(hone|od|ad)/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isMobile) {
      const input = document.createElement('input');
      input.type = 'file';
      // Some browsers respond better to the attribute form
      input.setAttribute('accept', 'image/*');
      // request rear camera by default on Android, front on iOS-like devices
      input.setAttribute('capture', isAndroid ? 'environment' : 'user');
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) { document.body.removeChild(input); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          loadPhoto(ev.target.result, activeSlot);
          document.body.removeChild(input);
        };
        reader.readAsDataURL(file);
      });
      // Some browsers require the input to be in the document and visible-ish.
      // We still keep it visually hidden but append before clicking.
      input.click();
      return;
    }

    // Non-iOS flow: use getUserMedia modal
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera not supported on this device');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      const v = document.createElement('video');
      v.srcObject = stream; v.play();

      const cameraModal = document.createElement('div');
      cameraModal.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.9); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999;`;
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.5);`;
      v.style.cssText = `display:block; width:100%; height:auto; max-width:90vw; max-height:70vh; object-fit:cover;`;
      videoContainer.appendChild(v);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `display:flex; gap:12px; margin-top:20px;`;
      const captureBtn = document.createElement('button'); captureBtn.innerText = '📸 Capture'; captureBtn.style.cssText = `padding:12px 24px; background:linear-gradient(90deg,var(--gold),#ffd84d); color:#222; border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:16px;`;
      const cancelBtn = document.createElement('button'); cancelBtn.innerText = 'Cancel'; cancelBtn.style.cssText = `padding:12px 24px; background:rgba(255,255,255,0.2); color:#fff; border:2px solid rgba(255,255,255,0.4); border-radius:12px; font-weight:700; cursor:pointer; font-size:16px;`;
      buttonContainer.appendChild(captureBtn); buttonContainer.appendChild(cancelBtn);
      cameraModal.appendChild(videoContainer); cameraModal.appendChild(buttonContainer); document.body.appendChild(cameraModal);

      captureBtn.addEventListener('click', async () => {
        try {
          // Try ImageCapture where available
          const track = stream.getVideoTracks()[0];
          if (window.ImageCapture && track) {
            try {
              const ic = new ImageCapture(track);
              if (ic.takePhoto) {
                const blob = await ic.takePhoto();
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                  const tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; tmp.getContext('2d').drawImage(img,0,0);
                  const dataUrl = tmp.toDataURL('image/png');
                  stream.getTracks().forEach(t => t.stop()); document.body.removeChild(cameraModal);
                  loadPhoto(dataUrl, activeSlot); URL.revokeObjectURL(url);
                };
                img.src = url; return;
              }
            } catch (e) { /* fallback below */ }
          }

          // Fallback capture from video element with heuristics
          const vw = v.videoWidth || 1280; const vh = v.videoHeight || 720; const rect = v.getBoundingClientRect();
          const settings = (stream.getVideoTracks()[0] && stream.getVideoTracks()[0].getSettings) ? stream.getVideoTracks()[0].getSettings() : {};
          const intrinsicLandscape = vw > vh; const displayLandscape = rect.width > rect.height;
          const isFrontCamera = (settings.facingMode === 'user') || (settings.facingMode === 'front');
          const tmp = document.createElement('canvas'); const ctx = tmp.getContext('2d');

          if (displayLandscape && !intrinsicLandscape) {
            tmp.width = vh; tmp.height = vw; ctx.translate(0, vw); ctx.rotate(-Math.PI/2);
            if (isFrontCamera) { ctx.scale(-1,1); ctx.translate(-vw,0); }
            ctx.drawImage(v,0,0,vw,vh);
          } else if (!displayLandscape && intrinsicLandscape) {
            tmp.width = vh; tmp.height = vw; ctx.translate(vh,0); ctx.rotate(Math.PI/2);
            if (isFrontCamera) { ctx.scale(-1,1); ctx.translate(-vw,0); }
            ctx.drawImage(v,0,0,vw,vh);
          } else {
            tmp.width = vw; tmp.height = vh;
            if (isFrontCamera) { ctx.scale(-1,1); ctx.drawImage(v,-vw,0,vw,vh); } else { ctx.drawImage(v,0,0,vw,vh); }
          }

          const dataUrl = tmp.toDataURL('image/png'); stream.getTracks().forEach(t => t.stop()); document.body.removeChild(cameraModal); loadPhoto(dataUrl, activeSlot);
        } catch (err) {
          stream.getTracks().forEach(t => t.stop()); document.body.removeChild(cameraModal); alert('Failed to capture photo.');
        }
      });

      cancelBtn.addEventListener('click', () => { stream.getTracks().forEach(t => t.stop()); document.body.removeChild(cameraModal); });
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('Camera permission denied. Please allow camera access in settings.');
      else if (err.name === 'NotFoundError') alert('No camera device found on this device.');
      else alert('Camera not available or permission denied');
    }
  });

  function loadPhoto(dataURL, slotIndex) {
    const img = new Image();
    img.onload = () => {
      photos[slotIndex] = img;
      draw();
    };
    img.src = dataURL;
  }

  /* Add editable text box */
  addTextBtn.addEventListener('click', () => {
    const box = document.createElement('div');
    box.className = 'text-box';
    box.contentEditable = 'true';
    box.innerText = 'Your text';
    
    // Set box position and append to DOM first
    const wrapRect = canvasWrap.getBoundingClientRect();
    box.style.position = 'absolute';
    box.style.left = (wrapRect.width / 2 - 40) + 'px';  // Offset by half width for center
    box.style.top = (wrapRect.height / 2 - 15) + 'px';  // Offset by half height for center

    // delete button
    const del = document.createElement('div');
    del.className = 'del-btn';
    del.innerText = '✕';
    del.title = 'Delete text';
    del.style.pointerEvents = 'auto';  // Ensure delete button captures clicks
    box.appendChild(del);

    canvasWrap.appendChild(box);

    // Compute normalized percentages AFTER DOM insertion
    const boxRect = box.getBoundingClientRect();
    const xPct = (boxRect.left - wrapRect.left) / wrapRect.width;
    const yPct = (boxRect.top - wrapRect.top) / wrapRect.height;
    const tb = { el: box, text: box.innerText, xPct, yPct };

    textBoxes.push(tb);
    setActiveBox(box);
    box.focus();
    draw();

    del.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();  // Prevent contentEditable from triggering
      canvasWrap.removeChild(box);
      textBoxes = textBoxes.filter(t => t.el !== box);
      draw();
    });

    box.addEventListener('input', () => {
      const t = textBoxes.find(x => x.el === box);
      if (t) { t.text = box.innerText; draw(); }
    });

    // enable touch-based dragging (disable default touch actions)
    box.style.touchAction = 'none';
    // pointerdown for dragging
    box.addEventListener('pointerdown', (e) => {
      // Don't drag if clicking on delete button
      if (e.target && e.target.closest && e.target.closest('.del-btn')) return;
      e.preventDefault();
      draggingBox = box;
      const r = box.getBoundingClientRect();
      dragOffset.x = e.clientX - r.left;
      dragOffset.y = e.clientY - r.top;
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      setActiveBox(box);
    });
  });

  // dragging
  document.addEventListener('pointermove', (e) => {
    if (!draggingBox) return;
    const rect = canvasWrap.getBoundingClientRect();
    let nx = e.clientX - rect.left - dragOffset.x;
    let ny = e.clientY - rect.top - dragOffset.y;
    nx = Math.max(0, Math.min(rect.width, nx));
    ny = Math.max(0, Math.min(rect.height, ny));
    draggingBox.style.left = nx + 'px';
    draggingBox.style.top = ny + 'px';
    // update model
    const tb = textBoxes.find(t => t.el === draggingBox);
    if (tb) { tb.xPct = nx / rect.width; tb.yPct = ny / rect.height; }
    draw();
  });
  document.addEventListener('pointerup', () => { if (draggingBox) draggingBox = null; });

  // clearing selection on background click
  canvasWrap.addEventListener('pointerdown', (e) => {
    if (e.target === canvasWrap) { clearActiveBox(); }
  });

  function setActiveBox(el) {
    clearActiveBox();
    el.classList.add('active');
    textBoxes.forEach(t => t.el !== el ? t.el.classList.remove('active') : null);
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
