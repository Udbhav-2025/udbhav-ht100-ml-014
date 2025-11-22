// ---- ELEMENTS ----
const startBtn   = document.getElementById('startBtn');
const stopBtn    = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');
const uploadBtn  = document.getElementById('uploadBtn');
const uploadInput= document.getElementById('uploadInput');

const video      = document.getElementById('video');
const itemCard   = document.getElementById('itemCard');
const binCard    = document.getElementById('binCard');
const arrow      = document.getElementById('arrow');

const itemImg    = document.getElementById('itemImg');
const itemLabel  = document.getElementById('itemLabel');
const itemConf   = document.getElementById('itemConf');
const binBody    = document.getElementById('binBody');
const binLid     = document.getElementById('binLid');
const binLabel   = document.getElementById('binLabel');
const binAdvice  = document.getElementById('binAdvice');

const sendBtn    = document.getElementById('sendBtn');
const clearBtn   = document.getElementById('clearBtn');

let stream = null;
let lastBlob = null;
let lastObjectURL = null;

// ---- THEME ----
function setTheme(key = 'default'){
  document.body.dataset.theme = key;
}
function themeKeyFrom(pick){
  const txt = `${pick.label} ${pick.bin}`.toLowerCase();
  if (txt.includes('plastic'))   return 'plastic';
  if (txt.includes('paper'))     return 'paper';
  if (txt.includes('cardboard')) return 'cardboard';
  if (txt.includes('organic') || txt.includes('food')) return 'organic';
  if (txt.includes('metal'))     return 'metal';
  if (txt.includes('glass'))     return 'glass';
  if (txt.includes('hazard'))    return 'hazardous';
  if (txt.includes('recycl'))    return 'recyclable';
  if (txt.includes('residual') || txt.includes('landfill')) return 'residual';
  return 'default';
}

// ---- CAMERA CONTROL ----
async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera not supported (use HTTPS or localhost).');
      return;
    }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = stream;
    await video.play().catch(()=>{});
    captureBtn.disabled = false;
    stopBtn.disabled = true;  // enable once we truly have tracks
    // enable stop only when tracks are active
    if (stream.getTracks().some(t => t.readyState === 'live')) stopBtn.disabled = false;
    startBtn.disabled = true;
  } catch (err) {
    console.error(err);
    alert("Camera Error: " + (err?.message || err));
  }
}
startBtn.addEventListener('click', startCamera);

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  captureBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
}
stopBtn.addEventListener('click', stopCamera);

// ---- UPLOAD IMAGE ----
uploadBtn.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (!f) return;
  lastBlob = f;
  if (lastObjectURL) { URL.revokeObjectURL(lastObjectURL); lastObjectURL = null; }
  lastObjectURL = URL.createObjectURL(f);
  itemImg.src = lastObjectURL;
  showCapturedState();
});

// ---- CAPTURE FROM CAMERA ----
captureBtn.addEventListener('click', () => {
  if (!stream) { alert('Start camera first.'); return; }
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) { alert('Camera not ready.'); return; }

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(video, 0, 0, w, h);

  canvas.toBlob(blob => {
    if (!blob) return;
    lastBlob = blob;
    if (lastObjectURL) { URL.revokeObjectURL(lastObjectURL); lastObjectURL = null; }
    lastObjectURL = URL.createObjectURL(blob);
    itemImg.src = lastObjectURL;
    showCapturedState();
  }, 'image/jpeg', 0.9);
});

// ---- COMMON UI STATE ----
function showCapturedState() {
  itemCard.classList.add('visible');
  arrow.classList.add('visible');
  binCard.classList.add('visible');
  sendBtn.disabled = false;

  itemLabel.textContent = 'Item: (preview)';
  itemConf.textContent  = 'Confidence: —';
  binLabel.textContent  = 'Bin: —';
  binAdvice.textContent = 'Advice: —';
  binLid?.classList.remove('open');
  binBody.style.background = '#ddd';
  setTheme('default');
}

// ---- CLEAR ----
clearBtn.addEventListener('click', () => {
  lastBlob = null;
  if (lastObjectURL) { URL.revokeObjectURL(lastObjectURL); lastObjectURL = null; }
  itemImg.src = '';
  itemLabel.textContent = 'Item: —';
  itemConf.textContent  = 'Confidence: —';
  binLabel.textContent  = 'Bin: —';
  binAdvice.textContent = 'Advice: —';
  itemCard.classList.remove('visible');
  arrow.classList.remove('visible');
  binCard.classList.remove('visible');
  sendBtn.disabled = true;
  binLid?.classList.remove('open');
  binBody.style.background = '#ddd';
  setTheme('default');
});

// ---- CLASSIFY (SIMULATED DEMO) ----
// Replace this block with a real model/API when ready
sendBtn.addEventListener('click', async () => {
  if (!lastBlob) { alert('Capture or upload first.'); return; }
  sendBtn.disabled = true;
  const prev = sendBtn.textContent;
  sendBtn.textContent = 'Classifying...';

  try {
    await delay(700);
    const results = [
      {label:'Vegetable leaf', conf:0.92, color:'#98d98f', bin:'Food Waste', advice:'Compost or food bin'},
      {label:'Newspaper',      conf:0.86, color:'#3aa0ff', bin:'Recyclable', advice:'Recycle paper properly'},
      {label:'Battery',        conf:0.75, color:'#ef4444', bin:'Hazardous',  advice:'Dispose at battery center'},
      {label:'Plastic cup',    conf:0.68, color:'#fb923c', bin:'Plastic Waste', advice:'Rinse and recycle'}
    ];
    const pick = results[Math.floor(Math.random()*results.length)];

    // theme + UI
    setTheme(themeKeyFrom(pick));
    itemLabel.textContent = `Item: ${pick.label}`;
    itemConf.textContent  = `Confidence: ${(pick.conf*100).toFixed(1)}%`;
    binLabel.textContent  = pick.bin;
    binAdvice.textContent = pick.advice;
    binBody.style.background = pick.color;
    binLid?.classList.add('open');

    await delay(200);
    await animateRealImageFall(itemImg, () => setTimeout(() => binLid?.classList.remove('open'), 350));
  } catch (err) {
    console.error(err);
    alert("Failed: " + (err?.message || err));
  } finally {
    sendBtn.textContent = prev;
    sendBtn.disabled = false;
  }
});

// ---- ANIMATION ----
function animateRealImageFall(imgEl, onComplete){
  return new Promise(resolve => {
    try {
      const rect = imgEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        onComplete?.(); return resolve();
      }
      const clone = imgEl.cloneNode(true);
      clone.classList.add('falling-clone');
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top  = rect.top  + 'px';
      clone.style.width  = rect.width  + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.zIndex = 9999;
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);

      imgEl.style.visibility = 'hidden';

      const cleanup = () => {
        try { clone.remove(); } catch {}
        imgEl.style.visibility = 'visible';
        try { onComplete?.(); } catch {}
        resolve();
      };
      clone.addEventListener('animationend', cleanup, { once:true });
      setTimeout(cleanup, 1200); // safety fallback
    } catch {
      try { onComplete?.(); } catch {}
      resolve();
    }
  });
}

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
