/**
 * Multilingual Manager (v2.8)
 * Features:
 * - Only translates <title> when data-lang-id is present
 * - Full document monitoring
 * - Parameterized translations
 * - Optimized DOM observation
 */
class LangManager {
  // Static configuration defaults
  static DEFAULT_CONFIG = {
    debug: false,
    version: '2.8',
    fallbackLang: 'en',
    storageKey: 'lang_data_v5',
    langFile: '/cfg/lang_cfg.json',
    observerOptions: {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-lang-id', 'data-lang-params']
    },
    logger: console
  };

  constructor(config = {}) {
    this.config = { ...LangManager.DEFAULT_CONFIG, ...config };
    this.currentLang = this.config.fallbackLang;
    this.langData = {};
    this.isInitialized = false;
    this.domObserver = null;
    this.updateInProgress = false;
    this.pendingUpdates = new Set();
  }

  // Logging utilities
  #log(...args) {
    if (this.config.debug) {
      this.config.logger.log('%c[Lang]', 'color: #4CAF50;', ...args);
    }
  }

  #warn(...args) {
    this.config.logger.warn('%c[Lang]', 'color: #FFC107;', ...args);
  }

  #error(...args) {
    this.config.logger.error('%c[Lang]', 'color: #F44336;', ...args);
  }

  // Core functionality
  async #loadLanguageData() {
    try {
      const cached = localStorage.getItem(this.config.storageKey);
      if (cached) {
        const { version, data } = JSON.parse(cached);
        if (version === this.config.version) {
          this.langData = data;
          this.#log('Using cached language data');
          return true;
        }
      }

      const response = await fetch(`${this.config.langFile}?v=${this.config.version}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawData = await response.json();
      this.langData = rawData.reduce((acc, item) => {
        if (!item.id) {
          this.#warn('Skipping invalid entry:', item);
          return acc;
        }
        acc[item.id] = Object.entries(item).reduce((o, [k, v]) => {
          if (k !== 'id') o[k] = v;
          return o;
        }, {});
        return acc;
      }, {});

      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify({ version: this.config.version, data: this.langData })
      );
      return true;
    } catch (err) {
      this.#error('Language data load failed:', err);
      this.langData = {};
      return false;
    }
  }

  #applyTranslations() {
    if (this.updateInProgress) return;
    this.updateInProgress = true;

    // Process pending updates
    this.pendingUpdates.forEach(element => {
      this.#translateElement(element);
    });
    this.pendingUpdates.clear();

    // Translate all marked elements including title
    const elements = document.querySelectorAll('[data-lang-id]');
    this.#log(`Translating ${elements.length} elements`);

    elements.forEach(element => {
      this.#translateElement(element);
    });

    this.updateInProgress = false;
  }

  #translateElement(element) {
    const id = element.dataset.langId;
    if (!id) return;

    const translations = this.langData[id] || {};
    const text = translations[this.currentLang] || translations[this.config.fallbackLang] || id;
    const params = JSON.parse(element.dataset.langParams || '[]');

    const updateMethod = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' 
      ? 'value' 
      : 'textContent';
    
    element[updateMethod] = params.reduce(
      (str, param, i) => str.replace(new RegExp(`\\{${i}\\}`, 'g'), param),
      text
    );
  }

  #safeBindSwitcher() {
    const switcher = document.getElementById('lang-switcher');
    if (!switcher) return;

    const newSwitcher = switcher.cloneNode(true);
    switcher.parentNode.replaceChild(newSwitcher, switcher);

    if (newSwitcher.value !== this.currentLang) {
      newSwitcher.value = this.currentLang;
    }

    newSwitcher.addEventListener('change', async (e) => {
      const lang = e.target.value;
      if (lang === this.currentLang) return;

      this.#log(`Switching language to: ${lang}`);
      this.currentLang = lang;
      localStorage.setItem('user_lang', lang);
      this.#applyTranslations();
    });

    this.#log('Language switcher bound');
  }

  #startSmartObserver() {
    if (this.domObserver) return;

    this.domObserver = new MutationObserver((mutations) => {
      if (this.updateInProgress) {
        // Collect elements that need updating
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute('data-lang-id')) {
                  this.pendingUpdates.add(node);
                }
                const langElements = node.querySelectorAll('[data-lang-id]');
                langElements.forEach(el => this.pendingUpdates.add(el));
              }
            });
          } else if (mutation.type === 'attributes') {
            this.pendingUpdates.add(mutation.target);
          }
        });
        return;
      }

      const needsUpdate = mutations.some(mutation => {
        return (
          (mutation.type === 'childList' && 
           Array.from(mutation.addedNodes).some(n => 
             n.nodeType === Node.ELEMENT_NODE &&
             (n.hasAttribute('data-lang-id') || 
              n.querySelector('[data-lang-id]'))
           )) ||
          (mutation.type === 'attributes' && 
           (mutation.attributeName === 'data-lang-id' ||
            mutation.attributeName === 'data-lang-params'))
        );
      });

      if (needsUpdate) {
        this.#log('Detected relevant DOM changes');
        this.#applyTranslations();
        this.#safeBindSwitcher();
      }
    });

    this.domObserver.observe(document.documentElement, this.config.observerOptions);
    this.#log('Started document-wide observer');
  }

  // Public API =============================================
  async init(defaultLang = this.config.fallbackLang) {
    if (this.isInitialized) return;

    await new Promise(resolve => {
      document.readyState === 'complete' ? resolve() : window.addEventListener('load', resolve);
    });

    this.currentLang = localStorage.getItem('user_lang') || defaultLang;
    await this.#loadLanguageData();
    
    this.#applyTranslations();
    this.#safeBindSwitcher();
    this.#startSmartObserver();
    
    this.isInitialized = true;
    this.#log('Initialization complete');
  }

  translate(id, ...params) {
    const translations = this.langData[id] || {};
    const text = translations[this.currentLang] || translations[this.config.fallbackLang] || id;
    return params.reduce(
      (str, param, i) => str.replace(new RegExp(`\\{${i}\\}`, 'g'), param),
      text
    );
  }

  setTitle(id, ...params) {
    let titleElement = document.querySelector('title');
    if (!titleElement) {
      titleElement = document.createElement('title');
      document.head.appendChild(titleElement);
    }
    
    titleElement.setAttribute('data-lang-id', id);
    titleElement.dataset.langParams = JSON.stringify(params);
    this.#applyTranslations();
  }

  setLanguage(lang) {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem('user_lang', lang);
    this.#applyTranslations();
  }

  getCurrentLang() {
    return this.currentLang;
  }

  async reload() {
    await this.#loadLanguageData();
    this.#applyTranslations();
  }

  configure(newConfig) {
    Object.assign(this.config, newConfig);
    this.#log('Configuration updated');
  }

  enableDebug(enable = true) {
    this.config.debug = enable;
    this.#log(`Debug mode ${enable ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
const langManager = new LangManager();

// Global exposure with safeguards
if (typeof window !== 'undefined' && !window.LangManager) {
  window.LangManager = langManager;
}

export default langManager;