/**
 * Enhanced Multilingual Manager (v3.1)
 * New Features:
 * - Unified parameter handling
 * - DOM auto-binding
 * - Cached translations
 * - Centralized error handling
 * - Secure HTML escaping
 * - Newline to <br> conversion
 */
class LangManager {
  static DEFAULT_CONFIG = {
    debug: false,
    version: '3.1',
    fallbackLang: 'en',
    storageKey: 'lang_data_v8',
    langFile: '/cfg/lang_cfg.json',
    observerOptions: {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-lang-id']
    },
    logger: console,
    placeholderFormats: ['braced', 'numbered']
  };

  constructor(config = {}) {
    this.config = { ...LangManager.DEFAULT_CONFIG, ...config };
    this.currentLang = this.config.fallbackLang;
    this.langData = {};
    this.isInitialized = false;
    this.domObserver = null;
    this.updateInProgress = false;
    this.pendingUpdates = new Set();
    this.dynamicParams = new Map();
    this.paramCache = new Map();
  }

  // ========== PRIVATE METHODS ==========
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

  #escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  }

  #handleTranslationError(element, key, error) {
    this.#error(`Translation failed for ${key}:`, error);
    if (element) {
      element.classList.add('lang-error');
      element.setAttribute('title', `Translation error: ${key}`);
    }
    return key;
  }

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

  #replacePlaceholders(text, params = []) {
    if (!params.length) return text;

    return params.reduce((str, param, index) => {
      const escapedParam = this.#escapeHtml(param);
      if (this.config.placeholderFormats.includes('braced')) {
        str = str.replace(new RegExp(`\\{${index}\\}`, 'g'), escapedParam);
      }
      if (this.config.placeholderFormats.includes('numbered')) {
        str = str.replace(new RegExp(`%${index + 1}\\$s`, 'g'), escapedParam);
      }
      return str;
    }, text);
  }

  #applyTranslations() {
    if (this.updateInProgress) return;
    this.updateInProgress = true;

    this.pendingUpdates.forEach(element => {
      this.#translateElement(element);
    });
    this.pendingUpdates.clear();

    const elements = document.querySelectorAll('[data-lang-id]');
    elements.forEach(element => {
      this.#translateElement(element);
    });

    this.updateInProgress = false;
  }

  #translateElement(element) {
    const id = element.dataset.langId;
    if (!id) return;

    const translations = this.langData[id] || {};
    let text = translations[this.currentLang] || 
               translations[this.config.fallbackLang] || 
               id;

    const dynamicParams = this.dynamicParams.get(id) || [];
    const elementParams = JSON.parse(element.dataset.langParams || '[]');
    const allParams = [...dynamicParams, ...elementParams];

    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

    try {
      text = this.#replacePlaceholders(text, allParams);

      if (!isInput) {
        // Convert newlines to <br> and set as HTML
        text = text.replace(/\n/g, '<br>');
        element.innerHTML = text;
      } else {
        // For input elements, keep \n as is and set value
        element.value = text;
      }
    } catch (err) {
      this.#handleTranslationError(element, id, err);
      if (!isInput) {
        element.innerHTML = id;
      } else {
        element.value = id;
      }
    }
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
      this.paramCache.clear();
      this.#applyTranslations();
    });
  }

  #startSmartObserver() {
    if (this.domObserver) return;

    this.domObserver = new MutationObserver((mutations) => {
      if (this.updateInProgress) {
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
           mutation.attributeName === 'data-lang-id')
        );
      });

      if (needsUpdate) {
        this.#applyTranslations();
        this.#safeBindSwitcher();
      }
    });

    this.domObserver.observe(document.documentElement, this.config.observerOptions);
  }

  // ========== PUBLIC API ==========
  applyParameters(element, translationKey, ...params) {
    try {
      if (!element.dataset.langId) {
        element.dataset.langId = translationKey;
      }
      
      this.dynamicParams.set(translationKey, params);
      
      const translation = this.translate(translationKey, ...params);
      const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
      
      if (!isInput) {
        element.innerHTML = translation.replace(/\n/g, '<br>');
      } else {
        element.value = translation;
      }
      return true;
    } catch (error) {
      this.#handleTranslationError(element, translationKey, error);
      return false;
    }
  }

  bindDynamicElement(selector, translationKey, paramGenerator) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.dataset.langId = translationKey;
      this.dynamicParams.set(translationKey, paramGenerator(element));
      this.pendingUpdates.add(element);
    });
    this.#applyTranslations();
  }

  cachedTranslate(key, ...params) {
    const cacheKey = `${key}_${params.join('_')}`;
    if (!this.paramCache.has(cacheKey)) {
      this.paramCache.set(cacheKey, this.translate(key, ...params));
    }
    return this.paramCache.get(cacheKey);
  }

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
    const text = translations[this.currentLang] || 
                 translations[this.config.fallbackLang] || 
                 id;
    
    return this.#replacePlaceholders(text, params);
  }

  setLanguage(lang) {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem('user_lang', lang);
    this.paramCache.clear();
    
    this.dynamicParams.forEach((params, id) => {
      const elements = document.querySelectorAll(`[data-lang-id="${id}"]`);
      elements.forEach(el => this.pendingUpdates.add(el));
    });
    
    this.#applyTranslations();
  }

  getCurrentLang() {
    return this.currentLang;
  }

  setParams(id, params = []) {
    if (!Array.isArray(params)) params = [params];
    this.dynamicParams.set(id, params);
    const elements = document.querySelectorAll(`[data-lang-id="${id}"]`);
    elements.forEach(el => this.pendingUpdates.add(el));
    
    if (!this.updateInProgress) {
      this.#applyTranslations();
    }
  }

  clearParams(id) {
    this.dynamicParams.delete(id);
    this.setParams(id, []);
  }

  async reload() {
    await this.#loadLanguageData();
    this.paramCache.clear();
    this.#applyTranslations();
  }

  configure(newConfig) {
    Object.assign(this.config, newConfig);
  }

  enableDebug(enable = true) {
    this.config.debug = enable;
  }
}

// Singleton instance
const langManager = new LangManager();

// Global exposure
if (typeof window !== 'undefined' && !window.LangManager) {
  window.LangManager = langManager;
}

export default langManager;