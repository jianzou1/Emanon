// baselineTest.js
// 银翼杀手 2049 — 基线测试段（黑底白字控制台单语播放）
// 字幕来源：cfg/Blade Runner 2049.1080p.WEB-DL.H264.AC3-EVO.EtHD.srt（行号 347-455，序号 72-93）
// 时间窗口：00:13:55 – 00:15:03（以 00:13:55.960 为 t=0）
import langManager from '/js/langManager.js';

// 时间轴（秒，相对起点）+ 中英文。日语回退英文。
const SCRIPT = [
    { t: 0,  cn: '跟读基准测试用语',                                en: 'Recite your baseline.' },
    { t: 2,  cn: '黑暗虚无于空中旋转',                              en: 'And blood-black nothingness began to spin.' },
    { t: 7,  cn: '系统测试：细胞间相连',                            en: 'A system of cells interlinked within cells...' },
    { t: 9,  cn: '细胞间相连 细胞间相连',                           en: '...interlinked within cells interlinked within one stem.' },
    { t: 16, cn: '惊恐的站在黑暗之前 一座又白又高的喷泉',              en: 'And dreadfully distinct against the dark, a tall white fountain played.' },
    { t: 22, cn: '细胞',                                        en: 'Cells.' },
    { t: 23, b:1, cn: '- 细胞',                                        en: '- Cells.' },
    { t: 24, cn: '此机构你可曾到访过？细胞',                      en: 'Have you ever been in an institution? Cells.' },
    { t: 25, b:1, cn: '- 细胞',                                        en: '- Cells.' },
    { t: 27, cn: '- 他们是否把你关进囚室？细胞',                   en: '- Do they keep you in a cell? Cells.' },
    { t: 28, b:1, cn: '- 细胞',                                        en: '- Cells.' },
    { t: 29, cn: '你未完成任务后 他们是否把你关进囚室？细胞',              en: "When you're not performing your duties, do they keep you in a little box? Cells." },
    { t: 30, b:1, cn: '- 细胞',                                        en: '- Cells.' },
    { t: 33, cn: '相连',                                        en: 'Interlinked.' },
    { t: 34, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 35, cn: '别人牵你手的时候你有爱的感觉吗？相连',              en: "What's it like to hold the hand of someone you love? Interlinked." },
    { t: 36, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 38, cn: '他们告诉过你指尖相触是什么感受吗？相连',            en: 'Did they teach you how to feel finger to finger? Interlinked.' },
    { t: 39, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 42, cn: '你想有一颗心吗？相连',                            en: 'Do you long for having your heart interlinked?' },
    { t: 43, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 45, cn: '你梦到相连是什么样的吗？相连',                     en: '- Do you dream about being interlinked?' },
    { t: 46, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 47, cn: '你怀中抱着一个孩子是什么感受？相连',                en: "What's it like to hold your child in your arms? Interlinked." },
    { t: 48, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 50, cn: '有没有感觉若有所失 相连',                         en: "Do you feel that there's a part of you that's missing? Interlinked." },
    { t: 51, b:1, cn: '- 相连',                                        en: '- Interlinked.' },    
    { t: 53, cn: '细胞间 相连',                                en: 'Within cells interlinked.' },
    { t: 54, b:1, cn: '- 细胞间 相连',                                en: '- Within cells interlinked.' },
    { t: 56, cn: '为什么不把"细胞间 相连"这句话重复三遍',              en: "Why don't you say that three times?" },
    { t: 58, b:1, cn: '- 细胞间 相连',                                 en: '- Within cells interlinked.' },
    { t: 59, b:1, cn: '- 细胞间 相连',                                 en: '- Within cells interlinked.' },
    { t: 60, b:1, cn: '- 细胞间 相连',                                 en: '- Within cells interlinked.' },
    { t: 66, cn: '测试完成',                                     en: "We're done." },
];

// 打字机字符间隔（ms/字）
const TYPE_SPEED = 38;
// K 应答行（b:1）的高速打字速度，模拟反射性键盘输入
const TYPE_SPEED_FAST = 14;

let timers = [];
// 单调递增 token：每次 clearAll/playSequence 自增，旧的播放循环检测到 token 变化即退出
let playToken = 0;

const clearAll = () => {
    timers.forEach(id => clearTimeout(id));
    timers = [];
    playToken += 1;
};

/**
 * 根据当前语言取对应字段（jp 回退到 en）
 */
const pickText = (entry) => {
    const lang = langManager.getCurrentLang ? langManager.getCurrentLang() : 'cn';
    if (lang === 'cn') return entry.cn;
    return entry.en;
};

/**
 * 在指定行内做打字机效果输出文字（每打一字自动滚到底部，让旧文本从顶部滚出）
 */
const typeInto = (target, text, container, speed = TYPE_SPEED) => new Promise(resolve => {
    const myToken = playToken;
    let i = 0;
    const tick = () => {
        if (myToken !== playToken) {
            // 序列已被替换或清理，立即退出避免挂起 await
            resolve();
            return;
        }
        if (i >= text.length) {
            resolve();
            return;
        }
        target.textContent += text.charAt(i);
        i += 1;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
        const id = setTimeout(tick, speed);
        timers.push(id);
    };
    tick();
});

/**
 * 创建一行控制台输出
 *
 * 提问行（默认）：纯文本、慢速 38ms/字，模拟语音被转录
 * K 应答行（b:1）：行首 `> ` 提示符 + 高速 14ms/字 + 闪烁光标 `█`
 *               视觉上像 K 在终端被强迫输入应答词，呼应基线测试的"反射性复诵"
 */
const renderLine = async (container, entry) => {
    const text = pickText(entry);
    const isInput = entry.b === 1;

    const block = document.createElement('div');
    block.className = 'baseline-line';
    if (isInput) block.classList.add('baseline-line-input');

    // 提示符（仅 K 应答行）
    if (isInput) {
        const prompt = document.createElement('span');
        prompt.className = 'baseline-prompt';
        prompt.textContent = '> ';
        block.appendChild(prompt);
    }

    const span = document.createElement('span');
    span.className = 'baseline-text';
    block.appendChild(span);

    // 闪烁光标（仅 K 应答行，打完后保留）
    let cursor = null;
    if (isInput) {
        cursor = document.createElement('span');
        cursor.className = 'baseline-cursor';
        cursor.textContent = '█';
        block.appendChild(cursor);
    }

    container.appendChild(block);

    // 新行追加后立刻滚到底
    container.scrollTop = container.scrollHeight;

    const speed = isInput ? TYPE_SPEED_FAST : TYPE_SPEED;
    await typeInto(span, text, container, speed);

    // 应答打完后让光标停留约 500ms 再消失（保留输入完成的视觉残留）
    if (cursor) {
        const id = setTimeout(() => cursor.remove(), 600);
        timers.push(id);
    }
};

/**
 * 等待若干毫秒（可被 clearAll 中断）
 */
const wait = (ms) => new Promise(resolve => {
    if (ms <= 0) {
        resolve();
        return;
    }
    const id = setTimeout(resolve, ms);
    timers.push(id);
});

/**
 * 启动播放序列 — 串行：上一句打完才开始下一句
 * 调度规则：每句开始时刻 = max(本句 t 秒后, 上一句打完 + 最小间隔 200ms)
 * 这样既保留剧本里的绝对时间锚点，又保证不会插队。
 */
const playSequence = async (output) => {
    clearAll();
    output.innerHTML = '';

    const startedAt = performance.now();
    let lastFinishedAt = startedAt;
    const MIN_GAP = 200; // 上一句打完到下一句开始的最小间隔

    // playToken 用于让 clearAll 后启动的旧序列自动失效
    const myToken = ++playToken;

    for (const entry of SCRIPT) {
        if (myToken !== playToken) return; // 已被新序列打断
        const targetAbs = startedAt + (entry.t || 0) * 1000;
        const earliestAbs = lastFinishedAt + MIN_GAP;
        const startAt = Math.max(targetAbs, earliestAbs);
        const delay = startAt - performance.now();
        if (delay > 0) await wait(delay);
        if (myToken !== playToken) return;

        await renderLine(output, entry);
        lastFinishedAt = performance.now();
    }
};

/**
 * 初始化基线测试控制台
 * @returns {() => void} cleanup 函数
 */
export const initBaselineTest = () => {
    const output = document.getElementById('baseline-output');
    if (!output) return () => {};

    playSequence(output);

    // 监听语言切换 → 重启播放
    const switcher = document.getElementById('lang-switcher');
    const onLangChange = () => {
        // 用 setTimeout 延后到 langManager 自己的处理之后，避免顺序竞争
        setTimeout(() => playSequence(output), 0);
    };
    switcher?.addEventListener('change', onLangChange);

    return () => {
        clearAll();
        switcher?.removeEventListener('change', onLangChange);
    };
};
