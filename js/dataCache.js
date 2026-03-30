// dataCache.js - 统一的 JSON 数据缓存层
// 缓存 Promise 本身（非结果），天然解决并发竞态：
// 同一 URL 的多个调用者共享同一个 Promise，仅发起一次网络请求。

const cache = new Map();

export function fetchJSON(url) {
    if (cache.has(url)) return cache.get(url);

    const promise = fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .catch(err => {
            cache.delete(url); // 失败时清除，允许下次重试
            throw err;
        });

    cache.set(url, promise);
    return promise;
}

/**
 * 预热缓存：批量调用 fetchJSON 将 Promise 写入 cache Map。
 * 各消费模块后续调用 fetchJSON(同一 URL) 直接命中，零网络请求。
 * 失败静默处理——不影响后续按需加载（fetchJSON 的 catch 会清除失败缓存允许重试）。
 */
export function warmUpCache(urls) {
    urls.forEach(url => {
        fetchJSON(url).catch(() => {});
    });
}
