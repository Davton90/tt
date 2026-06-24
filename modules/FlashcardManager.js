/**
 * FlashcardManager.js
 * Handles flashcard system with category filter and spaced repetition
 */

class FlashcardManager {
  constructor(storage, ui, audio) {
    this.storage = storage;
    this.ui = ui;
    this.audio = audio;
    this.currentDeck = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.onComplete = null;
    this.currentCategory = 'all';
    this.categories = [];
  }

  /**
   * Get available vocabulary categories
   */
  getCategories() {
    const categories = [];
    if (CONTENT_DATA && CONTENT_DATA.vocabulary) {
      Object.keys(CONTENT_DATA.vocabulary).forEach(cat => {
        if (CONTENT_DATA.vocabulary[cat] && CONTENT_DATA.vocabulary[cat].length > 0) {
          const item = CONTENT_DATA.vocabulary[cat][0];
          const wordKey = Object.keys(item).find(k => k !== 'id' && k !== 'note');
          categories.push({
            id: cat,
            name: this.getCategoryName(cat),
            count: CONTENT_DATA.vocabulary[cat].length
          });
        }
      });
    }
    return categories;
  }

  /**
   * Get human-readable category name
   */
  getCategoryName(cat) {
    const names = {
      salam: 'Salam & Perkenalan',
      angka: 'Angka',
      hari: 'Hari',
      warna: 'Warna',
      ganti: 'Kata Ganti',
      keluarga: 'Keluarga',
      makanan: 'Makanan & Minuman',
      tempat: 'Tempat',
      profesi: 'Profesi',
      emosi: 'Emosi',
      verbes: 'Kata Kerja',
      bodyParts: 'Bagian Tubuh',
      clothing: 'Pakaian & Aksesori',
      house: 'Rumah & Ruangan',
      nature: 'Alam',
      animalsDomestic: 'Hewan Peliharaan',
      animalsWild: 'Hewan Liar',
      animalsSea: 'Hewan Laut',
      insects: 'Serangga',
      foodExtended: 'Makanan Lanjutan',
      transportation: 'Transportasi',
      technology: 'Teknologi',
      schoolEducation: 'Pendidikan',
      workOffice: 'Kantor & Kerja',
      sportsActivities: 'Olahraga',
      hobbiesLeisure: 'Hobi & Waktu Luang',
      healthMedical: 'Kesehatan',
      professionsExtended: 'Profesi Lanjutan',
      cityPlaces: 'Tempat di Kota',
      weatherClimate: 'Cuaca & Iklim',
      timeExtended: 'Waktu',
      directionsPositions: 'Arah & Posisi',
      quantitiesMeasurements: 'Jumlah & Pengukuran',
      adjectivesDescriptions: 'Kata Sifat',
      verbsExtended: 'Kata Kerja Lanjutan',
      abstractConcepts: 'Konsep Abstrak'
    };
    return names[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  /**
   * Start flashcard session for a category
   */
  startSession(category, onComplete) {
    this.currentCategory = category;
    let cards = [];

    if (category === 'all') {
      Object.keys(CONTENT_DATA.vocabulary).forEach(cat => {
        const vocab = CONTENT_DATA.vocabulary[cat];
        if (vocab && vocab.length > 0) {
          cards = cards.concat(
            vocab.map(item => ({ ...item, category: cat }))
          );
        }
      });
    } else {
      const vocab = CONTENT_DATA.vocabulary[category];
      if (!vocab || vocab.length === 0) {
        this.ui.showToast('Kosakata belum tersedia', 'warning');
        return;
      }
      cards = vocab.map(item => ({ ...item, category: category }));
    }

    this.currentDeck = this.shuffleArray(cards);
    this.currentIndex = 0;
    this.isFlipped = false;
    this.onComplete = onComplete;

    this.renderFlashcardUI();
    this.ui.openModal('flashcardModal');
  }

  /**
   * Render flashcard UI with category filter
   */
  renderFlashcardUI() {
    const modal = document.getElementById('flashcardModal');
    if (!modal) return;

    const card = this.currentDeck[this.currentIndex];
    if (!card) return;

    const progress = ((this.currentIndex) / this.currentDeck.length) * 100;
    const categories = this.getCategories();

    modal.querySelector('.modal-content').innerHTML = `
      <div class="flashcard-header">
        <h3>Kartu Saku</h3>
        <div class="flashcard-filter">
          <label for="flashcardCategory">Filter Kategori:</label>
          <select id="flashcardCategory" onchange="app.flashcardManager.changeCategory(this.value)">
            <option value="all" ${this.currentCategory === 'all' ? 'selected' : ''}>Semua Kategori (${this.getTotalCount()})</option>
            ${categories.map(cat => `
              <option value="${cat.id}" ${this.currentCategory === cat.id ? 'selected' : ''}>
                ${cat.name} (${cat.count})
              </option>
            `).join('')}
          </select>
        </div>
        <p class="flashcard-counter">${this.currentIndex + 1} / ${this.currentDeck.length}</p>
        <div class="flashcard-progress-bar">
          <div class="flashcard-progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      <div class="flashcard-body">
        <div class="flashcard" id="currentFlashcard" onclick="app.flashcardManager.flipCard()">
          <div class="flashcard-inner" id="flashcardInner">
            <div class="flashcard-front">
              <p class="flashcard-lang">${this.getLanguageLabel()}</p>
              <p class="flashcard-text">${this.getCardContent(card, 'front')}</p>
              <button class="btn-icon btn-speak" onclick="event.stopPropagation(); app.audio.speak('${this.getCardContent(card, 'front').replace(/'/g, "\\'")}')">
                &#128264;
              </button>
            </div>
            <div class="flashcard-back">
              <p class="flashcard-lang">Bahasa Indonesia</p>
              <p class="flashcard-text">${card.id}</p>
              ${card.note ? `<p class="flashcard-note">${card.note}</p>` : ''}
            </div>
          </div>
        </div>
        <p class="flashcard-hint">Klik kartu untuk membalik</p>
      </div>
      <div class="flashcard-actions">
        <button class="btn btn-flashcard btn-hard" onclick="app.flashcardManager.rateCard('hard')">
          &#128532; Belum Tahu
        </button>
        <button class="btn btn-flashcard btn-ok" onclick="app.flashcardManager.rateCard('ok')">
          &#128528; Masih Ingat
        </button>
        <button class="btn btn-flashcard btn-easy" onclick="app.flashcardManager.rateCard('easy')">
          &#128513; Mudah
        </button>
      </div>
      <div class="flashcard-nav">
        <button class="btn btn-sm btn-secondary" onclick="app.flashcardManager.prevCard()" ${this.currentIndex === 0 ? 'disabled' : ''}>
          &#8592; Sebelumnya
        </button>
        <button class="btn btn-sm btn-secondary" onclick="app.ui.closeModal('flashcardModal')">
          Tutup
        </button>
        <button class="btn btn-sm btn-secondary" onclick="app.flashcardManager.nextCard()" ${this.currentIndex >= this.currentDeck.length - 1 ? 'disabled' : ''}>
          Selanjutnya &#8594;
        </button>
      </div>
    `;
  }

  /**
   * Get language-specific content key
   */
  getCardContent(card, side) {
    if (side === 'front') {
      return card.fr || card.es || card.it || card.de || card.ru || '';
    }
    return card.id || '';
  }

  /**
   * Get language label based on content structure
   */
  getLanguageLabel() {
    if (CONTENT_DATA.vocabulary && Object.keys(CONTENT_DATA.vocabulary).length > 0) {
      const firstCat = Object.keys(CONTENT_DATA.vocabulary)[0];
      const firstItem = CONTENT_DATA.vocabulary[firstCat][0];
      if (firstItem.fr) return 'Bahasa Prancis';
      if (firstItem.es) return 'Bahasa Spanyol';
      if (firstItem.it) return 'Bahasa Italia';
      if (firstItem.de) return 'Bahasa Jerman';
      if (firstItem.ru) return 'Bahasa Rusia';
    }
    return 'Bahasa Asing';
  }

  /**
   * Get total vocabulary count
   */
  getTotalCount() {
    let total = 0;
    if (CONTENT_DATA && CONTENT_DATA.vocabulary) {
      Object.keys(CONTENT_DATA.vocabulary).forEach(cat => {
        total += (CONTENT_DATA.vocabulary[cat] || []).length;
      });
    }
    return total;
  }

  /**
   * Change category filter
   */
  changeCategory(category) {
    this.startSession(category, this.onComplete);
  }

  /**
   * Flip flashcard
   */
  flipCard() {
    this.isFlipped = !this.isFlipped;
    const inner = document.getElementById('flashcardInner');
    if (inner) {
      inner.classList.toggle('flipped', this.isFlipped);
    }

    if (!this.isFlipped && this.audio) {
      const card = this.currentDeck[this.currentIndex];
      const frontText = this.getCardContent(card, 'front');
      this.audio.speakNormal(frontText);
    }
  }

  /**
   * Rate card difficulty (spaced repetition)
   */
  rateCard(difficulty) {
    const card = this.currentDeck[this.currentIndex];
    const word = this.getCardContent(card, 'front');
    const key = `${card.category}_${word}`;
    const progress = this.storage.get(`flashcardProgress.${key}`) || {
      box: 1,
      reviews: 0,
      correct: 0
    };

    progress.reviews++;
    this.storage.increment('stats.flashcardsReviewed');

    switch (difficulty) {
      case 'easy':
        progress.box = Math.min(5, progress.box + 1);
        progress.correct++;
        this.ui.showToast('Bagus! Dipindahkan ke box lebih tinggi', 'success', 1500);
        break;
      case 'ok':
        progress.box = Math.min(5, progress.box + 1);
        progress.correct++;
        break;
      case 'hard':
        progress.box = Math.max(1, progress.box - 1);
        break;
    }

    this.storage.set(`flashcardProgress.${key}`, progress);

    const totalReviews = this.storage.get('stats.flashcardsReviewed');
    if (totalReviews >= 10) {
      this.storage.unlockAchievement({ id: 'flashcard_10', title: 'Penjelajah Kata', icon: '🃏' });
    }
    if (totalReviews >= 50) {
      this.storage.unlockAchievement({ id: 'flashcard_50', title: 'Kolektor Kata', icon: '📦' });
    }
    if (totalReviews >= 100) {
      this.storage.unlockAchievement({ id: 'flashcard_100', title: 'Ahli Kosakata', icon: '🎓' });
    }
    if (totalReviews >= 500) {
      this.storage.unlockAchievement({ id: 'flashcard_500', title: 'Penguasa Kosakata', icon: '🧠' });
    }

    const xpAmount = difficulty === 'easy' ? 3 : difficulty === 'ok' ? 2 : 1;
    this.storage.addXP(xpAmount);

    this.nextCard();
  }

  /**
   * Go to next card
   */
  nextCard() {
    if (this.currentIndex < this.currentDeck.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.renderFlashcardUI();
    } else {
      this.finishSession();
    }
  }

  /**
   * Go to previous card
   */
  prevCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      this.renderFlashcardUI();
    }
  }

  /**
   * Finish flashcard session
   */
  finishSession() {
    const reviewed = this.currentIndex + 1;
    this.ui.showToast(`Sesi selesai! ${reviewed} kartu direview`, 'success', 3000);

    const wordsLearned = this.countUniqueWordsLearned();
    if (wordsLearned >= 100) {
      this.storage.unlockAchievement({ id: 'word_explorer', title: 'Penjelajah Kata', icon: '🔤' });
    }
    if (wordsLearned >= 500) {
      this.storage.unlockAchievement({ id: 'vocabulary_champion', title: 'Juara Kosakata', icon: '📚' });
    }

    this.ui.closeModal('flashcardModal');

    if (this.onComplete) this.onComplete({ reviewed });
  }

  /**
   * Count unique words learned
   */
  countUniqueWordsLearned() {
    const progress = this.storage.get('flashcardProgress') || {};
    return Object.keys(progress).filter(key => progress[key].box >= 3).length;
  }

  /**
   * Shuffle array
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlashcardManager;
}
