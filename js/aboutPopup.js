// aboutPopup.js — 使用通用弹窗组件
import { showPopup } from '/js/popup.js';
import langManager from '/js/langManager.js';

/**
 * 显示"关于"弹窗
 */
export function showAboutPopup() {
    const bodyHTML = `
        <p data-lang-id="about"></p>
        <p data-lang-id="thanks_project"></p>
        <p>
            <a href="https://github.com/jdan/98.css" target="_blank" data-no-pjax>98.css</a><br>
            <a href="https://github.com/webpack/webpack" target="_blank" data-no-pjax>webpack</a><br>
            <a href="https://github.com/MoOx/pjax" target="_blank" data-no-pjax>pjax</a><br>
            <a href="https://github.com/markedjs/marked" target="_blank" data-no-pjax>marked</a><br>
            <a href="https://github.com/mde/ejs" target="_blank" data-no-pjax>ejs</a><br>
            <a href="https://www.netlify.com/" target="_blank" data-no-pjax>Netlify</a><br>
            <a href="https://neocities.org/" target="_blank" data-no-pjax>Neocities</a>
        </p>
        <div class="about-shortcuts">
            <div class="password" data-pjax-url="/page/password.html" id="about-popup-password"></div>
        </div>
    `;

    const { close } = showPopup({
        id: 'about-popup',
        title: '关于',
        titleLangId: 'about_title',
        bodyHTML,
        confirmLangId: 'btn_ok',
        confirmText: 'OK',
        overlayClose: true,
        onReady: ({ popup }) => {
            // 多语言翻译
            langManager.applyTranslationsIn(popup);

            // 密码快捷图标：关闭弹窗后触发 PJAX 导航
            const passwordIcon = popup.querySelector('#about-popup-password');
            if (passwordIcon) {
                passwordIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    close();
                    const fakeLink = document.createElement('div');
                    fakeLink.setAttribute('data-pjax-url', '/page/password.html');
                    document.body.appendChild(fakeLink);
                    fakeLink.click();
                    fakeLink.remove();
                });
            }
        },
    });
}
