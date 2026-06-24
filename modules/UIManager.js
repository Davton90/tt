/**
 * UIManager.js
 * Handles modals, toasts, dark mode, and other UI components
 */

class UIManager {
  constructor(storage) {
    this.storage = storage;
    this.toastTimeout = null;
    this.init();
  }

  init() {
    this.initDarkMode();
    this.createToastContainer();
    this.createConfettiContainer();
  }

  // ========== DARK MODE ==========
  initDarkMode() {
    const isDark = this.storage.get('settings.darkMode');
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.checked = isDark;
      toggle.addEventListener('change', () => this.toggleDarkMode());
    }

    // Auto-detect system preference if no saved preference
    if (isDark === null) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.storage.set('settings.darkMode', true);
        document.documentElement.classList.add('dark');
      }
    }
  }

  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    this.storage.set('settings.darkMode', isDark);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
  }

  // ========== TOAST NOTIFICATIONS ==========
  createToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '&#10004;',
      error: '&#10008;',
      warning: '&#9888;',
      info: '&#8505;',
      xp: '&#11088;',
      achievement: '&#127942;'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ========== MODALS ==========
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modalId);
      }
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modalId);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
  }

  // ========== CONFETTI ==========
  createConfettiContainer() {
    if (document.getElementById('confettiContainer')) return;
    const container = document.createElement('div');
    container.id = 'confettiContainer';
    container.className = 'confetti-container';
    document.body.appendChild(container);
  }

  showConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const colors = ['#002654', '#ED2939', '#FFD700', '#FFFFFF', '#4CAF50'];
    const shapes = ['square', 'circle'];

    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement('div');
      confetti.className = `confetti ${shapes[Math.floor(Math.random() * shapes.length)]}`;
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      container.appendChild(confetti);
    }

    setTimeout(() => {
      container.innerHTML = '';
    }, 4000);
  }

  // ========== SMOOTH SCROLL ==========
  smoothScrollTo(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const navHeight = document.querySelector('nav')?.offsetHeight || 0;
    const targetPosition = target.offsetTop - navHeight - 20;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }

  // ========== PROGRESS BAR ==========
  updateProgressBar(elementId, percentage) {
    const bar = document.querySelector(`#${elementId} .progress-fill`) || document.getElementById(elementId);
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
  }

  // ========== XP POPUP ==========
  showXPPopup(amount) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.textContent = `+${amount} XP`;
    document.body.appendChild(popup);

    requestAnimationFrame(() => {
      popup.classList.add('xp-popup-animate');
    });

    setTimeout(() => {
      popup.remove();
    }, 1500);
  }

  // ========== LEVEL UP ANIMATION ==========
  showLevelUp(newLevel) {
    this.showToast(`Level Up! Anda sekarang Level ${newLevel}! 🎉`, 'achievement', 5000);
    this.showConfetti();
  }

  // ========== ACHIEVEMENT POPUP ==========
  showAchievementUnlocked(achievement) {
    this.showToast(
      `Achievement "${achievement.name}" terbuka! ${achievement.icon}`,
      'achievement',
      5000
    );
  }

  // ========== CONFIRM DIALOG ==========
  showConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal modal-active';
      modal.innerHTML = `
        <div class="modal-content modal-small">
          <h3>Konfirmasi</h3>
          <p>${message}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="confirmNo">Batal</button>
            <button class="btn btn-primary" id="confirmYes">Ya</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      modal.querySelector('#confirmYes').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
        resolve(true);
      });

      modal.querySelector('#confirmNo').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
        resolve(false);
      });
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
