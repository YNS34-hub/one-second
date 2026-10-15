export const TARGET_MS = 1000;
export const MAX_HOLD_MS = 10000;
export const CREATOR = 'AmzTjh34230';

// 先把原始测量统一到整数毫秒，使成绩、等级和挑战链接采用同一个数值。
export function evaluate(duration) {
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_HOLD_MS) return null;
  const ms = Math.round(duration);
  const error = Math.abs(ms - TARGET_MS);
  const grades = [
    [5, '时间本尊', '这一秒，时间都得听你的。'],
    [20, '人形原子钟', '建议检查一下，体内是不是装了钟。'],
    [50, '手感天花板', '你和一秒之间，几乎没有距离。'],
    [100, '一秒老熟人', '已经很熟了，再靠近一点。'],
    [200, '凭感觉选手', '方向对了，手感正在加载。'],
    [400, '自由的灵魂', '一秒有它的想法，你也有。'],
    [Infinity, '活在自己的时区', '你负责松弛，时间负责流逝。'],
  ];
  const [, title, copy] = grades.find(([limit]) => error <= limit);
  return { ms, error, title, copy, seconds: (ms / TARGET_MS).toFixed(3), side: ms === TARGET_MS ? '刚刚好，一毫秒都不差' : ms < TARGET_MS ? '早了一点点' : '晚了一点点' };
}

export function parseChallenge(search) {
  const raw = new URLSearchParams(search).get('ms');
  if (raw === null || !/^\d{1,5}$/.test(raw)) return null;
  return evaluate(Number(raw));
}

export function challengeUrl(href, ms) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  if (evaluate(ms)) url.searchParams.set('ms', Math.round(ms));
  return url.toString();
}

export function shareText(result) {
  return `我以为我很懂一秒，结果按出了 ${result.seconds}s，偏差 ${result.error}ms。\n鉴定：${result.title}。\n来试试，你的手感能比我准吗？\n@${CREATOR} 做的「恰好一秒」`;
}

export function readHistory(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((value) => Number.isInteger(value) && evaluate(value)).slice(-30);
  } catch { return []; }
}

export function readStats(raw, records = []) {
  const fallback = { attempts: records.length, best: records.length ? Math.min(...records.map((ms) => Math.abs(ms - TARGET_MS))) : null };
  try {
    const data = JSON.parse(raw);
    if (!data || !Number.isSafeInteger(data.attempts) || data.attempts < fallback.attempts || data.attempts < 0) return fallback;
    if (!Number.isInteger(data.best) || data.best < 0 || data.best > MAX_HOLD_MS - TARGET_MS) return fallback;
    return { attempts: data.attempts, best: fallback.best === null ? data.best : Math.min(data.best, fallback.best) };
  } catch { return fallback; }
}
