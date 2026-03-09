# Copilot Instructions for Emanon

## Project Overview

**Emanon** is a Windows 98-themed retro personal website with a fully frontend architecture. No backend or database required—deploy as static files.

- **Build Tool**: Webpack 5 with EJS templating
- **Routing**: PJAX for seamless page transitions without reloads
- **Content**: Markdown articles → auto-generated HTML via `post.js`
- **Config**: JSON-driven architecture (language, articles, galleries, games)
- **Multi-language**: Dynamic language switching with user preference persistence (v3.1)
- **UI**: 98.css + custom CSS with optional CRT scan line effects

## Architecture & Key Patterns

### Webpack Build Pipeline

**Entry Point**: `js/index.js` → imports CSS + calls `initializeApp()`

**Key Configuration** (`webpack.config.js`):
- **EJS Template Processing**: Each page template in `ejs/pages/*.ejs` gets auto-compiled via HtmlWebpackPlugin
- **Resource Handling**: Webpack is configured to **bypass** default asset processing (`type: 'javascript/auto'`) to preserve static file structure
- **CSS Extraction**: Production uses `MiniCssExtractPlugin` (outputs to `styles.css`); dev uses style-loader
- **Dev Server**: Watches `ejs/**/*.ejs` for HMR; starts on `http://localhost:8080`

**Build Commands**:
- `npm start` → webpack-dev-server with hot reload
- `npm pack` → production webpack build
- `npm post` → generate articles from Markdown (see below)
- `npm build` → full pipeline: post generation + production webpack

### Application Initialization Flow

**File**: `js/main.js` (contains `initializeApp()`)

```
1. LangManager.init()           // Load language config, restore user's language choice
2. initializeRandomLogo()        // Homepage only
3. loadResources()               // CDN-load Pjax with multi-source failover
4. new Pjax()                    // Configure seamless page transitions
5. new TabHandler()              // Setup top navigation tabs
6. pjax:complete listener        // Route-specific initialization via handlePageLoad()
7. handlePageLoad()              // Execute page-specific logic based on URL
```

**Page Routing** (via `handlePageLoad()`):
- `/` → updateProgressBar() + initializeDailyPopup()
- `/page/article.html` → loadPreviewLinks()
- `/page/game.html` → gameList() + initGameRoll()
- `/page/gallery.html` → initializeGallery()
- All pages → footerLoader(), handleScrollAndScrollToTop(), initializeTips(), initCRT()

### Multi-Language System (v3.1)

**File**: `js/langManager.js` (exported as default singleton)

**Pattern**:
1. DOM elements declare language strings via `data-lang-id` attributes
2. LangManager observes DOM changes and auto-updates text
3. User language preference persists in localStorage (`user_lang` key)
4. Language data loaded from `cfg/lang_cfg.json`

**Usage in HTML**:
```html
<span data-lang-id="my_text_key"></span>
<button data-lang-id="button_save" data-lang-placeholder="[username]"></button>
```

**Key Methods**:
- `langManager.init()` → Load config, restore user's language, observe DOM
- `langManager.setCurrentLang(lang)` → Switch language globally
- `langManager.translate(id, params)` → Get translated text programmatically

### Content Management

#### Article Pipeline

**Markdown Source** → `post/_src/*.md`  
**Config**: `cfg/article_cfg.json` (manually maintained)  
**Build Script**: `post/_src/post.js`

**Flow**:
1. Read all `.md` files from `post/_src/`
2. Extract title from first line (`# Title`)
3. Parse remaining Markdown to HTML via `marked`
4. Wrap in `post/_src/template.html`
5. Minify and write to `post/<article-slug>/index.html`

**Important**: Run `npm post` or `npm build` after adding/editing articles. Config must be manually updated in `article_cfg.json` (id, url, name, icon).

#### Config-Driven Content

Configs loaded via dynamic imports and used to populate lists:

- `cfg/article_cfg.json` → Article preview list (previewLoader.js)
- `cfg/gallery_cfg.json` → Gallery grid (gallery.js)
- `cfg/game_time_cfg.json` → Game/record list (gameList.js)
- `cfg/lang_cfg.json` → All UI text translations

**Pattern**: Each config is a JSON array of objects. Loader modules (e.g., `previewLoader.js`) iterate the config and dynamically generate DOM.

### CDN Resource Loading (`js/cdnLoader.js`)

**Multi-Source Failover Pattern**:
```javascript
// Try multiple CDN URLs in parallel (Promise.any)
// Falls back to sequential loading if fetch fails
// Uses blob injection to prevent multiple script execution
```

**Configured**: Pjax library has 3 fallback sources (github.elemecdn.com, jsdelivr.net, unpkg.com)

**Why**: Static hosting may have CORS/availability issues; multiple sources increase reliability.

### PJAX Integration

**File**: `js/tabHandler.js`

- Intercepts navigation clicks (`data-pjax` attribute)
- Replaces `<title>` and `#main` content only (no full page reload)
- Triggers `pjax:complete` event after content swap
- Tabs are rebuilt after PJAX navigation to re-bind events

**Preloading**: TabHandler preloads all tab content (headers) to cache in PJAX

### Module-Specific Patterns

| Module | Purpose | Key Function |
|--------|---------|--------------|
| `tabHandler.js` | Top navigation tabs | `new TabHandler(selector, tabData, pjax)` |
| `progressBar.js` | Year/month/day progress (index) | `updateProgressBar()` |
| `previewLoader.js` | Article preview cards (article page) | `loadPreviewLinks(pjax, tabHandler)` |
| `gameList.js` | Game/record list | `gameList()` |
| `gameRoll.js` | Random game recommender | `initGameRoll()` |
| `gallery.js` | Image gallery grid | `initializeGallery()` |
| `dailyPopup.js` | Daily message popup + language switcher | `initializeDailyPopup()` |
| `crtEffect.js` | CRT scan line toggle | `initCRT()` (preference in localStorage) |
| `logoRandomizer.js` | Random logo on page load | `initializeRandomLogo()` |
| `tips.js` | Hover tooltips | `initializeTips()` |
| `scrollToTop.js` | Scroll monitoring + top button | `handleScrollAndScrollToTop()` |
| `footerLoader.js` | Load footer content | `footerLoader()` |

## Developer Workflows

### Adding a New Article

1. Write Markdown file: `post/_src/my_article.md` (first line is title)
2. Add entry to `cfg/article_cfg.json`: `{ "id": N, "url": "my_article", "icon": "file.png", "name": "Display Name" }`
3. Run `npm post` to generate HTML
4. Verify at `post/my_article/index.html` (via PJAX navigation)

### Adding a New Page

1. Create template: `ejs/pages/newpage.ejs`
2. Create stylesheet: `css/newpage.css`
3. Import CSS in a new module or in the template
4. Add initialization logic in `main.js` under `handlePageLoad()`
5. Add tab entry to `tabData` in `main.js`
6. Run `npm pack` to bundle

### Modifying Language Strings

1. Edit `cfg/lang_cfg.json` → add/update entry with multi-language text
2. In HTML/templates: use `<tag data-lang-id="key_id"></tag>`
3. langManager observes and updates automatically; no manual DOM manipulation needed

### Local Development

- `npm start` → Dev server with HMR
- Edit `ejs/`, `js/`, `css/` → auto-rebuild and refresh
- Edit `cfg/*.json` → requires manual refresh (not watched by Webpack)
- Edit `post/_src/*.md` → manually run `npm post` then refresh

## Critical Implementation Details

### EJS in Webpack

- Templates at `ejs/pages/*.ejs` → compiled during build
- Nested includes: `<%- include('../templates/header.ejs') %>`
- Each template receives `titleId` parameter (used by langManager)
- HTML loader has `sources: false` → no URL rewriting; all asset paths are relative or absolute

### Event Delegation Pattern

After PJAX page load, DOM listeners must be re-attached. Example in `tabHandler.js`:
```javascript
document.addEventListener('pjax:complete', () => {
  // Re-init components on new page content
  handlePageLoad();
});
```

### localStorage Usage

- `user_lang` → User's selected language
- `crt_enabled` → CRT effect preference
- Preference loading: happens in module constructors or init functions

### Avoiding Common Pitfalls

1. **Don't hardcode URLs** for internal links; use `data-pjax` attribute for seamless navigation
2. **Config changes** (JSON files) don't trigger HMR; manually refresh browser
3. **PJAX cache**: TabHandler explicitly preloads all pages to cache headers
4. **Language update**: langManager auto-updates DOM with `data-lang-id`; don't manually update text
5. **Resource handling**: Webpack configured to NOT process images/fonts; they're served as-is from root

## File References

**Key Architecture Files**:
- `js/main.js` → Application coordinator
- `webpack.config.js` → Build pipeline
- `cfg/lang_cfg.json` → All UI text (update when adding strings)
- `cfg/article_cfg.json`, `cfg/gallery_cfg.json`, `cfg/game_time_cfg.json` → Content lists
- `post/_src/post.js` → Article generation

**Template Skeleton**:
- `ejs/templates/header.ejs` → `<head>` with langManager integration
- `ejs/templates/function.ejs` → Script imports and initialization
