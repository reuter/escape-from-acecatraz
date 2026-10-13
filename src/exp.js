const A=require('./engine.js'),CPU=require('./cpu.js');
const variants={
 base:{},
 cycle:{cycle:true},
 cycleVer:{cycle:true,cycleNeedsVerifier:true},
 cycleVer20:{cycle:true,cycleNeedsVerifier:true,cycleMinDeck:20},
 cycleVer20Hint:{cycle:true,cycleNeedsVerifier:true,cycleMinDeck:20,cycleNeedsNoHint:false},
};
const N=+process.argv[2]||600;
const def=Object.assign({},CPU.CFG);
for(const [name,v] of Object.entries(variants)){
 Object.assign(CPU.CFG,def,v);
 const row=[];
 for(const n of [2,3,4]){let w=0;
  for(let s=1;s<=N;s++){const G=A.newGame({n,seed:s});
   while(!G.result){const r=A.apply(G,CPU.decide(G));if(!r.ok)throw new Error(r.why+' '+name);} if(G.result.won)w++;}
  row.push(n+'p '+(100*w/N).toFixed(1)+'%');}
 console.log(name.padEnd(20),row.join('  '));
}
