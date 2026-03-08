// password.js
let passwordInputListener = null; // 保存输入框的监听函数

export function initializePassword() {
    const submitButton = document.getElementById('password-submit');
    const passwordInput = document.getElementById('password-input');
    if (submitButton && passwordInput) {
        const handleSubmit = async () => {
            const password = passwordInput.value;
            if (!password) {
                showPasswordError('请输入密码');
                return;
            }
            try {
                const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
                const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                const hashPrefix = hashHex.substring(0, 8);
                const url = window.location.origin + '/post/' + hashPrefix + '/';
                // 检查目标页面是否存在
                try {
                    const resp = await fetch(url, { method: 'HEAD' });
                    if (resp.ok) {
                        window.location.href = url;
                    } else {
                        // 404 或其他错误状态
                        showPasswordError('密码错误，请重试。');
                    }
                } catch (fetchError) {
                    console.error('无法访问目标页面:', fetchError);
                    showPasswordError('密码错误，请重试。');
                }
            } catch (error) {
                console.error('Error generating hash:', error);
                alert('An error occurred. Please try again.');
            }
        };

        submitButton.addEventListener('click', handleSubmit);
        passwordInputListener = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        passwordInput.addEventListener('keydown', passwordInputListener);
    }
}
// 显示与 dailyPopup 风格一致的错误弹窗
function showPasswordError(message) {
    // 移除输入框的Enter监听
    const passwordInput = document.getElementById('password-input');
    if (passwordInput && passwordInputListener) {
        passwordInput.removeEventListener('keydown', passwordInputListener);
    }

    // create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'password-error-overlay';

    // create popup container
    const popup = document.createElement('div');
    popup.id = 'password-error-popup';
    popup.className = 'window';

    // build inner HTML with title-bar close control
    popup.innerHTML = `
        <header class="title-bar">
            <div class="title-bar-text" data-lang-id="提示">Error</div>
            <div class="title-bar-controls">
                <button aria-label="Close" id="password-error-close-icon"></button>
            </div>
        </header>
        <section class="window-body">
            <p>${message}</p>
        </section>
        <button id="password-error-close">OK</button>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const closeFn = () => {
        overlay.remove();
        popup.remove();
        document.removeEventListener('keydown', handleKeyDown);
        // 重新添加输入框的Enter监听
        if (passwordInput && passwordInputListener) {
            passwordInput.addEventListener('keydown', passwordInputListener);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            closeFn();
        }
    };

    document.addEventListener('keydown', handleKeyDown);

    document.getElementById('password-error-close').addEventListener('click', closeFn);
    const icon = document.getElementById('password-error-close-icon');
    if (icon) icon.addEventListener('click', closeFn);
}
