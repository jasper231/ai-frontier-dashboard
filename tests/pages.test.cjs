const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {renderDashboard}=require('../src/lib/news/render.cjs');const {createView}=require('../src/lib/news/core.cjs');
const local=require('../src/data/news.local.json');const definitions=require('../src/data/categories.json');
test('last update displays snapshot time and fallback never pretends to be a successful refresh',()=>{
 const real={...local,isDemo:false,asOf:'2026-10-03T12:34:56Z'};
 assert.match(renderDashboard(createView(real,definitions,'Latest',real.asOf)),/最后更新：2026-10-03 12:34 UTC/);
 assert.match(renderDashboard(createView(local,definitions,'Latest',local.asOf)),/最后更新：尚无真实更新 · 本地示例/);
});
test('Pages output is a complete offline page without absolute local assets',()=>{
 const html=fs.readFileSync('dist/index.html','utf8');assert.ok(fs.existsSync('dist/.nojekyll'));
 assert.equal(html,fs.readFileSync('static-preview/index.html','utf8'));
 assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
 assert.ok(!/\b(?:src|href)=["']\/(?!\/)/.test(html));assert.ok(!html.includes('localhost'));assert.ok(!/fetch\(/.test(html));
 assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
});

test('lastUpdated remains the last successful fetch after failures, not the latest attempt',()=>{
 const {refreshStatus}=require('../src/lib/news/refresh-status.cjs');
 const selected={mode:'generated',batch:{asOf:'2026-10-02T10:00:00Z'}};
 const failed=refreshStatus(selected,{asOf:'2026-10-03T20:00:00Z',publication:{written:false}});
 assert.equal(failed.lastUpdated,'2026-10-02T10:00:00Z');assert.equal(failed.lastAttempt,'2026-10-03T20:00:00Z');
 assert.equal(failed.lastRefreshStatus,'failed-using-last-good');
 const empty=refreshStatus({mode:'local-fallback',batch:local},{asOf:'2026-10-03T20:00:00Z',publication:{written:false}});assert.equal(empty.lastUpdated,null);
});
