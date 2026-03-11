// netlify/functions/get-messages.js
// 代理 Netlify Forms API，避免在前端暴露 Token

exports.handler = async (event) => {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  const formName = 'guestbook';

  if (!token || !siteId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: missing env vars' }),
    };
  }

  try {
    // 1. 先获取表单 ID
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!formsRes.ok) throw new Error(`Forms API ${formsRes.status}`);

    const forms = await formsRes.json();
    const form = forms.find(f => f.name === formName);
    if (!form) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify([]),
      };
    }

    // 2. 拉取该表单的提交记录（最多100条，按时间降序）
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    const perPage = 20;
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!subRes.ok) throw new Error(`Submissions API ${subRes.status}`);

    const submissions = await subRes.json();

    // 3. 只向前端返回展示所需的字段，不泄露邮件等隐私数据
    const safe = submissions.map(s => ({
      id: s.id,
      nickname: s.data?.nickname || 'Anonymous',
      message: s.data?.message || '',
      created_at: s.created_at,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify(safe),
    };
  } catch (err) {
    console.error('get-messages error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
