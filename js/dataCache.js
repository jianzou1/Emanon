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
