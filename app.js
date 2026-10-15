import { evaluate, parseChallenge, challengeUrl, shareText, readHistory, readStats, CREATOR, MAX_HOLD_MS } from './core.js';

const $ = (id) => document.getElementById(id);
const pad = $('hold-pad');
const instrument = $('instrument');
const storageKey = 'amz-one-second-history';
let records = [];
let stats = { attempts: 0, best: null };
let currentResult = null;
let activeInput = null;
let startedAt = 0;
let holdTimeout = 0;
let cardUrl = '';
let theme = 'light';
const challenger = parseChallenge(location.search);

try { records = readHistory(localStorage.getItem(storageKey)); } catch { /* 隐私模式禁用存储时仍可正常游玩。 */ }
try { stats = readStats(localStorage.getItem(`${storageKey}-stats`), records); } catch { stats = readStats(null, records); }
try { theme = localStorage.getItem('one-second-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { /* 无存储权限时采用默认主题。 */ }

function applyTheme() {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  $('theme-toggle').textContent = theme === 'dark' ? '浅色' : '深色';
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1c1c19' : '#f1f0eb';
}
applyTheme();
$('theme-toggle').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  try { localStorage.setItem('one-second-theme', theme); } catch { /* 主题切换不依赖存储成功。 */ }
});

if (challenger) {
  $('challenge-banner').hidden = false;
  $('challenge-banner').textContent = `朋友留下 ${challenger.seconds}s，偏差 ${challenger.error}ms。你能更准吗？`;
}

function renderHistory() {
  const best = stats.best;
  $('best-score').textContent = best === null ? '还差第一次' : `只差 ${best} ms`;
  $('attempt-counter').textContent = `TRY ${String(stats.attempts + 1).padStart(2, '0')}`;
  $('clear-records').hidden = !stats.attempts;
  $('recent-values').replaceChildren();
  if (!records.length) $('recent-values').textContent = '等你留下第一个数字。';
  records.slice(-5).reverse().forEach((ms) => {
    const span = document.createElement('span');
    span.textContent = `${(ms / 1000).toFixed(3)}s`;
    if (Math.abs(ms - 1000) === best) span.className = 'is-best';
    $('recent-values').append(span);
  });
}
renderHistory();

// 键盘和指针共用一个输入锁，防止多指、键盘连发或混合输入重复计分。
function start(input) {
  if (activeInput !== null) return;
  activeInput = input;
  startedAt = performance.now();
  instrument.dataset.state = 'holding';
  instrument.style.setProperty('--turn', '0deg');
  $('pad-title').textContent = '相信直觉';
  $('pad-sub').textContent = 'RELEASE WHEN IT FEELS RIGHT.';
  $('round-label').textContent = 'TRUST YOUR INSTINCT';
  $('pad-hint').textContent = '时间藏起来了。感觉到了，就松手。';
  // 计时中不播放动画、节拍或震动，以免给玩家额外的时间提示。
  holdTimeout = setTimeout(() => cancel('这一秒有点长，松手后再来一次。'), MAX_HOLD_MS);
}

function cancel(message = '这一局被打断了，准备好可以重新按住。') {
  if (activeInput === null) return;
  activeInput = null;
  clearTimeout(holdTimeout);
  instrument.dataset.state = currentResult ? 'result' : 'ready';
  $('pad-title').textContent = '再按一次';
  $('pad-sub').textContent = 'HOLD. FEEL. RELEASE.';
  $('round-label').textContent = 'READY WHEN YOU ARE';
  $('pad-hint').textContent = message;
}

function finish(input) {
  if (activeInput !== input) return;
  const elapsed = performance.now() - startedAt;
  activeInput = null;
  clearTimeout(holdTimeout);
  const result = evaluate(elapsed);
  if (!result) { instrument.dataset.state = 'ready'; $('pad-title').textContent = '再按一次'; return; }
  showResult(result);
}

pad.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || activeInput !== null) return;
  event.preventDefault();
  pad.focus({ preventScroll: true });
  pad.setPointerCapture(event.pointerId);
  start(`pointer-${event.pointerId}`);
});
pad.addEventListener('pointerup', (event) => finish(`pointer-${event.pointerId}`));
pad.addEventListener('pointercancel', (event) => { if (activeInput === `pointer-${event.pointerId}`) cancel(); });
pad.addEventListener('lostpointercapture', (event) => { if (activeInput === `pointer-${event.pointerId}`) cancel(); });
pad.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('keydown', (event) => {
  if (!['Space', 'Enter'].includes(event.code) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (document.querySelector('dialog[open]')) return;
  if (event.target.closest('a,button,input,textarea,select') && event.target !== pad) return;
  event.preventDefault();
  start(`key-${event.code}`);
});
document.addEventListener('keyup', (event) => {
  if (activeInput === `key-${event.code}`) { event.preventDefault(); finish(activeInput); }
});
// 页面切到后台或窗口失焦时取消本局，避免把离开页面的时长计入成绩。
window.addEventListener('blur', () => cancel());
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });

function showResult(result) {
  const previousBest = stats.best ?? Infinity;
  currentResult = result;
  records.push(result.ms);
  records = records.slice(-30);
  // 最近记录有固定上限；总次数和最佳成绩单独存储，旧纪录不会被滚动窗口覆盖。
  stats = { attempts: stats.attempts + 1, best: Math.min(previousBest, result.error) };
  try { localStorage.setItem(storageKey, JSON.stringify(records)); localStorage.setItem(`${storageKey}-stats`, JSON.stringify(stats)); } catch { /* 成绩保留在本次页面会话里。 */ }
  instrument.dataset.state = 'result';
  instrument.style.setProperty('--turn', `${Math.min(result.ms, 2000) * .36}deg`);
  $('pad-title').textContent = '再来一次';
  $('pad-sub').textContent = 'YOU CAN GET CLOSER.';
  $('round-label').textContent = result.error <= 20 ? 'THAT WAS BEAUTIFUL.' : 'ONE MORE?';
  $('pad-hint').textContent = `你刚刚按出了 ${result.seconds} 秒。再按住，就能重来。`;
  $('result-time').textContent = result.seconds;
  $('result-error').textContent = result.error;
  $('result-title').textContent = result.title;
  $('result-copy').textContent = result.copy;
  $('result-side').textContent = result.side;
  $('result-badge').textContent = result.error < previousBest ? '本设备新纪录' : '本次手感鉴定';
  let comparison = result.error < previousBest && previousBest !== Infinity ? `比你的上次最佳又近了 ${previousBest - result.error}ms。` : '再按住一次，看看能不能更接近。';
  if (challenger) comparison = result.error < challenger.error ? `挑战成功！你比朋友更接近一秒，赢了 ${challenger.error - result.error}ms。` : result.error === challenger.error ? '和朋友打成平手。再试一次？' : `距离朋友的手感，还差 ${result.error - challenger.error}ms。`;
  $('comparison').textContent = comparison;
  const intent = new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text', shareText(result));
  intent.searchParams.set('url', challengeUrl(location.href, result.ms));
  $('share-x').href = intent.toString();
  $('share-status').textContent = '';
  $('result').hidden = false;
  renderHistory();
  // 结果出现后适度移动视口，移动端能直接看到成绩，同时遵守减少动态效果偏好。
  if (innerWidth <= 640) $('result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
}

$('clear-records').addEventListener('click', () => {
  records = [];
  stats = { attempts: 0, best: null };
  try { localStorage.removeItem(storageKey); localStorage.removeItem(`${storageKey}-stats`); } catch { /* 清空内存成绩不依赖存储。 */ }
  renderHistory();
  $('share-status').textContent = '此浏览器的历史成绩已清空。';
});

$('copy-link').addEventListener('click', async () => {
  if (!currentResult) return;
  const url = challengeUrl(location.href, currentResult.ms);
  try { await navigator.clipboard.writeText(url); $('share-status').textContent = '挑战链接已复制，发给朋友试试。'; }
  catch { $('share-status').textContent = `可以手动复制：${url}`; }
});

$('retry').addEventListener('click', () => {
  pad.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  pad.focus({ preventScroll: true });
});

function openRules() { cancel(); if (!document.querySelector('dialog[open]')) $('rules-dialog').showModal(); }
$('rules-open').addEventListener('click', openRules);
$('rules-close').addEventListener('click', () => $('rules-dialog').close());
$('card-close').addEventListener('click', () => $('card-dialog').close());
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

// 使用本地字体和原生 Canvas 导出，成绩卡不依赖远程图片、登录或第三方截图服务。
export function createCard(result = currentResult) {
  if (!result) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不能生成图片');
  ctx.fillStyle = '#f1f0eb'; ctx.fillRect(0, 0, 1200, 1200);
  ctx.fillStyle = '#c6360c'; ctx.fillRect(72, 70, 65, 65);
  ctx.font = 'bold 49px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('1.', 86, 120);
  ctx.fillStyle = '#1c1c19'; ctx.font = 'bold 28px "Microsoft YaHei",sans-serif'; ctx.fillText('恰好一秒', 160, 99);
  ctx.font = '14px Arial'; ctx.fillText('ONE SECOND / A CHALLENGE BY AMZ', 160, 127);
  ctx.textAlign = 'right'; ctx.font = '20px Arial'; ctx.fillText(`@${CREATOR}`, 1128, 113);
  ctx.strokeStyle = '#cecec4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(72, 170); ctx.lineTo(1128, 170); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#64645d'; ctx.font = '24px "Microsoft YaHei",sans-serif'; ctx.fillText('我以为的一秒，实际上是', 72, 255);
  ctx.fillStyle = '#1c1c19'; ctx.font = 'bold 210px Arial'; ctx.fillText(result.seconds, 62, 480);
  ctx.font = '54px Arial'; ctx.fillText('s', 1060, 480);
  ctx.fillStyle = '#c6360c'; ctx.font = 'bold 54px "Microsoft YaHei",sans-serif'; ctx.fillText(result.title, 72, 586);
  ctx.fillStyle = '#64645d'; ctx.font = '26px "Microsoft YaHei",sans-serif'; ctx.fillText(result.copy, 72, 646);
  ctx.strokeStyle = '#cecec4'; ctx.beginPath(); ctx.moveTo(72, 710); ctx.lineTo(1128, 710); ctx.stroke();
  ctx.fillStyle = '#1c1c19'; ctx.font = '25px "Microsoft YaHei",sans-serif'; ctx.fillText('距离 1.000 秒，只差', 72, 780);
  ctx.fillStyle = '#c6360c'; ctx.font = 'bold 80px Arial'; ctx.fillText(`${result.error} ms`, 72, 879);
  ctx.fillStyle = '#1c1c19'; ctx.font = 'bold 37px "Microsoft YaHei",sans-serif'; ctx.fillText('你的手感，能比我准吗？', 72, 1000);
  ctx.fillStyle = '#64645d'; ctx.font = '23px Arial'; ctx.fillText('yns34-hub.github.io/one-second', 72, 1068);
  ctx.font = '18px "Microsoft YaHei",sans-serif'; ctx.fillText('按住，凭感觉在一秒松手。', 72, 1120);
  ctx.textAlign = 'right'; ctx.fillText('纯属好玩 · 精度随设备而异', 1128, 1120);
  return canvas;
}

$('save-card').addEventListener('click', async () => {
  if (!currentResult) return;
  const resultToSave = currentResult;
  const button = $('save-card');
  button.disabled = true;
  try {
    await document.fonts.ready;
    const canvas = createCard(resultToSave);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('图片生成失败，请再试一次');
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = cardUrl; anchor.download = `one-second-${resultToSave.seconds}s.png`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    $('card-image').src = cardUrl;
    $('card-dialog').showModal();
    $('share-status').textContent = '成绩卡已生成。手机上也可以长按图片保存。';
  } catch (error) { $('share-status').textContent = error.message || '暂时无法生成，可以先截图保存。'; }
  finally { button.disabled = false; }
});
