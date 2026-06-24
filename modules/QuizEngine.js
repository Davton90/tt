/**
 * QuizEngine.js
 * Handles quiz generation, scoring, and quiz UI
 */

class QuizEngine {
  constructor(storage, ui, audio) {
    this.storage = storage;
    this.ui = ui;
    this.audio = audio;
    this.currentQuiz = null;
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.timer = null;
    this.timeLeft = 0;
    this.onComplete = null;
  }

  /**
   * Start a quiz for a specific category
   */
  startQuiz(category, onComplete) {
    const questions = this.shuffleArray([...(CONTENT_DATA.quizzes[category] || [])]);
    if (questions.length === 0) {
      this.ui.showToast('Quiz belum tersedia untuk kategori ini', 'warning');
      return;
    }

    this.currentQuiz = {
      category: category,
      questions: questions,
      totalQuestions: questions.length
    };
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.onComplete = onComplete;

    this.renderQuizUI();
    this.ui.openModal('quizModal');
  }

  /**
   * Render the quiz modal UI
   */
  renderQuizUI() {
    const modal = document.getElementById('quizModal');
    if (!modal) return;

    const q = this.currentQuiz.questions[this.currentIndex];
    const progress = ((this.currentIndex) / this.currentQuiz.totalQuestions) * 100;

    modal.querySelector('.modal-content').innerHTML = `
      <div class="quiz-header">
        <h3>Quiz: ${this.getCategoryName(this.currentQuiz.category)}</h3>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width: ${progress}%"></div>
        </div>
        <p class="quiz-counter">Soal ${this.currentIndex + 1} / ${this.currentQuiz.totalQuestions}</p>
        <p class="quiz-score">Skor: ${this.score}</p>
      </div>
      <div class="quiz-body">
        <p class="quiz-question">${q.question}</p>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <button class="quiz-option" data-index="${i}" onclick="app.quizEngine.selectAnswer(${i})">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Handle answer selection
   */
  selectAnswer(index) {
    const q = this.currentQuiz.questions[this.currentIndex];
    const isCorrect = index === q.correct;

    this.answers.push({
      questionIndex: this.currentIndex,
      selected: index,
      correct: q.correct,
      isCorrect: isCorrect
    });

    if (isCorrect) {
      this.score += 10;
      this.ui.showToast('Benar! +10 XP', 'success', 1500);
    } else {
      this.ui.showToast(`Salah! Jawaban: ${q.options[q.correct]}`, 'error', 2500);
    }

    // Highlight correct/wrong
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
      opt.disabled = true;
      if (i === q.correct) opt.classList.add('option-correct');
      if (i === index && !isCorrect) opt.classList.add('option-wrong');
    });

    // Play audio for correct answer
    if (this.audio) {
      const correctText = q.options[q.correct];
      this.audio.speakNormal(correctText);
    }

    // Next question after delay
    setTimeout(() => {
      this.currentIndex++;
      if (this.currentIndex < this.currentQuiz.totalQuestions) {
        this.renderQuizUI();
      } else {
        this.finishQuiz();
      }
    }, 1500);
  }

  /**
   * Finish quiz and show results
   */
  finishQuiz() {
    const percentage = Math.round((this.score / (this.currentQuiz.totalQuestions * 10)) * 100);
    const passed = percentage >= 60;

    // Save quiz result
    const result = {
      category: this.currentQuiz.category,
      score: this.score,
      percentage: percentage,
      totalQuestions: this.currentQuiz.totalQuestions,
      answers: this.answers,
      date: new Date().toISOString(),
      passed: passed
    };

    this.storage.push('quizHistory', result);
    this.storage.increment('stats.quizzesTaken');
    this.storage.updateAverageScore();

    // Add XP
    const xpResult = this.storage.addXP(this.score);

    // Check achievements
    this.checkQuizAchievements(result);

    // Render results
    const modal = document.getElementById('quizModal');
    modal.querySelector('.modal-content').innerHTML = `
      <div class="quiz-results">
        <h2>${passed ? 'Luar Biasa!' : 'Terus Semangat!'}</h2>
        <div class="quiz-result-icon">${passed ? '&#127942;' : '&#128170;'}</div>
        <div class="quiz-result-score">${percentage}%</div>
        <p class="quiz-result-detail">${this.score} poin dari ${this.currentQuiz.totalQuestions * 10}</p>
        <p class="quiz-result-xp">+${this.score} XP</p>
        ${passed ? '<p class="quiz-result-message">Kamu telah menguasai materi ini!</p>' : ''}
        <div class="quiz-result-actions">
          <button class="btn btn-primary" onclick="app.quizEngine.restartQuiz()">Ulangi Quiz</button>
          <button class="btn btn-secondary" onclick="app.ui.closeModal('quizModal')">Tutup</button>
        </div>
      </div>
    `;

    if (passed) {
      this.ui.showConfetti();
      // Update category progress
      const currentProgress = this.storage.get(`progress.${this.currentQuiz.category}`) || 0;
      this.storage.set(`progress.${this.currentQuiz.category}`, Math.min(100, currentProgress + 20));
    }

    if (xpResult.leveledUp) {
      setTimeout(() => this.ui.showLevelUp(xpResult.newLevel), 1000);
    }

    this.ui.showXPPopup(this.score);

    if (this.onComplete) this.onComplete(result);
  }

  /**
   * Restart current quiz
   */
  restartQuiz() {
    this.startQuiz(this.currentQuiz.category, this.onComplete);
  }

  /**
   * Check and unlock quiz-related achievements
   */
  checkQuizAchievements(result) {
    // First quiz completed
    this.storage.unlockAchievement({
      id: 'first_steps',
      name: 'Langkah Pertama',
      description: 'Selesaikan quiz pertama',
      icon: '🌟',
      xpReward: 10
    });

    // Quiz master - 10 quizzes
    const quizzesTaken = this.storage.get('stats.quizzesTaken');
    if (quizzesTaken >= 10) {
      this.storage.unlockAchievement({
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Selesaikan 10 quiz',
        icon: '🏆',
        xpReward: 40
      });
    }

    // Perfectionist - check for 100% scores
    if (result.percentage === 100) {
      const perfectScores = this.storage.get('quizHistory')
        .filter(q => q.percentage === 100).length;
      if (perfectScores >= 5) {
        this.storage.unlockAchievement({
          id: 'perfectionist',
          name: 'Perfeksionis',
          description: 'Skor 100% di 5 quiz',
          icon: '💯',
          xpReward: 30
        });
      }
    }
  }

  /**
   * Get category display name
   */
  getCategoryName(category) {
    const names = {
      salam: 'Salam & Ungkapan',
      angka: 'Angka',
      hari: 'Hari',
      warna: 'Warna',
      ganti: 'Kata Ganti',
      kosakata: 'Kosakata',
      grammar: 'Tata Bahasa'
    };
    return names[category] || category;
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizEngine;
}
