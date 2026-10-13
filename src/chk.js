const A=require('./engine.js'),CPU=require('./cpu.js');
let early=0,late=0;
for(const n of [2,3,4])for(let s=1;s<=1500;s++){const G=A.newGame({n,seed:s});
 while(!G.result){const a=CPU.decide(G);if(a.type==='breakthrough'&&G.deck.length>0){/*note*/}
  A.apply(G,a);}
 if(!G.result.won&&/breakthrough failed/.test(G.result.reason)){ if(G.deck.length>0)early++; else late++; }}
console.log('failed breakthroughs with deck left:',early,'after alarm:',late);
