/**
 * ProgressTracker.js
 * Handles XP, levels, achievements, streaks, and progress dashboard
 */

class ProgressTracker {
  constructor(storage, ui) {
    this.storage = storage;
    this.ui = ui;
    this.checkStreak();
  }

  /**
   * Check and update study streak
   */
  checkStreak() {
    const lastStudy = this.storage.get('user.lastStudyDate');
    const today = new Date().toDateString();

    if (lastStudy !== today) {
      this.storage.updateStudyStreak();
    }
  }

  /**
   * Mark study session (call when user interacts)
   */
  markStudySession() {
    this.checkStreak();
    this.storage.increment('stats.studySessions');
    this.storage.increment('user.totalStudyTime');
  }

  /**
   * Get user stats summary
   */
  getStats() {
    const data = this.storage.getData();
    return {
      level: data.user.level,
      xp: data.user.xp,
      xpToNextLevel: (data.user.level * 100) - data.user.xp,
      streak: data.user.studyStreak,
      wordsLearned: this.countLearnedWords(),
      quizzesTaken: data.stats.quizzesTaken || 0,
      averageScore: data.stats.averageScore || 0,
      flashcardsReviewed: data.stats.flashcardsReviewed || 0,
      studySessions: data.stats.studySessions || 0,
      achievements: (data.achievements || []).length,
      totalAchievements: CONTENT_DATA.achievements.length
    };
  }

  /**
   * Get progress per category
   */
  getCategoryProgress() {
    const categories = ['salam', 'angka', 'hari', 'warna', 'ganti', 'kosakata', 'grammar'];
    const names = {
      salam: 'Salam',
      angka: 'Angka',
      hari: 'Hari',
      warna: 'Warna',
      ganti: 'Kata Ganti',
      kosakata: 'Kosakata',
      grammar: 'Tata Bahasa'
    };

    return categories.map(cat => ({
      id: cat,
      name: names[cat],
      progress: this.storage.get(`progress.${cat}`) || 0,
      quizCount: this.getQuizCountForCategory(cat)
    }));
  }

  /**
   * Get quiz count for a category
   */
  getQuizCountForCategory(category) {
    const history = this.storage.get('quizHistory') || [];
    return history.filter(q => q.category === category).length;
  }

  /**
   * Count learned words (flashcards at box 3+)
   */
  countLearnedWords() {
    const progress = this.storage.get('flashcardProgress') || {};
    return Object.keys(progress).filter(key => progress[key].box >= 3).length;
  }

  /**
   * Render dashboard HTML
   */
  renderDashboard() {
    const stats = this.getStats();
    const categories = this.getCategoryProgress();
    const achievements = this.storage.get('achievements') || [];

    const dashboard = document.getElementById('dashboardContent');
    if (!dashboard) return;

    const xpProgress = ((stats.xp % 100) / 100) * 100;

    dashboard.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-card main-stats">
          <div class="stat-avatar">${this.storage.get('user.avatar') || '🎓'}</div>
          <div class="stat-info">
            <h3>Level ${stats.level}</h3>
            <div class="xp-bar">
              <div class="xp-fill" style="width: ${xpProgress}%"></div>
            </div>
            <p class="xp-text">${stats.xp % 100} / 100 XP ke Level ${stats.level + 1}</p>
            <p class="stat-highlight">${stats.xp} XP Total</p>
          </div>
        </div>

        <div class="dashboard-card">
          <h4>🔥 Streak Belajar</h4>
          <p class="stat-number">${stats.streak}</p>
          <p class="stat-label">hari berturut-turut</p>
        </div>

        <div class="dashboard-card">
          <h4>📚 Kosakata Dipelajari</h4>
          <p class="stat-number">${stats.wordsLearned}</p>
          <p class="stat-label">kata</p>
        </div>

        <div class="dashboard-card">
          <h4>📜 Quiz Diselesaikan</h4>
          <p class="stat-number">${stats.quizzesTaken}</p>
          <p class="stat-label">quiz | Rata-rata: ${stats.averageScore}%</p>
        </div>

        <div class="dashboard-card">
          <h4>🏆 Achievements</h4>
          <p class="stat-number">${stats.achievements} / ${stats.totalAchievements}</p>
          <p class="stat-label">terbuka</p>
        </div>

        <div class="dashboard-card">
          <h4>📌 Flashcard</h4>
          <p class="stat-number">${stats.flashcardsReviewed}</p>
          <p class="stat-label">kartu direview</p>
        </div>
      </div>

      <h3 class="dashboard-subtitle">Progres per Kategori</h3>
      <div class="category-progress-list">
        ${categories.map(cat => `
          <div class="category-progress-item">
            <span class="category-name">${cat.name}</span>
            <div class="category-bar">
              <div class="category-bar-fill" style="width: ${cat.progress}%"></div>
            </div>
            <span class="category-percent">${cat.progress}%</span>
          </div>
        `).join('')}
      </div>

      ${achievements.length > 0 ? `
        <h3 class="dashboard-subtitle">Achievements Terbuka</h3>
        <div class="achievements-grid">
          ${achievements.map(a => `
            <div class="achievement-badge" title="${a.name}: ${a.description}">
              <span class="achievement-icon">${a.icon}</span>
              <span class="achievement-name">${a.name}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <p>Belum ada achievements. Selesaikan quiz dan belajar untuk membuka achievements!</p>
        </div>
      `}
    `;
  }

  /**
   * Get mastery level label based on percentage
   */
  getMasteryLevel(percentage) {
    if (percentage >= 100) return { label: 'Master', color: '#FFD700' };
    if (percentage >= 80) return { label: 'Advanced', color: '#4CAF50' };
    if (percentage >= 60) return { label: 'Intermediate', color: '#2196F3' };
    if (percentage >= 40) return { label: 'Elementary', color: '#FF9800' };
    return { label: 'Beginner', color: '#9E9E9E' };
  }

  /**
   * Check for streak-related achievements
   */
  checkStreakAchievements() {
    const streak = this.storage.get('user.studyStreak');

    if (streak >= 7) {
      this.storage.unlockAchievement({
        id: 'dedicated',
        name: 'Dedicated',
        description: 'Streak belajar 7 hari',
        icon: '🔥',
        xpReward: 70
      });
    }

    if (streak >= 30) {
      this.storage.unlockAchievement({
        id: 'streak_30',
        name: 'Unstoppable',
        description: 'Streak belajar 30 hari',
        icon: '💎',
        xpReward: 150
      });
    }

    // Time-based achievements
    const hour = new Date().getHours();
    if (hour < 8) {
      this.storage.unlockAchievement({
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Belajar sebelum jam 8 pagi',
        icon: '🐦',
        xpReward: 15
      });
    }
    if (hour >= 22) {
      this.storage.unlockAchievement({
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Belajar setelah jam 10 malam',
        icon: '🦉',
        xpReward: 15
      });
    }
  }

  /**
   * Update all UI progress indicators
   */
  updateUI() {
    const stats = this.getStats();

    // Update header XP/Level
    const headerLevel = document.getElementById('headerLevel');
    const headerXP = document.getElementById('headerXP');
    const headerStreak = document.getElementById('headerStreak');

    if (headerLevel) headerLevel.textContent = `Level ${stats.level}`;
    if (headerXP) headerXP.textContent = `${stats.xp} XP`;
    if (headerStreak) headerStreak.textContent = `${stats.streak} hari streak`;

    // Update category progress bars in main content
    this.getCategoryProgress().forEach(cat => {
      const bar = document.querySelector(`[data-progress="${cat.id}"]`);
      if (bar) {
        bar.style.width = `${cat.progress}%`;
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}

