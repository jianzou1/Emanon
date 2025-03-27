/**
 * 多语言管理器 (稳定版 v2.6)
 * 优化：模块化重构，增强API暴露，配置灵活化
 */
class LangManager {
    // 静态配置默认值
    static DEFAULT_CONFIG = {
      debug: false,
      version: '2.6',
      fallbackLang: 'en',
      storageKey: 'lang_data_v5',
      langFile: '/cfg/lang_cfg.json',
      observerOptions: {
        subtree: true,
        childList: true,
        attributeFilter: ['data-lang-id']
      },
      logger: console
    };
  
    constructor(config = {}) {
      // 合并配置
      this.config = { ...LangManager.DEFAULT_CONFIG, ...config };
      // 状态初始化
      this.currentLang = this.config.fallbackLang;
      this.langData = {};
      this.isInitialized = false;
      this.domObserver = null;
      this.updateInProgress = false;
    }
  
    // 日志工具方法
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
  
    // 核心功能方法
    async #loadLanguageData() {
      try {
        const cached = localStorage.getItem(this.config.storageKey);
        if (cached) {
          const { version, data } = JSON.parse(cached);
          if (version === this.config.version) {
            this.langData = data;
            this.#log('使用缓存语言数据');
            return true;
          }
        }
  
        const response = await fetch(`${this.config.langFile}?v=${this.config.version}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
        const rawData = await response.json();
        this.langData = rawData.reduce((acc, item) => {
          if (!item.id) {
            this.#warn('忽略无效条目:', item);
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
        this.#error('语言数据加载失败:', err);
        this.langData = {};
        return false;
      }
    }
  
    #applyTranslations() {
      if (this.updateInProgress) return;
      this.updateInProgress = true;
  
      const elements = document.querySelectorAll('[data-lang-id]');
      this.#log(`翻译 ${elements.length} 个元素`);
  
      elements.forEach(element => {
        const id = element.dataset.langId;
        if (!id) return;
  
        const translations = this.langData[id] || {};
        const text = translations[this.currentLang] || translations[this.config.fallbackLang] || id;
        const params = JSON.parse(element.dataset.langParams || '[]');
  
        element.textContent = params.reduce(
          (str, param, i) => str.replace(new RegExp(`\\{${i}\\}`, 'g'), param),
          text
        );
      });
  
      this.updateInProgress = false;
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
  
        this.#log(`切换语言至: ${lang}`);
        this.currentLang = lang;
        localStorage.setItem('user_lang', lang);
        this.#applyTranslations();
      });
  
      this.#log('安全绑定语言切换器');
    }
  
    #startSmartObserver() {
      if (this.domObserver) return;
  
      this.domObserver = new MutationObserver((mutations) => {
        if (this.updateInProgress) return;
  
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
          this.#log('检测到有效DOM变化');
          this.#applyTranslations();
          this.#safeBindSwitcher();
        }
      });
  
      this.domObserver.observe(document.body, this.config.observerOptions);
      this.#log('启动智能DOM监控');
    }
  
    // 公开API方法 ============================================
    async init(defaultLang = this.config.fallbackLang) {
      if (this.isInitialized) return;
  
      await new Promise(resolve => {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve);
      });
  
      this.currentLang = localStorage.getItem('user_lang') || defaultLang;
      await this.#loadLanguageData();
      
      this.#applyTranslations();
      this.#safeBindSwitcher();
      this.#startSmartObserver();
      
      this.isInitialized = true;
      this.#log('初始化完成');
    }
  
    translate(id, ...params) {
      const translations = this.langData[id] || {};
      const text = translations[this.currentLang] || translations[this.config.fallbackLang] || id;
      return params.reduce(
        (str, param, i) => str.replace(new RegExp(`\\{${i}\\}`, 'g'), param),
        text
      );
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
      this.#log('配置已更新');
    }
  
    enableDebug(enable = true) {
      this.config.debug = enable;
      this.#log(`调试模式 ${enable ? '开启' : '关闭'}`);
    }
  }
  
  // 创建单例实例并暴露全局
  const langManager = new LangManager();
  window.LangManager = langManager;
  export default langManager;