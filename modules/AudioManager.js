/**
 * AudioManager.js
 * Handles Text-to-Speech and audio playback for French pronunciation
 */

class AudioManager {
  constructor(storage) {
    this.storage = storage;
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.frenchVoice = null;
    this.init();
  }

  init() {
    this.loadVoices();
    // Some browsers load voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    // Find best French voice
    this.frenchVoice = this.voices.find(v => v.lang.startsWith('fr') && v.name.includes('Google')) ||
                       this.voices.find(v => v.lang.startsWith('fr') && v.name.includes('Thomas')) ||
                       this.voices.find(v => v.lang.startsWith('fr') && v.name.includes('Amelie')) ||
                       this.voices.find(v => v.lang.startsWith('fr'));
  }

  /**
   * Speak text in French
   */
  speak(text, speed = null) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';

    if (this.frenchVoice) {
      utterance.voice = this.frenchVoice;
    }

    const voiceSpeed = speed || this.storage.get('settings.voiceSpeed') || 1.0;
    utterance.rate = voiceSpeed;
    utterance.pitch = 1;

    return new Promise((resolve) => {
      utterance.onend = resolve;
      utterance.onerror = resolve;
      this.synth.speak(utterance);
    });
  }

  /**
   * Speak slowly (0.5x speed) for learning
   */
  speakSlow(text) {
    return this.speak(text, 0.5);
  }

  /**
   * Speak normally (1.0x speed)
   */
  speakNormal(text) {
    return this.speak(text, 1.0);
  }

  /**
   * Stop any ongoing speech
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Check if speech is supported
   */
  isSupported() {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available French voices
   */
  getFrenchVoices() {
    return this.voices.filter(v => v.lang.startsWith('fr'));
  }

  /**
   * Set voice speed preference
   */
  setSpeed(speed) {
    this.storage.set('settings.voiceSpeed', speed);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
