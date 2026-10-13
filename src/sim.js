const A = require('./engine.js');
const CPU = require('./cpu.js');

function run(n, seed, extra) {
  const G = A.newGame({ n, seed, extra });
  let steps = 0;
  while (!G.result) {
    const act = CPU.decide(G);
    const r = A.apply(G, act);
    if (!r.ok) throw new Error('illegal ' + JSON.stringify(act) + ' phase=' + G.phase + ' ' + r.why + ' seed=' + seed);
    if (++steps > 5000) throw new Error('runaway seed=' + seed);
  }
  return G;
}

const N = +process.argv[2] || 1000;
for (const extra of [false]) {
  for (const n of [2, 3, 4]) {
    let wins = 0, cleared = 0, tot = 0, fails = {}, st = { guards: 0, guardPass: 0, riots: 0, distracts: 0, plants: 0 };
    for (let s = 1; s <= N; s++) {
      const G = run(n, s, extra);
      if (G.result.won) wins++;
      cleared += G.cur; tot += G.obstacles.length;
      const key = G.result.reason.slice(0, 28); fails[key] = (fails[key] || 0) + 1;
      for (const k in st) st[k] += G.stats[k];
    }
    console.log(n + 'p', 'win%', (100 * wins / N).toFixed(1), 'avg cleared', (cleared / N).toFixed(2) + '/' + (tot / N),
      'per game:', Object.keys(st).map((k) => k + '=' + (st[k] / N).toFixed(1)).join(' '));
    console.log('   ', JSON.stringify(fails));
  }
}
