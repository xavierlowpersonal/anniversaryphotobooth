/* ---------- DOM READY ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* ----- Modal & Navigation (index.html) ----- */
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
  if (!preview) return; // exit if we're not on photobooth.html

  const framesRow   = document.getElementById('framesRow');
  const upload      = document.getElementById('upload');
  const useCamera   = document.getElementById('useCamera');
  const exportBtn   = document.getElementById('exportBtn');
  const canvasWrap  = document.getElementById('canvasWrap');
  const addTextBtn  = document.getElementById('addText');
  const slotButtons = document.querySelectorAll('.slot-btn');
  const photoInputs = document.getElementById('photoInputs');
  const secretInput = document.getElementById('secretInput');
  const trySecret   = document.getElementById('trySecret');
  const secretMsg   = document.getElementById('secretMsg');

  /* ---------- Variables ---------- */
  const PREVIEW_W = preview.width;   // 600
  const PREVIEW_H = preview.height;  // 1500
  const EXPORT_W  = 1080;
  const EXPORT_H  = 2700;

  let frames = [
    { id: 'none',    src: null,                 name: 'NONE',   color: '#f8bbd0' },
    { id: 'pokemon', src: 'frames/pokemon1.png', name: 'Pokemon' },
    { id: 'shinchan',src: 'frames/shinchan.png', name: 'Shin Chan' },
    { id: 'sanrio1', src: 'frames/sanrio1.png',  name: 'Sanrio' }
  ];

  // Secret frame
  const SECRET_WORDS = ['zoey'];
  let anniversaryFrame = { id: 'mha', src: 'frames/mha.png', name: 'My Hero Academia' };

  // Preload frame images
  frames.forEach(f => {
    if (f.src) {
      f.imgObj = new Image();
      f.imgObj.src = f.src;
    }
  });
  anniversaryFrame.imgObj = new Image();
  anniversaryFrame.imgObj.src = anniversaryFrame.src;

  let photos        = [null, null, null, null];  // 4 slots
  let activeSlot    = null;
  let selectedFrame = frames[0];

  // Text boxes tracking
  let textBoxes      = []; // [{ el, contentEl }]
  let activeTextBox  = null;
  let draggingBox    = null;
  let dragOffset     = { x: 0, y: 0 };

  /* ---------- Build Frames UI ---------- */
  function buildFramesUI() {
    if (!framesRow) return;
    framesRow.innerHTML = '';
    frames.forEach(f => {
      const thumb = document.createElement('img');
      thumb.className = 'frame-thumb';
      thumb.alt = f.name;
      thumb.src =
        f.src ||
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#f3c7d1"/></svg>';
      thumb.title = f.name;
      thumb.addEventListener('click', () => {
        selectedFrame = f;
        draw();
      });
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
      if (activeSlot === null) {
        alert('Select a slot first');
        upload.value = '';
        return;
      }
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        loadPhoto(ev.target.result, activeSlot);
        upload.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Use Native Camera ---------- */
  if (useCamera) {
    useCamera.addEventListener('click', () => {
      if (activeSlot === null) {
        alert('Select a slot first');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('accept', 'image/*;capture=camera');
      input.setAttribute('capture', 'environment'); // rear camera
      input.style.cssText =
        'position:fixed; left:0; top:0; width:1px; height:1px; opacity:0.01; z-index:9999;';
      document.body.appendChild(input);

      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
          document.body.removeChild(input);
          return;
        }
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
    img.onload = () => {
      photos[slotIndex] = img;
      draw();
    };
    img.src = dataURL;
  }

  /* ---------- Text Box Dragging Helpers (Mouse + Touch) ---------- */
  function startDragBox(box, clientX, clientY) {
    draggingBox = box;

    const boxRect  = box.getBoundingClientRect();
    const wrapRect = canvasWrap.getBoundingClientRect();

    dragOffset.x = clientX - boxRect.left;
    dragOffset.y = clientY - boxRect.top;

    box._wrapRect = wrapRect;

    document.addEventListener('mousemove', onBoxMouseMove);
    document.addEventListener('mouseup', stopDragBox);
    document.addEventListener('touchmove', onBoxTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragBox);
  }

  function onBoxMouseMove(e) {
    if (!draggingBox) return;
    moveBoxToPointer(draggingBox, e.clientX, e.clientY);
  }

  function onBoxTouchMove(e) {
    if (!draggingBox) return;
    const touch = e.touches[0];
    moveBoxToPointer(draggingBox, touch.clientX, touch.clientY);
    e.preventDefault(); // prevent page scroll while dragging
  }

  function moveBoxToPointer(box, clientX, clientY) {
    const wrapRect = box._wrapRect || canvasWrap.getBoundingClientRect();

    let x = clientX - wrapRect.left - dragOffset.x;
    let y = clientY - wrapRect.top - dragOffset.y;

    // clamp inside wrapper
    const maxX = wrapRect.width - box.offsetWidth;
    const maxY = wrapRect.height - box.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    box.style.left = x + 'px';
    box.style.top  = y + 'px';
  }

  function stopDragBox() {
    if (!draggingBox) return;
    draggingBox._wrapRect = null;
    draggingBox = null;

    document.removeEventListener('mousemove', onBoxMouseMove);
    document.removeEventListener('mouseup', stopDragBox);
    document.removeEventListener('touchmove', onBoxTouchMove);
    document.removeEventListener('touchend', stopDragBox);
  }

  /* ---------- Text Boxes (Editable + Draggable + Deletable) ---------- */
  function createTextBox() {
    if (!canvasWrap) return;

    // Outer box (positioned & draggable)
    const box = document.createElement('div');
    box.className = 'text-box';      // matches your CSS
    box.style.position = 'absolute';
    box.style.touchAction = 'none';
    box.style.pointerEvents = 'auto';
    box.style.zIndex = '10';

    const wrapRect = canvasWrap.getBoundingClientRect();
    box.style.left = (wrapRect.width / 2 - 40) + 'px';
    box.style.top  = (wrapRect.height / 2 - 15) + 'px';

    // Inner span for editable text (so we don't nuke the delete button)
    const textSpan = document.createElement('span');
    textSpan.className = 'text-content';
    textSpan.contentEditable = 'true';
    textSpan.innerText = 'Your text';

    // Delete button (matches .text-box .del-btn)
    const delBtn = document.createElement('div');
    delBtn.className = 'del-btn';
    delBtn.textContent = '×';

    // Delete logic
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (canvasWrap.contains(box)) {
        canvasWrap.removeChild(box);
      }
      textBoxes = textBoxes.filter(tb => tb.el !== box);
    });

    box.appendChild(textSpan);
    box.appendChild(delBtn);
    canvasWrap.appendChild(box);

    textBoxes.push({ el: box, contentEl: textSpan });
    activeTextBox = box;

    // Clear placeholder on first focus in the text span
    textSpan.addEventListener('focus', () => {
      if (textSpan.innerText.trim() === 'Your text') {
        textSpan.innerText = '';
      }
    });

    // Drag with mouse (only when not clicking inside text)
    box.addEventListener('mousedown', (e) => {
      if (e.target === delBtn) return;
      if (e.target.closest('.text-content')) return; // let user select/edit text
      e.preventDefault(); // avoid text selection when dragging
      startDragBox(box, e.clientX, e.clientY);
    });

    // Drag with touch
    box.addEventListener('touchstart', (e) => {
      if (e.target === delBtn) return;
      if (e.target.closest('.text-content')) return;
      const touch = e.touches[0];
      startDragBox(box, touch.clientX, touch.clientY);
    }, { passive: false });

    return box;
  }

  if (addTextBtn && canvasWrap) {
    addTextBtn.addEventListener('click', () => {
      createTextBox();
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
      if (secretMsg) secretMsg.textContent = 'PLUS ULTRA!!✨';
    } else {
      if (secretMsg) secretMsg.textContent = '—❌ Wrong! Hint: name of our future';
    }
  }

  if (trySecret && secretInput) {
    trySecret.addEventListener('click', () => checkSecret(secretInput.value.trim()));
    secretInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') checkSecret(secretInput.value.trim());
    });
  }

  /* ---------- Draw Canvas (Preview) ---------- */
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
        const imgRatio  = img.width / img.height;
        const slotRatio = PREVIEW_W / slotH;

        let sw, sh, sx, sy;
        if (imgRatio > slotRatio) {
          // wider than slot
          sh = img.height;
          sw = img.height * slotRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          // taller than slot
          sw = img.width;
          sh = img.width / slotRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, y, PREVIEW_W, slotH);
      }
    }

    if (selectedFrame && selectedFrame.imgObj) {
      ctx.drawImage(selectedFrame.imgObj, 0, 0, PREVIEW_W, PREVIEW_H);
    }
  }

  /* ---------- Export HD (Photos + Frame + Text) ---------- */
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const out = document.createElement('canvas');
      out.width  = EXPORT_W;
      out.height = EXPORT_H;
      const octx = out.getContext('2d');

      // Background
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, EXPORT_W, EXPORT_H);

      // Photos
      const slotH = EXPORT_H / 4;
      for (let i = 0; i < 4; i++) {
        if (!photos[i]) continue;

        const img = photos[i];
        const imgRatio  = img.width / img.height;
        const slotRatio = EXPORT_W / slotH;

        let sw, sh, sx, sy;
        if (imgRatio > slotRatio) {
          sh = img.height;
          sw = img.height * slotRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = img.width / slotRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        const dy = i * slotH;
        octx.drawImage(img, sx, sy, sw, sh, 0, dy, EXPORT_W, slotH);
      }

      // Frame
      if (selectedFrame && selectedFrame.imgObj) {
        octx.drawImage(selectedFrame.imgObj, 0, 0, EXPORT_W, EXPORT_H);
      }

      // Text boxes
      if (canvasWrap && textBoxes.length > 0) {
        const wrapRect = canvasWrap.getBoundingClientRect();

        textBoxes.forEach(tb => {
          const box     = tb.el;
          const content = tb.contentEl || box;
          if (!box || !content) return;

          const text = content.innerText.trim();
          if (!text || text === 'Your text') return;

          const boxRect = box.getBoundingClientRect();
          const cx = (boxRect.left + boxRect.width / 2) - wrapRect.left;
          const cy = (boxRect.top  + boxRect.height / 2) - wrapRect.top;

          const px = (cx / wrapRect.width)  * EXPORT_W;
          const py = (cy / wrapRect.height) * EXPORT_H;

          const style = window.getComputedStyle(content);
          const fontSizePx = parseFloat(style.fontSize) || 24;
          const fontScale  = EXPORT_W / wrapRect.width;
          const finalFontSize = fontSizePx * fontScale;

          octx.save();
          octx.font = `${finalFontSize}px "Playfair Display", serif`;
          octx.textAlign = 'center';
          octx.textBaseline = 'middle';

          // Stroke (outline)
          octx.lineWidth = Math.max(2, finalFontSize * 0.08);
          octx.strokeStyle = 'rgba(0,0,0,0.35)';
          octx.strokeText(text, px, py);

          // Fill
          octx.fillStyle = '#fff';
          octx.fillText(text, px, py);
          octx.restore();
        });
      }

      const link = document.createElement('a');
      link.download = `Anniversary_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = out.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Initial draw + resize
  draw();
  window.addEventListener('resize', draw);
});
