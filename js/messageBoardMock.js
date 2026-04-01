// messageBoardMock.js — 留言板 Mock 数据（仅开发调试用）

const MOCK_BASE_TIME = Date.now();
const MOCK_NICKNAMES = ['Shelton', 'Cry', 'Mika', 'Sora', 'Aki', 'Neko', 'Pixel', 'Rin'];
const MOCK_MESSAGES = [
  '这个站的复古风格太戳我了。',
  '今天路过来打个卡，界面做得很细。',
  '文章区更新频率很舒服，继续保持！',
  'CRT效果开关很有意思，细节满分。',
  '游戏清单看得出来很用心整理。',
  '配色和字体真的很有年代感。',
  '收藏了，准备慢慢把文章都看一遍。',
  '留言板能评论之后互动感更强了。',
];
const MOCK_REPLIES = [
  '同感，尤其是像素字体部分。',
  '我也最喜欢这个页面布局。',
  '哈哈我也是这么想的。',
  '期待下一次更新内容。',
  '这个细节确实很棒。',
  '握手，审美在线。',
];
const MOCK_LOCATIONS = ['上海 · 中国', '东京 · 日本', '首尔 · 韩国', '台北 · 中国', '新加坡', '香港 · 中国'];

/**
 * 生成指定页码的 Mock 留言数据
 * 分页逻辑与后端一致：仅对主留言分页，当前页主留言的所有回复一并返回
 * @param {number} page - 页码（从 1 开始）
 * @param {number} pageSize - 每页条数
 * @returns {{ items: Array, total: number }}
 */
export function getMockPageData(page, pageSize) {
  const totalMessages = 48;

  // 生成全部主留言（不含回复）
  const allMessages = [];
  const repliesByMessageId = new Map();

  for (let i = 0; i < totalMessages; i++) {
    const messageTs = MOCK_BASE_TIME - i * 240 * 60 * 1000;
    const messageId = String(messageTs);
    const msgNickname = MOCK_NICKNAMES[i % MOCK_NICKNAMES.length];

    allMessages.push({
      id: `mock-msg-${i}`,
      messageId,
      replyTo: '',
      replyToNickname: '',
      isReply: false,
      nickname: msgNickname,
      message: MOCK_MESSAGES[i % MOCK_MESSAGES.length],
      ip: `203.0.113.${(i % 200) + 1}`,
      location: MOCK_LOCATIONS[i % MOCK_LOCATIONS.length],
      created_at: new Date(messageTs).toISOString(),
    });

    // 生成回复，按 messageId 归组
    const replies = [];

    if (i % 3 === 0) {
      const replyTs = messageTs + 8 * 60 * 1000;
      const replyNick = MOCK_NICKNAMES[(i + 2) % MOCK_NICKNAMES.length];
      replies.push({
        id: `mock-reply-a-${i}`,
        messageId: String(replyTs),
        replyTo: messageId,
        replyToNickname: '',
        isReply: true,
        nickname: replyNick,
        message: MOCK_REPLIES[i % MOCK_REPLIES.length],
        ip: `203.0.113.${((i + 7) % 200) + 1}`,
        location: MOCK_LOCATIONS[(i + 1) % MOCK_LOCATIONS.length],
        created_at: new Date(replyTs).toISOString(),
      });

      if (i % 6 === 0) {
        const reReplyTs = replyTs + 5 * 60 * 1000;
        replies.push({
          id: `mock-reply-c-${i}`,
          messageId: String(reReplyTs),
          replyTo: messageId,
          replyToNickname: replyNick,
          isReply: true,
          nickname: MOCK_NICKNAMES[(i + 5) % MOCK_NICKNAMES.length],
          message: '确实，说得太对了！',
          ip: `203.0.113.${((i + 13) % 200) + 1}`,
          location: MOCK_LOCATIONS[(i + 3) % MOCK_LOCATIONS.length],
          created_at: new Date(reReplyTs).toISOString(),
        });
      }
    }

    if (i % 5 === 0) {
      const replyTs = messageTs + 12 * 60 * 1000;
      const replyNick = MOCK_NICKNAMES[(i + 4) % MOCK_NICKNAMES.length];
      replies.push({
        id: `mock-reply-b-${i}`,
        messageId: String(replyTs),
        replyTo: messageId,
        replyToNickname: '',
        isReply: true,
        nickname: replyNick,
        message: MOCK_REPLIES[(i + 1) % MOCK_REPLIES.length],
        ip: `203.0.113.${((i + 11) % 200) + 1}`,
        location: MOCK_LOCATIONS[(i + 2) % MOCK_LOCATIONS.length],
        created_at: new Date(replyTs).toISOString(),
      });

      if (i % 10 === 0) {
        const reReplyTs = replyTs + 3 * 60 * 1000;
        replies.push({
          id: `mock-reply-d-${i}`,
          messageId: String(reReplyTs),
          replyTo: messageId,
          replyToNickname: replyNick,
          isReply: true,
          nickname: msgNickname,
          message: '谢谢支持～',
          ip: `203.0.113.${((i + 17) % 200) + 1}`,
          location: MOCK_LOCATIONS[i % MOCK_LOCATIONS.length],
          created_at: new Date(reReplyTs).toISOString(),
        });
      }
    }

    if (replies.length > 0) {
      repliesByMessageId.set(messageId, replies);
    }
  }

  // 仅对主留言分页
  const start = (page - 1) * pageSize;
  if (start >= totalMessages) return { items: [], total: totalMessages };
  const end = Math.min(start + pageSize, totalMessages);
  const pageMessages = allMessages.slice(start, end);

  // 收集当前页主留言的所有回复
  const items = [];
  for (const msg of pageMessages) {
    items.push(msg);
    const replies = repliesByMessageId.get(msg.messageId);
    if (replies) {
      items.push(...replies);
    }
  }

  return { items, total: totalMessages };
}
