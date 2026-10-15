import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseChallenge, challengeUrl, shareText, readHistory, readStats } from '../dist/core.js';

test('成绩、误差和等级在同一个毫秒边界上', () => {
  assert.equal(evaluate(999.6).ms, 1000);
  assert.equal(evaluate(999.6).error, 0);
  assert.equal(evaluate(1005).title, '时间本尊');
  assert.equal(evaluate(1006).title, '人形原子钟');
  assert.equal(evaluate(1020).title, '人形原子钟');
  assert.equal(evaluate(1050).title, '手感天花板');
  assert.equal(evaluate(1100).title, '一秒老熟人');
  assert.equal(evaluate(1200).title, '凭感觉选手');
  assert.equal(evaluate(1400).title, '自由的灵魂');
  assert.equal(evaluate(1401).title, '活在自己的时区');
  assert.equal(evaluate(920).side, '早了一点点');
});
test('拒绝非法和超时成绩', () => {
  for (const value of [-1, NaN, Infinity, '1000', 10001]) assert.equal(evaluate(value), null);
});
test('只接收受限整数挑战，不注入额外信息', () => {
  for (const search of ['', '?ms=', '?ms=-1', '?ms=10001', '?ms=1e3', '?ms=<script>', '?ms=1.1']) assert.equal(parseChallenge(search), null);
  assert.equal(parseChallenge('?ms=1024').error, 24);
  assert.equal(challengeUrl('https://example.com/game/?x=private#old', 1024), 'https://example.com/game/?ms=1024');
});
test('损坏的本地存储不会导致页面打不开', () => {
  assert.deepEqual(readHistory('{broken'), []);
  assert.deepEqual(readHistory('{"ms":1000}'), []);
  assert.deepEqual(readHistory('[1000,"999",null,-1,10001,1025]'), [1000,1025]);
  assert.equal(readHistory(JSON.stringify(Array(50).fill(1000))).length, 30);
});
test('分享文案带真实成绩与作者', () => {
  const text = shareText(evaluate(1024));
  assert.match(text, /1\.024s/);
  assert.match(text, /24ms/);
  assert.match(text, /@AmzTjh34230/);
});
test('滚动历史保留三十次，最佳成绩与总次数持续保留', () => {
  assert.deepEqual(readStats('{"attempts":100,"best":2}', [1100]), { attempts: 100, best: 2 });
  assert.deepEqual(readStats('{"attempts":0,"best":2}', [1100]), { attempts: 1, best: 100 });
  assert.deepEqual(readStats('{broken', []), { attempts: 0, best: null });
  assert.deepEqual(readStats('{"attempts":4,"best":-1}', [1024]), { attempts: 1, best: 24 });
});
