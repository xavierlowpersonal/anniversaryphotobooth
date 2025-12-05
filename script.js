/* ---------- DOM READY ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* ----- Modal & Navigation ----- */
  const openLove = document.getElementById('openLove');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const openBoothBtn = document.getElementById('openBooth');

  if (openLove && modal && closeModal) {
    openLove.addEventListener('click', () => modal.classList.add('show'));
    closeModal.addEventListener('click', () => modal.classList.remove('show'));
  }

  if (openBoothBtn) {
    openBoothBtn.addEventListener('click', () => {
      window.location.href = 'photobooth.html';
    });
  }

  /* ---------- Photobooth Page Code ---------- */
  const preview = document.getElementById('preview');
  if (!preview) return; // exit if photobooth page not loaded

  const framesRow = document.getElementById('framesRow');
  const upload = document.getElementById('upload');
  const useCamera = document.getElementById('useCamera');
  const exportBtn = document.getElementById('exportBtn');
  const canvasWrap = document.getElementById('canvasWrap');
  const addTextBtn = document.getElementById('addText');
  const slotButtons = document.querySelectorAll('.slot-btn');
  const photoInputs = document.getElementById('photoInputs');
  const secretInput = document.getElementById('secretInput');
  const trySecret = document.getElementById('trySecret');
  const secretMsg = document.getElementById('secretMsg');

  /* ---------- Variables ---------- */
  const PREVIEW_W = preview.width;
  const PREVIEW_H = preview.height;
  const EXPORT_W = 1080;
  const EXPORT_H = 2700;

  let frames = [
    { id: 'none', src: null, name: 'NONE', color: '#f8bbd0' },
    { id: 'pokemon', src: 'frames/pokemon1.png', name: 'Pokemon' },
    { id: 'shinchan', src: 'frames/shinchan.png', name: 'Shin Chan' },
    { id: 'sanrio1', src: 'frames/sanrio1.png', name: 'Sanrio' }
  ];

  let anniversaryFrame = { id: 'mha', src: 'frames/mha.png', name: 'My Hero Academia' };
  const SECRET_WORDS = ['zoey'];

  frames.forEach(f => { if (f.src) { f.imgObj = new Image(); f.imgObj.src = f.src; } });
  anniversaryFrame.imgObj = new Image(); anniversaryFrame.imgObj.src = anniversaryFrame.src;

  let photos = [null, null, null, null];
  let activeSlot = null;
  let selectedFrame = frames[0];
  let textBoxes = [];
  let activeTextBox = null;
  let draggingBox = null;
  let dragOffset = { x: 0, y: 0 };

  /* ---------- Text Boxes (Draggable + Deletable, Pointer Events) ---------- */

  function createTextBox() {
    if (!canvasWrap) return;

    const box = document.createElement('div');
    box.className = 'text-box placeholder';
    box.contentEditable = 'true';
    box.innerText = 'Your text';
    box.style.position = 'absolute';
    box.style.touchAction = 'none'; // prevent scroll while dragging

    const wrapRect = canvasWrap.getBoundingClientRect();
    box.style.left = (wrapRect.width / 2 - 40) + 'px';
    box.style.top = (wrapRect.height / 2 - 15) + 'px';

    // Small delete "×" button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '×';
    delBtn.className = 'text-box-delete';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '-8px';
    delBtn.style.right = '-8px';
    delBtn.style.width = '20px';
    delBtn.style.height = '20px';
    delBtn.style.borderRadius = '50%';
    delBtn.style.border = 'none';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontSize = '14px';
    delBtn.style.lineHeight = '20px';
    delBtn.style.padding = '0';

    // Delete logic
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (canvasWrap.contains(box)) {
        canvasWrap.removeChild(box);
      }
      textBoxes = textBoxes.filter(tb => tb.el !== box);
    });

    box.appendChild(delBtn);
    canvasWrap.appendChild(box);
    textBoxes.push({ el: box });
    box.focus();

    // Clear placeholder on first focus
    box.addEventListener('focus', () => {
      if (box.classList.contains('placeholder')) {
        box.innerText = '';
        box.classList.remove('placeholder');
        box.appendChild(delBtn); // re-attach delete button after innerText wipe
      }
    });

    // ----- Drag with pointer events -----
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragWrapRect = null;

    box.addEventListener('pointerdown', (e) => {
      if (e.target === delBtn) return; // don't drag when clicking delete
      isDragging = true;
      activeTextBox = box;
      dragWrapRect = canvasWrap.getBoundingClientRect();

      const boxRect = box.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = boxRect.left - dragWrapRect.left;
      startTop = boxRect.top - dragWrapRect.top;

      box.setPointerCapture(e.pointerId);
    });

    box.addEventListener('pointermove', (e) => {
      if (!isDragging || !dragWrapRect) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let x = startLeft + dx;
      let y = startTop + dy;

      // Clamp inside canvasWrap
      const maxX = dragWrapRect.width - box.offsetWidth;
      const maxY = dragWrapRect.height - box.offsetHeight;

      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));

      box.style.left = x + 'px';
      box.style.top = y + 'px';
    });

    box.addEventListener('pointerup', (e) => {
      isDragging = false;
      dragWrapRect = null;
      try {
        box.releasePointerCapture(e.pointerId);
      } catch (_) {}
    });

    box.addEventListener('pointercancel', (e) => {
      isDragging = false;
      dragWrapRect = null;
      try {
        box.releasePointerCapture(e.pointerId);
      } catch (_) {}
    });

    return box;
  }

  /* Hook up Add Text button */
  if (addTextBtn && canvasWrap) {
    addTextBtn.addEventListener('click', () => {
      createTextBox();
    });
  }

  /* ---------- Build Frames UI ---------- */
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

  /* ---------- Slot Selection ---------- */
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      slotButtons.forEach(b => b.classList.remove('active-slot'));
      btn.classList.add('active-slot');
      activeSlot = Number(btn.dataset.slot);
      if (photoInputs) photoInputs.style.display = 'flex';
    });
  });

  /* ---------- File Upload ---------- */
  if (upload) {
    upload.addEventListener('change', (e) => {
      if (activeSlot === null) return alert('Select a slot first');
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { loadPhoto(ev.target.result, activeSlot); upload.value = ''; };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Use Native Camera ---------- */
  if (useCamera) {
    useCamera.addEventListener('click', () => {
      if (activeSlot === null) return alert('Select a slot first');

      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('accept', 'image/*;capture=camera');
      input.setAttribute('capture', 'environment'); // rear camera by default
      input.style.cssText = 'position:fixed; left:0; top:0; width:1px; height:1px; opacity:0.01; z-index:9999;';
      document.body.appendChild(input);

      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          loadPhoto(ev.target.result, activeSlot);
          document.body.removeChild(input);
        };
        reader.readAsDataURL(file);
      });

      input.click();
    });
  }

  function loadPhoto(dataURL, slotIndex) {
    const img = new Image();
    img.onload = () => { photos[slotIndex] = img; draw(); };
    img.src = dataURL;
  }

  /* ---------- Text Boxes (Draggable + Deletable) ---------- */
  if (addTextBtn && canvasWrap) {
    addTextBtn.addEventListener('click', () => {
      const box = document.createElement('div');
      box.className = 'text-box placeholder';
      box.contentEditable = 'true';
      box.innerText = 'Your text';
      box.style.position = 'absolute';

      const wrapRect = canvasWrap.getBoundingClientRect();
      box.style.left = (wrapRect.width / 2 - 40) + 'px';
      box.style.top = (wrapRect.height / 2 - 15) + 'px';

      // Small delete "x" button inside the text box
      const delBtn = document.createElement('button');
      delBtn.innerHTML = '×';
      delBtn.className = 'text-box-delete';
      delBtn.style.position = 'absolute';
      delBtn.style.top = '-8px';
      delBtn.style.right = '-8px';
      delBtn.style.width = '20px';
      delBtn.style.height = '20px';
      delBtn.style.borderRadius = '50%';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.style.fontSize = '14px';
      delBtn.style.lineHeight = '20px';
      delBtn.style.padding = '0';

      // Delete logic
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        canvasWrap.removeChild(box);
        textBoxes = textBoxes.filter(tb => tb.el !== box);
      });

      box.appendChild(delBtn);

      canvasWrap.appendChild(box);
      textBoxes.push({ el: box });

      box.focus();

      // Clear placeholder on first focus
      box.addEventListener('focus', () => {
        if (box.classList.contains('placeholder')) {
          box.innerText = '';
          box.classList.remove('placeholder');
          box.appendChild(delBtn); // re-attach delete button after innerText change
        }
      });

      // Start drag (mouse)
      box.addEventListener('mousedown', (e) => {
        if (e.target === delBtn) return; // don't drag when clicking delete
        startDrag(e, box);
      });

      // Start drag (touch)
      box.addEventListener('touchstart', (e) => {
        if (e.target === delBtn) return;
        const touch = e.touches[0];
        startDrag(touch, box);
      }, { passive: false });
    });
  }

  /* ---------- Secret Frame ---------- */
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
  trySecret?.addEventListener('click', () => checkSecret(secretInput.value.trim()));
  secretInput?.addEventListener('keyup', (e) => { if (e.key === 'Enter') checkSecret(secretInput.value.trim()); });

  /* ---------- Draw Canvas ---------- */
  function draw() {
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    const slotH = PREVIEW_H / 4;
    for (let i = 0; i < 4; i++) {
      const y = i * slotH;
      if (!photos[i]) ctx.fillStyle = '#eee', ctx.fillRect(0, y, PREVIEW_W, slotH);
      else {
        const img = photos[i];
        const imgRatio = img.width / img.height;
        const slotRatio = PREVIEW_W / slotH;
        let sw, sh, sx, sy;
        if (imgRatio > slotRatio) { sh = img.height; sw = img.height * slotRatio; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = img.width / slotRatio; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, y, PREVIEW_W, slotH);
      }
    }
    if (selectedFrame?.imgObj) ctx.drawImage(selectedFrame.imgObj, 0, 0, PREVIEW_W, PREVIEW_H);
  }

    /* ---------- Export HD (Photos + Frame + Text) ---------- */
  if (exportBtn) {
    console.log('Export button found, attaching handler');

    exportBtn.addEventListener('click', () => {
      console.log('Export clicked');

      // Create HD canvas
      const out = document.createElement('canvas');
      out.width = EXPORT_W;      // 1080
      out.height = EXPORT_H;     // 2700
      const octx = out.getContext('2d');

      // Background
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, EXPORT_W, EXPORT_H);

      // ---- Draw the 4 photo slots in HD ----
      const slotH = EXPORT_H / 4;
      for (let i = 0; i < 4; i++) {
        if (!photos[i]) continue; // skip empty slots

        const img = photos[i];
        const imgRatio = img.width / img.height;
        const slotRatio = EXPORT_W / slotH;

        let sw, sh, sx, sy;

        // "Cover" mode: fill the slot and crop
        if (imgRatio > slotRatio) {
          // Image is wider than slot: crop sides
          sh = img.height;
          sw = img.height * slotRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          // Image is taller than slot: crop top/bottom
          sw = img.width;
          sh = img.width / slotRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        const dy = i * slotH;
        octx.drawImage(img, sx, sy, sw, sh, 0, dy, EXPORT_W, slotH);
      }

      // ---- Draw selected frame on top ----
      if (selectedFrame && selectedFrame.imgObj) {
        octx.drawImage(selectedFrame.imgObj, 0, 0, EXPORT_W, EXPORT_H);
      }

      // ---- Draw HTML text boxes onto canvas ----
      if (canvasWrap && textBoxes && textBoxes.length > 0) {
        const wrapRect = canvasWrap.getBoundingClientRect();

        textBoxes.forEach(tb => {
          const el = tb.el;
          if (!el) return;

          const elRect = el.getBoundingClientRect();

          // Center of the text box relative to wrap
          const cx = (elRect.left + elRect.width / 2) - wrapRect.left;
          const cy = (elRect.top + elRect.height / 2) - wrapRect.top;

          // Convert to export canvas coordinates
          const px = (cx / wrapRect.width) * EXPORT_W;
          const py = (cy / wrapRect.height) * EXPORT_H;

          const style = window.getComputedStyle(el);
          const fontSizePx = parseFloat(style.fontSize) || 20;
          const fontScale = EXPORT_W / wrapRect.width;
          const finalFontSize = fontSizePx * fontScale;

          const text = el.innerText.trim();
          if (!text) return;

          octx.save();
          octx.font = `${finalFontSize}px "Playfair Display", serif`;
          octx.textAlign = 'center';
          octx.textBaseline = 'middle';

          // Outline (shadow-ish)
          octx.lineWidth = Math.max(2, finalFontSize * 0.08);
          octx.strokeStyle = 'rgba(0,0,0,0.35)';
          octx.strokeText(text, px, py);

          // Fill
          octx.fillStyle = '#fff';
          octx.fillText(text, px, py);
          octx.restore();
        });
      }

      // ---- Trigger download ----
      const link = document.createElement('a');
      link.download = `Anniversary_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = out.toDataURL('image/png');

      // More robust: add to DOM, click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  } else {
    console.log('Export button NOT found');
  }

  
  draw();
  window.addEventListener('resize', draw);
});




