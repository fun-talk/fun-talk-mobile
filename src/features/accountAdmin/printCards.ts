import type { AccountPrintCard } from '@/features/auth/services/accountApi';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildAccountCardsHtml(cards: AccountPrintCard[]): string {
  const cardHtml = cards
    .map(
      (card) => `
        <section class="card">
          <h1>${escapeHtml(card.title || '欧波开心学学生账号')}</h1>
          <p><strong>数字 ID：</strong>${escapeHtml(card.digital_id)}</p>
          <p><strong>初始密码：</strong>${escapeHtml(card.password)}</p>
          <p class="hint">${escapeHtml(card.hint)}</p>
          <p class="url">${escapeHtml(card.login_url)}</p>
        </section>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #0f172a;
            background: #ffffff;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          .card {
            break-inside: avoid;
            border: 2px solid #bae6fd;
            border-radius: 18px;
            padding: 18px;
            background: #f0f9ff;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 20px;
          }
          p {
            margin: 8px 0;
            font-size: 16px;
          }
          .hint {
            color: #475569;
            font-size: 13px;
          }
          .url {
            color: #0284c7;
            font-size: 12px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <main class="grid">${cardHtml}</main>
      </body>
    </html>
  `;
}
