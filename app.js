/**
 * app.js
 * Main application controller for Belajar Bahasa Prancis
 */

class FrenchLearningApp {
  constructor() {
    // Initialize managers
    this.storage = new StorageManager();
    this.ui = new UIManager(this.storage);
    this.audio = new AudioManager(this.storage);
    this.quizEngine = new QuizEngine(this.storage, this.ui, this.audio);
    this.flashcardManager = new FlashcardManager(this.storage, this.ui, this.audio);
    this.progressTracker = new ProgressTracker(this.storage, this.ui);
    this.animationController = new AnimationController();

    // Initialize app
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupDashboard();
    this.setupCategoryActions();
    this.setupChecklist();
    this.progressTracker.updateUI();
    this.progressTracker.checkStreakAchievements();
    this.progressTracker.markStudySession();

    // Initial animation
    setTimeout(() => {
      document.body.classList.add('app-loaded');
    }, 100);
  }

  // ========== NAVIGATION ==========
  setupNavigation() {
    document.querySelectorAll('nav:not(.sidebar-nav) a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.ui.smoothScrollTo(targetId);
      });
    });
  }

  // ========== DASHBOARD ==========
  setupDashboard() {
    const dashToggle = document.getElementById('dashboardToggle');
    const dashContent = document.getElementById('dashboardContent');

    if (dashToggle && dashContent) {
      dashToggle.addEventListener('click', () => {
        const isOpen = dashContent.classList.toggle('dashboard-open');
        if (isOpen) {
          this.progressTracker.renderDashboard();
          this.animationController.staggerAnimation(dashContent);
        }
      });
    }
  }

  // ========== CATEGORY ACTIONS ==========
  setupCategoryActions() {
    // Quiz buttons
    document.querySelectorAll('[data-quiz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-quiz');
        this.quizEngine.startQuiz(category, (result) => {
          this.progressTracker.updateUI();
          this.animationController.refresh();
        });
      });
    });

    // Flashcard buttons
    document.querySelectorAll('[data-flashcard]').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-flashcard');
        this.flashcardManager.startSession(category, () => {
          this.progressTracker.updateUI();
          this.animationController.refresh();
        });
      });
    });

    // Audio buttons (pronounce)
    document.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-speak');
        this.audio.speakNormal(text);
      });
    });
  }

  // ========== CHECKLIST ==========
  setupChecklist() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      const key = item.getAttribute('data-check');

      // Load saved state
      if (this.storage.get(`checklist.${key}`)) {
        item.classList.add('checked');
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = true;
      }

      item.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        this.storage.set(`checklist.${key}`, isChecked);
        item.classList.toggle('checked', isChecked);

        if (isChecked) {
          this.storage.addXP(5);
          this.ui.showXPPopup(5);
        }

        this.progressTracker.updateUI();
      });
    });
  }

  // ========== START QUIZ (Global) ==========
  startQuiz(category) {
    this.quizEngine.startQuiz(category, (result) => {
      this.progressTracker.updateUI();
      this.animationController.refresh();
    });
  }

  // ========== START FLASHCARD (Global) ==========
  startFlashcard(category) {
    this.flashcardManager.startSession(category, () => {
      this.progressTracker.updateUI();
      this.animationController.refresh();
    });
  }

  // ========== SETTINGS ==========
  openSettings() {
    const settings = this.storage.get('settings');

    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    modal.querySelector('.modal-content').innerHTML = `
      <div class="settings-content">
        <h3>Pengaturan</h3>

        <div class="setting-item">
          <label for="settingDarkMode">Mode Gelap</label>
          <label class="toggle-switch">
            <input type="checkbox" id="settingDarkMode" ${settings.darkMode ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <label for="settingAudio">Audio Aktif</label>
          <label class="toggle-switch">
            <input type="checkbox" id="settingAudio" ${settings.audioEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <label for="settingSpeed">Kecepatan Suara</label>
          <input type="range" id="settingSpeed" min="0.5" max="1.5" step="0.1" value="${settings.voiceSpeed || 1.0}">
          <span id="speedValue">${settings.voiceSpeed || 1.0}x</span>
        </div>

        <div class="setting-actions">
          <button class="btn btn-secondary" onclick="app.exportData()">Export Data</button>
          <button class="btn btn-secondary" onclick="app.importData()">Import Data</button>
          <button class="btn btn-danger" onclick="app.resetData()">Reset Semua</button>
        </div>

        <div class="setting-actions">
          <button class="btn btn-primary" onclick="app.saveSettings()">Simpan</button>
          <button class="btn btn-secondary" onclick="app.ui.closeModal('settingsModal')">Tutup</button>
        </div>
      </div>
    `;

    document.getElementById('settingSpeed').addEventListener('input', (e) => {
      document.getElementById('speedValue').textContent = e.target.value + 'x';
    });

    this.ui.openModal('settingsModal');
  }

  saveSettings() {
    this.storage.set('settings', {
      darkMode: document.getElementById('settingDarkMode').checked,
      audioEnabled: document.getElementById('settingAudio').checked,
      voiceSpeed: parseFloat(document.getElementById('settingSpeed').value)
    });

    const isDark = document.getElementById('settingDarkMode').checked;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDark);

    this.ui.showToast('Pengaturan disimpan!', 'success');
    this.ui.closeModal('settingsModal');
  }

  exportData() {
    const data = this.storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'french-learning-data.json';
    a.click();
    URL.revokeObjectURL(url);
    this.ui.showToast('Data berhasil di-export!', 'success');
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this.storage.saveData(data);
          this.ui.showToast('Data berhasil di-import! Halaman akan dimuat ulang.', 'success');
          setTimeout(() => location.reload(), 1500);
        } catch (err) {
          this.ui.showToast('Gagal import data: File tidak valid', 'error');
        }
      });
      reader.readAsText(file);
    });
    input.click();
  }

  async resetData() {
    const confirmed = await this.ui.showConfirm('Semua progress akan dihapus. Apakah Anda yakin?');
    if (confirmed) {
      this.storage.clear();
      this.ui.showToast('Data berhasil di-reset! Halaman akan dimuat ulang.', 'success');
      setTimeout(() => location.reload(), 1500);
    }
  }
}

// ========== INITIALIZE APP ==========
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new FrenchLearningApp();
});
