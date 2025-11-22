/**
 * SMART WASTE CLASSIFIER - Main Application
 * Coordinates all modules
 */

import { Camera } from './camera.js';
import { Classifier } from './classifier.js';
import { Storage } from './storage.js';
import { Animations } from './animations.js';

class WasteClassifierApp {
  constructor() {
    // Initialize modules
    this.camera = new Camera();
    this.classifier = new Classifier();
    this.storage = new Storage();
    this.animations = new Animations();

    // DOM Elements
    this.elements = {
      // Buttons
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      captureBtn: document.getElementById('captureBtn'),
      uploadBtn: document.getElementById('uploadBtn'),
      uploadInput: document.getElementById('uploadInput'),
      sendBtn: document.getElementById('sendBtn'),
      clearBtn: document.getElementById('clearBtn'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn'),

      // Display
      video: document.getElementById('video'),
      itemCard: document.getElementById('itemCard'),
      binCard: document.getElementById('binCard'),
      arrow: document.getElementById('arrow'),
      itemImg: document.getElementById('itemImg'),
      itemLabel: document.getElementById('itemLabel'),
      itemConf: document.getElementById('itemConf'),
      binBody: document.getElementById('binBody'),
      binLid: document.getElementById('binLid'),
      binLabel: document.getElementById('binLabel'),
      binAdvice: document.getElementById('binAdvice'),

      // Stats
      modelStatus: document.getElementById('modelStatus'),
      totalClassified: document.getElementById('totalClassified'),
      recycleRate: document.getElementById('recycleRate'),
      statTotal: document.getElementById('statTotal'),
      statRecyclable: document.getElementById('statRecyclable'),
      statOrganic: document.getElementById('statOrganic'),
      statHazardous: document.getElementById('statHazardous'),

      // History
      historyList: document.getElementById('historyList'),
      toast: document.getElementById('toast')
    };

    this.currentBlob = null;
    this.currentObjectURL = null;

    this.init();
  }

  async init() {
    // Load AI model
    await this.classifier.loadModel((status) => {
      this.elements.modelStatus.textContent = status;
      if (status.includes('Ready')) {
        this.elements.modelStatus.style.background = '#d1fae5';
        this.elements.modelStatus.style.borderColor = '#10b981';
      }
    });

    // Setup event listeners
    this.setupEventListeners();

    // Load statistics
    this.updateStatistics();
    this.renderHistory();
  }

  setupEventListeners() {
    // Camera controls
    this.elements.startBtn.addEventListener('click', () => this.handleStartCamera());
    this.elements.stopBtn.addEventListener('click', () => this.handleStopCamera());
    this.elements.captureBtn.addEventListener('click', () => this.handleCapture());

    // Upload
    this.elements.uploadBtn.addEventListener('click', () => this.elements.uploadInput.click());
    this.elements.uploadInput.addEventListener('change', (e) => this.handlethis.elements.uploadInput.addEventListener('change', (e) => this.handleUpload(e)));

    // Classification
    this.elements.sendBtn.addEventListener('click', () => this.handleClassify());

    // Clear
    this.elements.clearBtn.addEventListener('click', () => this.handleClear());
    this.elements.clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());
  }

  async handleStartCamera() {
    const result = await this.camera.start(this.elements.video);
    if (result.success) {
      this.elements.captureBtn.disabled = false;
      this.elements.stopBtn.disabled = false;
      this.elements.startBtn.disabled = true;
      this.showToast('📷 Camera started successfully');
    } else {
      this.showToast('❌ ' + result.error, 'error');
    }
  }

  handleStopCamera() {
    this.camera.stop();
    this.elements.captureBtn.disabled = true;
    this.elements.stopBtn.disabled = true;
    this.elements.startBtn.disabled = false;
    this.showToast('⏹ Camera stopped');
  }

  handleCapture() {
    const blob = this.camera.capture();
    if (blob) {
      this.setImage(blob);
      this.showCapturedState();
      this.showToast('📸 Photo captured!');
    } else {
      this.showToast('❌ Failed to capture. Try again.', 'error');
    }
  }

  handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.setImage(file);
    this.showCapturedState();
    this.showToast('📁 Image uploaded!');

    // Reset input
    event.target.value = '';
  }

  setImage(blob) {
    this.currentBlob = blob;

    // Revoke previous URL
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
    }

    this.currentObjectURL = URL.createObjectURL(blob);
    this.elements.itemImg.src = this.currentObjectURL;
  }

  showCapturedState() {
    this.elements.itemCard.classList.add('visible');
    this.elements.arrow.classList.add('visible');
    this.elements.binCard.classList.add('visible');

    this.elements.sendBtn.disabled = false;

    this.elements.itemLabel.textContent = 'Item: (preview)';
    this.elements.itemConf.textContent = 'Confidence: —';
    this.elements.binLabel.textContent = 'Bin: —';
    this.elements.binAdvice.textContent = 'Advice: —';

    this.resetBin();
    this.setTheme('default');
  }

  async handleClassify() {
    if (!this.currentBlob) {
      this.showToast('⚠️ Please capture or upload an image first', 'warning');
      return;
    }

    if (!this.classifier.isReady()) {
      this.showToast('⚠️ AI model is still loading...', 'warning');
      return;
    }

    this.elements.sendBtn.disabled = true;
    const prevText = this.elements.sendBtn.innerHTML;
    this.elements.sendBtn.innerHTML = '<span class="icon">🤖</span> Analyzing...';

    try {
      // Create image element for classification
      const img = document.createElement('img');
      img.src = this.currentObjectURL;
      await new Promise(resolve => img.onload = resolve);

      // Classify
      const result = await this.classifier.classify(img);

      if (result) {
        // Update UI
        this.elements.itemLabel.textContent = `Item: ${result.label}`;
        this.elements.itemConf.textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
        this.elements.binLabel.textContent = result.binInfo.bin;
        this.elements.binAdvice.textContent = result.binInfo.advice;

        // Update bin appearance
        this.elements.binBody.style.background = result.binInfo.color;
        document.querySelector('.lid-top').style.background = result.binInfo.color;
        document.querySelector('.lid-hinge').style.background = this.shadeColor(result.binInfo.color, -15);

        // Set theme
        this.setTheme(result.category);

        // Open lid
        this.elements.binLid.classList.add('open');

        // Animate drop
        await this.animations.delay(300);
        await this.animations.animateDrop(this.elements.itemImg);

        // Close lid
        await this.animations.delay(350);
        this.elements.binLid.classList.remove('open');

        // Play sound
        this.playDropSound();

        // Vibrate on mobile
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        // Save to history
        this.storage.addToHistory({
          label: result.label,
          bin: result.binInfo.bin,
          category: result.category,
          confidence: result.confidence,
          timestamp: Date.now(),
          imageUrl: this.currentObjectURL
        });

        // Update stats
        this.updateStatistics();
        this.renderHistory();

        this.showToast('✅ Classification complete!');
      }
    } catch (error) {
      console.error('Classification error:', error);
      this.showToast('❌ Classification failed: ' + error.message, 'error');
    } finally {
      this.elements.sendBtn.innerHTML = prevText;
      this.elements.sendBtn.disabled = false;
    }
  }

  handleClear() {
    this.currentBlob = null;

    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }

    this.elements.itemImg.src = '';
    this.elements.itemLabel.textContent = 'Item: —';
    this.elements.itemConf.textContent = 'Confidence: —';
    this.elements.binLabel.textContent = 'Bin: —';
    this.elements.binAdvice.textContent = 'Advice: —';

    this.elements.itemCard.classList.remove('visible');
    this.elements.arrow.classList.remove('visible');
    this.elements.binCard.classList.remove('visible');

    this.elements.sendBtn.disabled = true;

    this.resetBin();
    this.setTheme('default');

    this.showToast('🗑️ Cleared');
  }

  handleClearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
      this.storage.clearHistory();
      this.renderHistory();
      this.updateStatistics();
      this.showToast('🗑️ History cleared');
    }
  }

  resetBin() {
    this.elements.binLid?.classList.remove('open');
    this.elements.binBody.style.background = '#d1d5db';
    document.querySelector('.lid-top').style.background = '#f8fafc';
    document.querySelector('.lid-hinge').style.background = '#e5e7eb';
  }

  setTheme(theme) {
    document.body.dataset.theme = theme;
  }

  updateStatistics() {
    const stats = this.storage.getStatistics();

    // Update header
    this.elements.totalClassified.textContent = `Total: ${stats.total}`;
    this.elements.recycleRate.textContent = `Recyclable: ${stats.recyclablePercent}%`;

    // Update stats card
    this.elements.statTotal.textContent = stats.total;
    this.elements.statRecyclable.textContent = stats.recyclable;
    this.elements.statOrganic.textContent = stats.organic;
    this.elements.statHazardous.textContent = stats.hazardous;
  }

  renderHistory() {
    const history = this.storage.getHistory();
    const listEl = this.elements.historyList;

    if (history.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No classifications yet</p>';
      return;
    }

    listEl.innerHTML = history.slice(0, 5).map(item => `
      <div class="history-item">
        <img src="${item.imageUrl}" alt="${item.label}">
        <div class="history-item-info">
          <div class="history-item-label">${item.label}</div>
          <div class="history-item-bin">${item.bin}</div>
        </div>
      </div>
    `).join('');
  }

  showToast(message, type = 'info') {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('show');

    if (type === 'error') {
      toast.style.background = '#ef4444';
    } else if (type === 'warning') {
      toast.style.background = '#f59e0b';
    } else {
      toast.style.background = '#0f172a';
    }

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  playDropSound() {
    // Simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not supported');
    }
  }

  shadeColor(hex, percent) {
    if (!hex) return hex;

    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + percent));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WasteClassifierApp();
});