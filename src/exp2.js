const A=require('./engine.js'),CPU=require('./cpu.js');
const V={
 '+convention':{o:{},c:{convention:true,cycleOnExcluded:false}},
 'excl 4p off':{o:{},c:{cycleExcludedMinDeck:{2:1,3:1,4:999}}},
 'excl 4p d20':{o:{},c:{cycleExcludedMinDeck:{2:1,3:1,4:20}}},
 'excl 4p d28':{o:{},c:{cycleExcludedMinDeck:{2:1,3:1,4:28}}},
 'excl 3p d12':{o:{},c:{cycleExcludedMinDeck:{2:1,3:12,4:999}}},
 'excl 2p d8 3p d8':{o:{},c:{cycleExcludedMinDeck:{2:8,3:8,4:999}}},
};
const N=+process.argv[2]||600, def=Object.assign({},CPU.CFG);
for(const [name,v] of Object.entries(V)){
 Object.assign(CPU.CFG,def,v.c);const row=[];
 for(const n of [2,3,4]){let w=0;
  for(let s=1;s<=N;s++){const G=A.newGame(Object.assign({n,seed:s},v.o));
   while(!G.result){const r=A.apply(G,CPU.decide(G));if(!r.ok)throw new Error(r.why+' '+name);} if(G.result.won)w++;}
  row.push(n+'p '+(100*w/N).toFixed(1)+'%');}
 console.log(name.padEnd(28),row.join('  '));
}
