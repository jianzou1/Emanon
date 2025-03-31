(()=>{"use strict";const t="https://npm.elemecdn.com/pjax@0.2.8/pjax.min.js",e=async()=>({Pjax:await new Promise(((e,n)=>{const a=document.createElement("script");a.src=t,a.onload=()=>e(window.Pjax),a.onerror=n,document.head.appendChild(a)}))});class n{constructor(t,e,n){this.tabList=document.querySelector(t),this.tabData=e,this.pjax=n,this.tabList&&(this.initTabs(),this.updateSelectedTab(window.location.pathname))}initTabs(){const t=this.tabData.map((t=>`\n            <li data-url="${t.url}" role="tab">\n                <a href="${t.url}" \n                   data-pjax \n                   data-lang-id="${t.text}"\n                   data-lang-params="[]"></a>\n            </li>\n        `)).join("");this.tabList.innerHTML=t,this.tabList.addEventListener("click",this.handleTabClick.bind(this))}async handleTabClick(t){const e=t.target.closest('[role="tab"]');if(!e)return;const n=e.dataset.url;if(n===window.location.pathname)return void t.preventDefault();t.preventDefault();const a=document.querySelector(".window");a&&a.classList.add("active"),this.updateSelectedTab(n);try{await this.pjax.loadUrl(n)}catch(t){}finally{a&&setTimeout((()=>{a.classList.remove("active")}),150)}}updateSelectedTab(t){this.tabList.querySelectorAll('[role="tab"]').forEach((e=>{const n=e.dataset.url,a=t===n;e.setAttribute("aria-selected",a),a?e.classList.add("active"):e.classList.remove("active")}))}}let a=!1,r=null,i=null;function o(){if(a)return;a=!0;const t=new Date,e=document.querySelector(".progress-container"),n=e?.clientWidth;if(!n)return void(a=!1);const s=Math.floor(n/30);function c(e,n,r,i){const o=(n-e)/6e4,c=(t-e)/6e4,l=Math.min(c/o*100,100),d=document.getElementById(r);if(!d)return void(a=!1);const u=Math.max(1,Math.floor(l/100*s)),m=document.getElementById(i);if(!m)return void(a=!1);m.innerHTML="",function t(e){if(e<u){const n=document.createElement("div");n.className="grid",m.appendChild(n),setTimeout((()=>t(e+1)),80*Math.random())}else a=!1}(0);let h=0;!function t(){h<l?(h+=1,d.textContent=`${Math.max(Math.floor(h),1)}%`,requestAnimationFrame(t)):d.textContent=`${Math.max(Math.floor(l),1)}%`}()}c(new Date(t.getFullYear(),0,1),new Date(t.getFullYear()+1,0,1),"progress-percentage","progress-bar"),c(new Date(t.getFullYear(),t.getMonth(),1),new Date(t.getFullYear(),t.getMonth()+1,1),"month-percentage","month-progress-bar"),c(new Date(t.getFullYear(),t.getMonth(),t.getDate()),new Date(t.getFullYear(),t.getMonth(),t.getDate()+1),"day-percentage","day-progress-bar"),function(){const t=()=>{r&&clearTimeout(r),i&&document.removeEventListener("visibilitychange",i)},e=()=>{const t=document.getElementById("refresh-timer"),n=document.getElementById("refresh-container"),a=new Date,i=3600-(60*a.getMinutes()+a.getSeconds());if(t){const e=Math.floor(i/60),a=i%60;LangManager.applyParameters(t,"index_refresh",e,a),n&&(n.style.display="flex")}if(i>0)r=setTimeout(e,1e3);else try{o();const t=document.getElementById("refresh-timer");t&&LangManager.applyParameters(t,"timer.refresh_complete",(new Date).toLocaleTimeString())}catch(t){}},n=(t,e=50)=>{const n=()=>{document.getElementById("refresh-timer")?t():setTimeout(n,e)};n()};i=()=>{"visible"===document.visibilityState&&n(e)},document.addEventListener("visibilitychange",i),t(),LangManager.isInitialized?n(e):LangManager.init().then((()=>n(e)))}()}const s=async()=>{try{const t=await fetch("/cfg/article_cfg.json");if(!t.ok)throw new Error("配置加载失败");return(await t.json()).map((({id:t,url:e,icon:n,name:a})=>({id:t,url:`/post/${e}/index.html`,icon:`/icon/${n}`,name:a||"未命名"})))}catch(t){return[]}},c=(t,{url:e,icon:n})=>{const a=document.createElement("div");return a.className="link-preview",a.innerHTML=`\n        <div class="link-container" data-url="${e}">\n            <span class="link-icon" style="background-image: url('${n}')"></span>\n            <p class="link-title">${t}</p>\n        </div>\n    `,a},l=(t,e,n)=>{t.addEventListener("click",(t=>{const a=t.target.closest(".link-container");a?.dataset.url&&(t.preventDefault(),e.loadUrl(a.dataset.url),n.updateSelectedTab(a.dataset.url))}))};class d{static DEFAULT_CONFIG={debug:!1,version:"3.1",fallbackLang:"en",storageKey:"lang_data_v8",langFile:"/cfg/lang_cfg.json",observerOptions:{subtree:!0,childList:!0,attributes:!0,attributeFilter:["data-lang-id"]},logger:console,placeholderFormats:["braced","numbered"]};constructor(t={}){this.config={...d.DEFAULT_CONFIG,...t},this.currentLang=this.config.fallbackLang,this.langData={},this.isInitialized=!1,this.domObserver=null,this.updateInProgress=!1,this.pendingUpdates=new Set,this.dynamicParams=new Map,this.paramCache=new Map}#t(...t){this.config.debug&&this.config.logger.log("%c[Lang]","color: #4CAF50;",...t)}#e(...t){this.config.logger.warn("%c[Lang]","color: #FFC107;",...t)}#n(...t){this.config.logger.error("%c[Lang]","color: #F44336;",...t)}#a(t){const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return t.toString().replace(/[&<>"']/g,(t=>e[t]))}#r(t,e,n){return this.#n(`Translation failed for ${e}:`,n),t&&(t.classList.add("lang-error"),t.setAttribute("title",`Translation error: ${e}`)),e}async#i(){try{const t=localStorage.getItem(this.config.storageKey);if(t){const{version:e,data:n}=JSON.parse(t);if(e===this.config.version)return this.langData=n,this.#t("Using cached language data"),!0}const e=await fetch(`${this.config.langFile}?v=${this.config.version}`);if(!e.ok)throw new Error(`HTTP ${e.status}`);const n=await e.json();return this.langData=n.reduce(((t,e)=>e.id?(t[e.id]=Object.entries(e).reduce(((t,[e,n])=>("id"!==e&&(t[e]=n),t)),{}),t):(this.#e("Skipping invalid entry:",e),t)),{}),localStorage.setItem(this.config.storageKey,JSON.stringify({version:this.config.version,data:this.langData})),!0}catch(t){return this.#n("Language data load failed:",t),this.langData={},!1}}#o(t,e=[]){return e.length?e.reduce(((t,e,n)=>{const a=this.#a(e);return this.config.placeholderFormats.includes("braced")&&(t=t.replace(new RegExp(`\\{${n}\\}`,"g"),a)),this.config.placeholderFormats.includes("numbered")&&(t=t.replace(new RegExp(`%${n+1}\\$s`,"g"),a)),t}),t):t}#s(){if(this.updateInProgress)return;this.updateInProgress=!0,this.pendingUpdates.forEach((t=>{this.#c(t)})),this.pendingUpdates.clear();document.querySelectorAll("[data-lang-id]").forEach((t=>{this.#c(t)})),this.updateInProgress=!1}#c(t){const e=t.dataset.langId;if(!e)return;const n=this.langData[e]||{};let a=n[this.currentLang]||n[this.config.fallbackLang]||e;const r=[...this.dynamicParams.get(e)||[],...JSON.parse(t.dataset.langParams||"[]")],i="INPUT"===t.tagName||"TEXTAREA"===t.tagName;try{a=this.#o(a,r),i?t.value=a:(a=a.replace(/\n/g,"<br>"),t.innerHTML=a)}catch(n){this.#r(t,e,n),i?t.value=e:t.innerHTML=e}}#l(){const t=document.getElementById("lang-switcher");if(!t)return;const e=t.cloneNode(!0);t.parentNode.replaceChild(e,t),e.value!==this.currentLang&&(e.value=this.currentLang),e.addEventListener("change",(async t=>{const e=t.target.value;e!==this.currentLang&&(this.#t(`Switching language to: ${e}`),this.currentLang=e,localStorage.setItem("user_lang",e),this.paramCache.clear(),this.#s())}))}#d(){this.domObserver||(this.domObserver=new MutationObserver((t=>{if(this.updateInProgress)return void t.forEach((t=>{"childList"===t.type?t.addedNodes.forEach((t=>{if(t.nodeType===Node.ELEMENT_NODE){t.hasAttribute("data-lang-id")&&this.pendingUpdates.add(t);t.querySelectorAll("[data-lang-id]").forEach((t=>this.pendingUpdates.add(t)))}})):"attributes"===t.type&&this.pendingUpdates.add(t.target)}));t.some((t=>"childList"===t.type&&Array.from(t.addedNodes).some((t=>t.nodeType===Node.ELEMENT_NODE&&(t.hasAttribute("data-lang-id")||t.querySelector("[data-lang-id]"))))||"attributes"===t.type&&"data-lang-id"===t.attributeName))&&(this.#s(),this.#l())})),this.domObserver.observe(document.documentElement,this.config.observerOptions))}applyParameters(t,e,...n){try{t.dataset.langId||(t.dataset.langId=e),this.dynamicParams.set(e,n);const a=this.translate(e,...n);return"INPUT"===t.tagName||"TEXTAREA"===t.tagName?t.value=a:t.innerHTML=a.replace(/\n/g,"<br>"),!0}catch(n){return this.#r(t,e,n),!1}}bindDynamicElement(t,e,n){document.querySelectorAll(t).forEach((t=>{t.dataset.langId=e,this.dynamicParams.set(e,n(t)),this.pendingUpdates.add(t)})),this.#s()}cachedTranslate(t,...e){const n=`${t}_${e.join("_")}`;return this.paramCache.has(n)||this.paramCache.set(n,this.translate(t,...e)),this.paramCache.get(n)}async init(t=this.config.fallbackLang){this.isInitialized||(await new Promise((t=>{"complete"===document.readyState?t():window.addEventListener("load",t)})),this.currentLang=localStorage.getItem("user_lang")||t,await this.#i(),this.#s(),this.#l(),this.#d(),this.isInitialized=!0,this.#t("Initialization complete"))}translate(t,...e){const n=this.langData[t]||{},a=n[this.currentLang]||n[this.config.fallbackLang]||t;return this.#o(a,e)}setLanguage(t){t!==this.currentLang&&(this.currentLang=t,localStorage.setItem("user_lang",t),this.paramCache.clear(),this.dynamicParams.forEach(((t,e)=>{document.querySelectorAll(`[data-lang-id="${e}"]`).forEach((t=>this.pendingUpdates.add(t)))})),this.#s())}getCurrentLang(){return this.currentLang}setParams(t,e=[]){Array.isArray(e)||(e=[e]),this.dynamicParams.set(t,e);document.querySelectorAll(`[data-lang-id="${t}"]`).forEach((t=>this.pendingUpdates.add(t))),this.updateInProgress||this.#s()}clearParams(t){this.dynamicParams.delete(t),this.setParams(t,[])}async reload(){await this.#i(),this.paramCache.clear(),this.#s()}configure(t){Object.assign(this.config,t)}enableDebug(t=!0){this.config.debug=t}}const u=new d;"undefined"==typeof window||window.LangManager||(window.LangManager=u);const m=u;function h(){const t=document.querySelector(".dynamic-footer");if(!t)return;const e=window.location.href.includes("post"),n=`\n      <div class="status-bar">\n        <p class="status-bar-field" data-lang-id="footer_name"></p>\n        <p class="status-bar-field" data-lang-id="footer_art"></p>\n        ${e?"":'<p class="status-bar-field" id="last-updated" data-lang-id="footer_update_time"></p>'}\n      </div>\n    `;if(t.innerHTML=n,!e){const e=t.querySelector("#last-updated"),n=async()=>{try{const t=await async function(){const t="https://api.github.com/repos/jianzou1/drunkfrog",e="lastUpdatedDate",n=36e5,a=localStorage.getItem(e);if(a){const{timestamp:t,date:e}=JSON.parse(a);if(Date.now()-t<n)return e}const r=await fetch(t);if(!r.ok)throw new Error(m.translate("errors.api_fetch",r.status));const i=await r.json(),o=new Date(i.updated_at).toLocaleString([],{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});return localStorage.setItem(e,JSON.stringify({timestamp:Date.now(),date:o})),o}();m.applyParameters(e,"footer_update_time",t)}catch(t){m.applyParameters(e,"footer_update_time","---")}};m.isInitialized?n():m.init().then(n)}}function g(){const t=document.querySelector(".back-to-top");window.scrollY>300?t.style.display="block":t.style.display="none",t.onclick=function(){window.scrollTo({top:0,behavior:"smooth"})}}function p(){document.addEventListener("DOMContentLoaded",y)}document.addEventListener("DOMContentLoaded",(function(){window.addEventListener("scroll",g),g()}));const f=1;async function y(){const t=Date.now(),e=localStorage.getItem("dailyPopupLastShown"),n=e?new Date(e).getTime():0;(!e||(t-n)/1e3>=f)&&await async function(t,e,n){try{const n=await fetch(t);if(!n.ok)throw new Error(`Network response was not ok: ${n.statusText}`);e(await n.text())}catch(t){n?.(t)}}("/ui/dailyPopup.html",E,(t=>{}))}function E(t){const e=(new DOMParser).parseFromString(t,"text/html"),n=document.createElement("div");n.innerHTML=e.body.innerHTML,document.body.appendChild(n),e.querySelectorAll("style").forEach((t=>{document.head.querySelector(`style[data-id="${t.getAttribute("data-id")}"]`)||document.head.appendChild(t)})),e.querySelectorAll("script").forEach((t=>{if(!document.body.querySelector(`script[data-id="${t.getAttribute("data-id")}"]`)){const e=document.createElement("script");e.textContent=t.textContent,document.body.appendChild(e)}})),function(){const t=document.getElementById("close-popup"),e=document.getElementById("overlay"),n=document.getElementById("welcome-popup");if(!t||!e||!n)return;const a=t=>{"Escape"!==t.key&&27!==t.keyCode||w()};document.addEventListener("keydown",a);const r=w;let i=!1;w=()=>{i||(i=!0,document.removeEventListener("keydown",a),r())},t.addEventListener("click",w),e.addEventListener("click",w),n.addEventListener("click",(t=>t.stopPropagation()))}(),localStorage.setItem("dailyPopupLastShown",(new Date).toISOString())}function w(){const t=document.getElementById("overlay"),e=document.getElementById("welcome-popup");t&&(t.style.display="none"),e&&(e.style.display="none")}window.closePopup=w,p();let b=null,L=null;function v(){let t=[],e={},n=[];function a(e){let a;"按游戏评级排序"===e?a=function(){const e=t.reduce(((t,e)=>{const n=String(e.quality||"0");return t[n]||(t[n]=[]),t[n].push(e),t}),{}),a=[];return n.forEach((({key:t})=>{e[t]&&(a.push({key:t,games:e[t].sort(((t,e)=>e.time-t.time))}),delete e[t])})),Object.entries(e).sort(((t,e)=>e[0].localeCompare(t[0]))).forEach((([t,e])=>{a.push({key:t,games:e})})),a}():"按游戏类型排序"===e?a=r():"按游戏时长排序"===e&&(a=[...t].sort(((t,e)=>e.time-t.time))),i(a,e)}function r(){const e=function(t){return t.reduce(((t,e)=>{const n=e.type,a=e.seriesTag||"无系列";return t[n]=t[n]||{},t[n][a]=t[n][a]||[],t[n][a].push(e),t}),{})}(t);return Object.keys(e).forEach((t=>{Object.keys(e[t]).forEach((n=>{e[t][n].sort(((t,e)=>e.time-t.time))}))})),Object.keys(e).forEach((t=>{const n=Object.keys(e[t]);n.sort(((n,a)=>{const r=Math.max(...e[t][n].map((t=>t.time)));return Math.max(...e[t][a].map((t=>t.time)))-r})),e[t]=n.reduce(((n,a)=>(n[a]=e[t][a],n)),{})})),e}function i(t,a){const r=document.querySelector(".game-list");let i;i="按游戏评级排序"===a?t.map((({key:t,games:e})=>{const a=n.find((e=>e.key===t));return`<h3>${a?a.value:`未定义评级（${t}）`}</h3>${e.map(o).join("")}`})).join(""):"按游戏类型排序"===a?function(t,e={}){return Object.entries(t).map((([t,n],a,r)=>{const i=Object.entries(n).map((([t,e])=>e.map(o).join(""))).join("");return`<h3>${e[t]||""}</h3>${i}${a<r.length-1?"<hr>":""}`})).join("")}(t,e):Array.isArray(t)?t.map(o).join(""):"",r.innerHTML=i||"",r.querySelectorAll("li").forEach(((t,e)=>{setTimeout((()=>t.classList.add("flip-in")),12*e)}))}function o(t){const e=t.isLoved?"💜":"",n=t.sign||"",a=t.spacialAchievements?"🏆":"",r=t.spacialAchievements?t.spacialAchievements.replace(/\n/g,"<br>"):"",i=/^[A-Za-z0-9\s]+$/.test(t.name)?`<i>${t.name}</i>`:t.name;return`\n            <li class="${`quality-${t.quality||1}`}" ${r?'onclick="toggleAchievement(this)"':""}>\n                <span>\n                    <strong>${i}</strong> ${e} ${a}\n                </span>\n                <span>${n} ${t.time}小时 <span class="toggle-icon">${r?"🙈":""}</span></span>\n                <div class="achievement" style="display: none;">${r}</div>\n            </li>\n        `}!async function(){try{const c=await async function(t){try{const e=await fetch(t);if(!e.ok)throw new Error(`网络错误: ${e.status}`);return e.json()}catch(t){throw t}}("/cfg/game_time_cfg.json");s=c[0][0].typeName,e=Object.fromEntries(s.split(",").map((t=>{const[e,n]=t.split(":");return[e.trim(),n.trim()]}))),o=c[0][0].qualityName,n=o.split(",").map((t=>{const[e,n]=t.trim().split(":");return{key:e.trim(),value:n.trim()}})),t=c[1]||[];const l=function(t){const e=t.reduce(((t,e)=>t+e.time),0),n=Math.floor(e/24),a=(e/24/365).toFixed(2);return{totalTime:e,totalDays:n,totalYears:a}}(t);!function({totalTime:t,totalDays:e,totalYears:n}){const a=(t,e)=>{try{const n=document.querySelector(`[data-lang-id="${t}"]`);n&&(n.dataset.langParams=JSON.stringify([e]),m.setParams(t,[e]))}catch(t){}};a("total_time",t),a("equivalent_days",e),a("equivalent_years",n),i(r())}(l),a("按游戏评级排序")}catch(t){}var o;var s}(),document.querySelectorAll('input[name="sort-option"]').forEach((t=>{t.addEventListener("change",(t=>{a(t.target.value)}))})),window.toggleAchievement=function(t){const e=t.querySelector(".achievement"),n=t.querySelector(".toggle-icon");if(!e)return;const a=t.nextElementSibling;if(a&&a.classList.contains("achievement-info"))a.remove(),n.innerHTML=e.innerHTML?"🙈":"";else{const r=document.createElement("div");r.className="achievement-info",r.innerHTML=e.innerHTML,t.parentNode.insertBefore(r,a),n.innerHTML="👀"}}}function S(){const t="/cfg/game_time_cfg.json",e=3,n=100,a=1500,r=30,i={isRolling:!1,gameData:[],currentWinner:null,loopData:[],currentPos:0,uniqueId:Date.now(),retryCount:0},o={rollBtn:null,result:null,container:null,items:[]},s={height:`${r}px`,lineHeight:`${r}px`,position:"absolute",width:"100%",transition:"transform 0.1s",willChange:"transform",backfaceVisibility:"hidden"};function c(){!i.isRolling&&i.gameData.length&&(m(),u())}function l(){o.result.innerHTML='<div class="error">系统初始化失败，请检查网络</div>'}function d(t={}){const{includeWinner:e=!0}=t,a=g([...i.gameData]),r=[],o=new Set;for(e&&i.currentWinner&&(r.push(i.currentWinner),o.add(i.currentWinner.name));r.length<n;){const t=a.filter((t=>!o.has(t.name)));if(0===t.length)break;const e=t[Math.floor(Math.random()*t.length)];r.push(e),o.add(e.name)}return g(r)}function u(){i.retryCount>3?i.isRolling=!1:(m(),i.currentWinner=function(){if(!i.gameData.length)return{name:"默认中奖",quality:1,_uid:++i.uniqueId};const t=i.gameData.map((t=>Math.pow(2,t.quality))),e=t.reduce(((t,e)=>t+e),0);let n=Math.random()*e;for(let e=0;e<i.gameData.length;e++){if(n<t[e])return i.gameData[e];n-=t[e]}return i.gameData[0]}(),i.currentWinner?(i.loopData=d(),i.retryCount++,i.loopData.some((t=>t._uid===i.currentWinner._uid&&t.name===i.currentWinner.name))?(i.retryCount=0,i.currentPos=0,h(),function(t){let e=null;const n=i.currentPos,s=c=>{e||(e=c);const l=c-e,d=Math.min(l/a,1),u=1-Math.pow(1-d,3);i.currentPos=n+t*u,h(),d<1?requestAnimationFrame(s):requestAnimationFrame((()=>{const t=o.result.offsetHeight,e=i.loopData.findIndex((t=>t._uid===i.currentWinner._uid)),n=Math.round(e*r-(t/2-r/2));i.currentPos=n,h();const a=document.getElementById("story");a&&(a.style.animation="none",a.offsetWidth,i.currentWinner?.story?a.textContent=i.currentWinner.story:a.textContent=" "),i.isRolling=!1}))};requestAnimationFrame(s)}(function(){const t=o.result.offsetHeight,e=i.loopData.findIndex((t=>t._uid===i.currentWinner._uid));return Math.round(e*r-(t/2-r/2))+n*r}())):u()):i.isRolling=!1)}function m(){o.result.offsetHeight,i.isRolling=!0;const t=document.getElementById("story");t&&(t.textContent=" ",t.style.animation="")}function h(){const t=i.loopData.length*r,e=(i.currentPos%t+t)%t,n=Math.floor(e/r),a=Math.round(e%r),s=Math.round(o.result.offsetHeight/2-r/2);o.items.forEach(((t,e)=>{const o=(n+e)%i.loopData.length,c=i.loopData[o],l=Math.round(e*r-a-s);t.textContent=c?.name||`游戏${e+1}`,t.className=`scroll-item quality-${c?.quality||1}`,t.style.transform=`translateY(${l}px)`,i.currentWinner&&c?._uid===i.currentWinner._uid?(t.style.fontWeight="bold",t.style.boxShadow="0 2px 8px rgba(255, 215, 0, 0.5)"):(t.style.fontWeight="",t.style.boxShadow="")}))}function g(t){for(let e=t.length-1;e>0;e--){const n=Math.floor(Math.random()*(e+1));[t[e],t[n]]=[t[n],t[e]]}return t}new Promise(((t,e)=>{let n=0;const a=()=>{o.rollBtn=document.getElementById("gameRollBtn"),o.result=document.getElementById("gameResult"),o.rollBtn&&o.result?t():n++<20?setTimeout(a,50):e(new Error("DOM元素加载超时"))};a()})).then((()=>{!function(){o.container=document.createElement("div"),o.container.className="scroll-container",o.container.style.height=r*e+"px";const t=e+4;o.items=Array.from({length:t},((t,e)=>{const n=document.createElement("div");return n.className="scroll-item",Object.assign(n.style,s),n.textContent=`游戏${e+1}`,n})),o.result.appendChild(o.container),o.container.append(...o.items)}(),async function(){try{const e=new AbortController,a=setTimeout((()=>e.abort()),5e3),r=await fetch(t,{signal:e.signal});clearTimeout(a);const s=await r.json();!function(t){if(!t?.[1])throw new Error("无效的游戏数据格式")}(s),i.gameData=g(s[1]).map((t=>({...t,_uid:++i.uniqueId}))),i.loopData=i.gameData.length?d({includeWinner:!1}):Array.from({length:n},((t,e)=>({name:`游戏${e+1}`,quality:1,_uid:++i.uniqueId}))),h(),o.rollBtn.disabled=!1}catch(t){o.result.innerHTML='<div class="error">数据加载失败，请刷新页面</div>',o.rollBtn.disabled=!0}}(),o.rollBtn.addEventListener("click",c)})).catch(l)}const I="/cfg/gallery_cfg.json";async function T(){const t=document.getElementById("gallery-images"),e=document.getElementById("prevPage"),n=document.getElementById("nextPage"),a=document.getElementById("pageIndicator"),r=document.getElementById("titleSelect"),i=document.getElementById("topTitleDisplay"),o=document.getElementById("imageModal"),s=document.getElementById("modalImage"),c=document.getElementById("caption"),l=document.getElementById("modalClose");let d=1,u=[],m="",h=1;try{const t=await async function(){const t=await fetch(I);if(!t.ok)throw new Error("网络错误，请重试");return await t.json()}();m=t[0][0]?.additional||"",u=t[1],g=u,[...new Set(g.map((t=>t.title)))].forEach((t=>{const e=g.filter((e=>e.title===t)).length,n=document.createElement("option");n.value=t,n.textContent=`${t} (${e}p)`,r.appendChild(n)})),r.addEventListener("change",(function(){d=1,p()})),l.addEventListener("click",y),window.addEventListener("click",(function(t){t.target===o&&y()})),e.addEventListener("click",(()=>E(-1))),n.addEventListener("click",(()=>E(1))),p()}catch(t){alert("加载失败: "+t.message)}var g;function p(){t.innerHTML="";const o=r.value,s=u.filter((t=>t.title===o));h=Math.max(...s.map((t=>t.page)))||1;s.filter((t=>t.page===d)).forEach(f),a.textContent=`${d} / ${h} `,i.textContent=`${o}`,function(){const t=document.querySelectorAll("#gallery-images img"),e=new IntersectionObserver((t=>{t.forEach((t=>{if(t.isIntersecting){const n=t.target;n.src=n.getAttribute("data-src"),n.onload=()=>{n.style.opacity=1},e.unobserve(n)}}))}));t.forEach((t=>e.observe(t)))}(),e.disabled=1===d,n.disabled=d===h}function f(e){const n=document.createElement("img");n.setAttribute("data-src",e.url+m),n.alt=e.mark,n.title=e.mark,n.style.opacity=0,n.addEventListener("click",(()=>function(t){s.src=t.url,c.textContent=t.mark,o.style.display="flex"}(e))),t.appendChild(n)}function y(){o.style.display="none"}function E(t){d+=t,p()}}const C={CANVAS_CLASS:"crt-effect",CHECKBOX_ID:"crtToggle",STORAGE_KEY:"crtEffectEnabled",SCAN_LINE:{INTERVAL:4,SPEED:.06,COLORS:["rgba(255, 0, 0, 0.08)","rgba(0, 255, 0, 0.08)","rgba(0, 0, 255, 0.08)"],OSCILLATION:{FREQ:50,AMP:.2}}};function M(){const t=document.querySelector(`.${C.CANVAS_CLASS}`);if(!t)return;const e=t.getContext("2d");let n=!0,a=null,r=null,i=null,o=0;const s=()=>{if(n){t.width===window.innerWidth&&t.height===window.innerHeight||(t.width=window.innerWidth,t.height=window.innerHeight),e.clearRect(0,0,t.width,t.height),e.fillStyle="rgba(0, 0, 0, 0.05)",e.fillRect(0,0,t.width,t.height);for(let n=0;n<t.height;n+=C.SCAN_LINE.INTERVAL){const a=o%C.SCAN_LINE.INTERVAL;C.SCAN_LINE.COLORS.forEach(((r,i)=>{const o=a+Math.sin(n/C.SCAN_LINE.OSCILLATION.FREQ)*C.SCAN_LINE.OSCILLATION.AMP+.3*i;e.fillStyle=r,e.fillRect(0,(n+o)%t.height,t.width,1)}))}o+=C.SCAN_LINE.SPEED,a=requestAnimationFrame(s)}},c=()=>{a&&(cancelAnimationFrame(a),a=null,e.clearRect(0,0,t.width,t.height))},l=t=>{try{localStorage.setItem(C.STORAGE_KEY,JSON.stringify(t))}catch(t){}},d=t=>{const e=t.target.checked;e!==n&&(n=e,l(e),e?s():c())},u=()=>{i&&(i.disconnect(),i=null)},m=()=>{r=document.getElementById(C.CHECKBOX_ID),r&&(r&&(r.removeEventListener("change",d),r.addEventListener("change",d),r.checked=n),u())},h=()=>{n=(()=>{try{const t=localStorage.getItem(C.STORAGE_KEY);return null===t||JSON.parse(t)}catch(t){return!0}})(),m(),r||i||(i=new MutationObserver((t=>{for(const e of t)if("childList"===e.type){const t=e.addedNodes;for(const e of t)if(e.id===C.CHECKBOX_ID||e.contains?.(document.getElementById(C.CHECKBOX_ID)))return void m()}})),i.observe(document.body,{childList:!0,subtree:!0,attributeFilter:["id"]})),n&&s(),window.addEventListener("resize",(()=>{n&&s()}),{passive:!0})};return"loading"===document.readyState?document.addEventListener("DOMContentLoaded",h,{once:!0}):h(),{enable:()=>{n||(n=!0,l(!0),r?(r.checked=!0,requestAnimationFrame(s)):s())},disable:()=>{n&&(n=!1,l(!1),r&&(r.checked=!1),c())},destroy:()=>{c(),u(),r&&r.removeEventListener("change",d),window.removeEventListener("resize",s),window.removeEventListener("DOMContentLoaded",h)}}}const D=["/ui/ascii1.txt","/ui/ascii2.txt"],A=async()=>{const t=(()=>{const t=Math.floor(Math.random()*D.length);return D[t]})(),e=await fetch(t),n=await e.text(),a=document.querySelector(".logo");if(a){let t=a.querySelector(".text-container");t||(t=document.createElement("div"),t.classList.add("text-container"),a.appendChild(t)),t.textContent=n;const e=a.offsetWidth,r=document.createElement("span");r.textContent=n,r.style.fontFamily="Courier New, Courier, monospace",r.style.fontSize="14px",r.style.whiteSpace="pre",document.body.appendChild(r);const i=r.offsetWidth;document.body.removeChild(r);const o=e/i;t.style.transform=`translate(-50%, -50%) scale(${o})`}};(async()=>{try{await m.init(),A();const{Pjax:t}=await e(),a=new t({selectors:["head title","#main"],cacheBust:!1}),r=[{url:"/",text:"tab_progress"},{url:"/page/article.html",text:"tab_article"},{url:"/page/game.html",text:"tab_game"},{url:"/page/gallery.html",text:"tab_gallery"},{url:"/page/about.html",text:"tab_about"}],i=new n('[role="tablist"]',r,a);document.addEventListener("pjax:complete",(()=>{d()}));const d=()=>{try{switch(window.location.pathname){case"/":o(),p();break;case"/page/article.html":!async function(t,e){const n=await s(),a=document.getElementById("links-container");a&&(a.innerHTML="",n.forEach((t=>{a.appendChild(c(t.name,{url:t.url,icon:t.icon}))})),l(a,t,e))}(a,i);break;case"/page/game.html":v(),S();break;case"/page/gallery.html":T()}h(),g(),async function(){await m.init(),L=document.getElementById("tips");const t=t=>{t.forEach((t=>{t.addEventListener("mouseenter",e),t.addEventListener("mouseleave",n)}))},e=t=>{b=t.target,a(),r(),L.style.display="block",L.style.opacity=1},n=()=>{b=null,L.style.display="none",L.style.opacity=0},a=()=>{if(!b)return;const t=b.getAttribute("data-tips");L.textContent=m.translate(t)},r=()=>{if(!b)return;const t=b.getBoundingClientRect();L.style.left=`${t.left+window.scrollX+80}px`,L.style.top=`${t.bottom+window.scrollY+0}px`};document.addEventListener("languageChanged",(()=>{b&&"block"===L.style.display&&(a(),r())}));const i=document.querySelectorAll("[data-tips]");t(i);new MutationObserver((e=>{e.forEach((e=>{"childList"===e.type&&e.addedNodes.forEach((e=>{if(e.nodeType===Node.ELEMENT_NODE){e.hasAttribute("data-tips")&&t([e]);const n=e.querySelectorAll("[data-tips]");t(n)}}))}))})).observe(document.body,{childList:!0,subtree:!0})}(),M();const t=document.querySelector('[role="tablist"]');t&&(t.innerHTML="",new n('[role="tablist"]',r,a))}catch(t){}},u=document.querySelector(".logo");u&&u.addEventListener("click",(t=>{t.preventDefault(),a.loadUrl("/"),i.updateSelectedTab("/")})),d()}catch(t){}})()})();