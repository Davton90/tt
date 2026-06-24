/**
 * StorageManager.js
 * Handles all LocalStorage operations with error handling and data validation
 */

class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'frenchLearningApp';
    this.defaultData = {
      user: {
        name: '',
        avatar: '🎓',
        studyStreak: 0,
        lastStudyDate: null,
        totalStudyTime: 0,
        xp: 0,
        level: 1
      },
      progress: {
        salam: 0,
        angka: 0,
        hari: 0,
        warna: 0,
        ganti: 0,
        kosakata: 0,
        grammar: 0
      },
      quizHistory: [],
      flashcardProgress: {},
      achievements: [],
      checklist: {},
      settings: {
        darkMode: false,
        audioEnabled: true,
        voiceSpeed: 1.0,
        autoPlayAudio: false
      },
      stats: {
        wordsLearned: 0,
        quizzesTaken: 0,
        averageScore: 0,
        flashcardsReviewed: 0,
        studySessions: 0
      }
    };
    this.init();
  }

  /**
   * Initialize storage with default data if not exists
   */
  init() {
    if (!this.isSupported()) {
      console.warn('LocalStorage not supported');
      return;
    }

    const existing = this.getData();
    if (!existing || Object.keys(existing).length === 0) {
      this.saveData(this.defaultData);
    }
  }

  /**
   * Check if localStorage is supported
   */
  isSupported() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get all data from storage
   */
  getData() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.defaultData;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return this.defaultData;
    }
  }

  /**
   * Save all data to storage
   */
  saveData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return false;
    }
  }

  /**
   * Get specific property from storage
   */
  get(path) {
    const data = this.getData();
    const keys = path.split('.');
    let result = data;
    
    for (const key of keys) {
      if (result && result.hasOwnProperty(key)) {
        result = result[key];
      } else {
        return null;
      }
    }
    
    return result;
  }

  /**
   * Set specific property in storage
   */
  set(path, value) {
    const data = this.getData();
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = data;
    
    for (const key of keys) {
      if (!target[key]) {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    return this.saveData(data);
  }

  /**
   * Update nested object property
   */
  update(path, updates) {
    const current = this.get(path);
    if (typeof current === 'object' && current !== null) {
      const merged = { ...current, ...updates };
      return this.set(path, merged);
    }
    return false;
  }

  /**
   * Increment numeric value
   */
  increment(path, amount = 1) {
    const current = this.get(path);
    if (typeof current === 'number') {
      return this.set(path, current + amount);
    }
    return false;
  }

  /**
   * Add item to array
   */
  push(path, item) {
    const current = this.get(path);
    if (Array.isArray(current)) {
      current.push(item);
      return this.set(path, current);
    }
    return false;
  }

  /**
   * Remove item from array by index
   */
  removeAt(path, index) {
    const current = this.get(path);
    if (Array.isArray(current)) {
      current.splice(index, 1);
      return this.set(path, current);
    }
    return false;
  }

  /**
   * Clear all data (reset to default)
   */
  clear() {
    return this.saveData(this.defaultData);
  }

  /**
   * Export data as JSON string
   */
  exportData() {
    return JSON.stringify(this.getData(), null, 2);
  }

  /**
   * Import data from JSON string
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return this.saveData(data);
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }

  /**
   * Update study streak
   */
  updateStudyStreak() {
    const data = this.getData();
    const today = new Date().toDateString();
    const lastStudy = data.user.lastStudyDate;
    
    if (lastStudy === today) {
      // Already studied today
      return data.user.studyStreak;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastStudy === yesterdayStr) {
      // Continue streak
      data.user.studyStreak++;
    } else {
      // Reset streak
      data.user.studyStreak = 1;
    }
    
    data.user.lastStudyDate = today;
    this.saveData(data);
    return data.user.studyStreak;
  }

  /**
   * Calculate and update average quiz score
   */
  updateAverageScore() {
    const quizHistory = this.get('quizHistory');
    if (!quizHistory || quizHistory.length === 0) {
      return 0;
    }
    
    const total = quizHistory.reduce((sum, quiz) => sum + quiz.score, 0);
    const average = Math.round(total / quizHistory.length);
    this.set('stats.averageScore', average);
    return average;
  }

  /**
   * Add XP and check for level up
   */
  addXP(amount) {
    const data = this.getData();
    data.user.xp += amount;
    
    // Level calculation: 100 XP per level
    const newLevel = Math.floor(data.user.xp / 100) + 1;
    const leveledUp = newLevel > data.user.level;
    
    data.user.level = newLevel;
    this.saveData(data);
    
    return { leveledUp, newLevel, totalXP: data.user.xp };
  }

  /**
   * Check if achievement is unlocked
   */
  hasAchievement(achievementId) {
    const achievements = this.get('achievements');
    return achievements.some(a => a.id === achievementId);
  }

  /**
   * Unlock achievement
   */
  unlockAchievement(achievement) {
    if (this.hasAchievement(achievement.id)) {
      return false; // Already unlocked
    }
    
    const achievementData = {
      ...achievement,
      unlockedAt: new Date().toISOString()
    };
    
    this.push('achievements', achievementData);
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
