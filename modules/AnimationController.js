/**
 * AnimationController.js
 * Handles scroll animations, transitions, and Intersection Observer
 */

class AnimationController {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    this.initScrollAnimations();
    this.initNavHighlight();
  }

  /**
   * Initialize scroll-triggered animations using Intersection Observer
   */
  initScrollAnimations() {
    const options = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Don't unobserve - allow re-animation on re-scroll
        }
      });
    }, options);

    // Observe all animatable elements
    this.observeElements();
  }

  /**
   * Observe elements for scroll animation
   */
  observeElements() {
    const selectors = [
      '.card',
      '.card-grid .card',
      '.rec-card',
      'section',
      'table',
      '.dashboard-card',
      '.category-progress-item',
      '.achievement-badge',
      '.grammar-section'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('animate-on-scroll');
        this.observer.observe(el);
      });
    });
  }

  /**
   * Re-observe new elements (after dynamic content load)
   */
  refresh() {
    this.observeElements();
  }

  /**
   * Initialize navigation highlight on scroll
   */
  initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a');

    if (sections.length === 0 || navLinks.length === 0) return;

    const options = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('nav-active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, options);

    sections.forEach(section => navObserver.observe(section));
  }

  /**
   * Stagger animation for grid items
   */
  staggerAnimation(container, delay = 100) {
    const items = container.querySelectorAll('.card, .rec-card, .dashboard-card');
    items.forEach((item, index) => {
      item.style.animationDelay = `${index * delay}ms`;
      item.classList.add('animate-stagger');
    });
  }

  /**
   * Animate counter number
   */
  animateCounter(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.round(current);
      }
    }, 16);
  }

  /**
   * Smooth page section reveal
   */
  revealSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.classList.add('section-reveal');
    setTimeout(() => {
      section.classList.remove('section-reveal');
    }, 800);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationController;
}
