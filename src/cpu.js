/* CPU crewmates for Escape from Ace-catraz. They only use what a real player could see. */
(function (root) {
'use strict';
const A = typeof require !== 'undefined' ? require('./engine.js') : root.Ace;
// Tunable CPU behaviour. `gamble`: plant an unverified card at or above this chance of matching.
// `needVerifier`: only gamble when another player can vouch for the pile. `cycle`: plant a blind card just to draw a new one.
const CFG = { gamble: 0.45, needVerifier: true, cycle: true, cycleMinDeck: { 2: 20, 3: 20, 4: 99 }, cycleNeedsNoHint: true, cycleNeedsVerifier: true, alarmGamble: true,
  convention: true,        // when pointing at a card, prefer one that fits the active obstacle (so silence carries meaning)
  cycleOnExcluded: true,   // every unresolved card of mine is known not to fit: plant one blind to draw a fresh card
  cycleExcludedMinDeck: { 2: 1, 3: 1, 4: 999 },
  mc: true, mcSamples: 16 }; // mc: weigh plant / guard check / riot by playing each forward in sampled worlds // 4p: the deck is too tight to burn cards cycling

const frac = (cs, test) => { if (!cs.length) return 0; let m = 0; for (const c of cs) if (test(c)) m++; return m / cs.length; };
const allPass = (cs, test) => cs.length > 0 && cs.every(test);
const argmax = (arr, f) => { let bi = -1, bv = -Infinity; arr.forEach((x, i) => { const v = f(x, i); if (v > bv) { bv = v; bi = i; } }); return bi; };

// Does any other player look able to verify (own card certain from the team's view)?
function verifierExists(G, p) {
  const O = A.active(G), test = O.sec.test;
  for (const q of G.players) {
    if (q.idx === p) continue;
    const rec = A.plantedBy(O, q.idx);
    const pool = A.modelPool(G, p, q.idx);
    if (rec) {
      const cs = A.isExact(rec.known) ? [rec.card] : pool.filter((c) => A.knownMatches(c, rec.known));
      if (allPass(cs, test)) return true;
    } else {
      const cands = A.handCandidates(G, q.idx, pool);
      if (cands.some((cs) => allPass(cs, test))) return true;
    }
  }
  return false;
}

// Rank every hint this player could give a teammate, by how much it helps the crew.
function hintOptions(G, p) {
  const O = A.active(G), N = G.obstacles[G.cur + 1];
  const out = [];
  for (const T of G.players) {
    if (T.idx === p || !T.hand.length) continue;
    const pool = A.modelPool(G, p, T.idx);
    const c0 = A.handCandidates(G, T.idx, pool);
    const tPlanted = !!A.plantedBy(O, T.idx);
    const certainBefore = c0.some((cs) => allPass(cs, O.sec.test));
    const certNBefore = N ? c0.some((cs) => allPass(cs, N.sec.test)) : false;
    const pBefore = c0.reduce((m, cs) => Math.max(m, frac(cs, O.sec.test)), 0);
    T.hand.forEach((slot, k) => {
      if (A.isExact(slot.known)) return;
      for (const dim of ['suit', 'rank']) {
        if (slot.known[dim] != null) continue;
        const nk = Object.assign({}, slot.known); nk[dim] = slot.card[dim];
        const cs1 = c0[k].filter((c) => A.knownMatches(c, nk));
        if (!cs1.length || cs1.length === c0[k].length) continue;
        let score = 0;
        const m1 = frac(cs1, O.sec.test);
        if (!tPlanted) {
          if (m1 === 1) score += certainBefore ? 1 : 10;
          else {
            const pAfter = c0.reduce((m, cs, i) => Math.max(m, i === k ? m1 : frac(cs, O.sec.test)), 0);
            score += 4 * Math.max(0, pAfter - pBefore);
            if (m1 === 0) score += 0.3; // tells them to keep their hands off this one
          }
        }
        if (N && frac(cs1, N.sec.test) === 1) score += certNBefore ? 0.3 : 2.5;
        score += 0.5 * (1 - cs1.length / c0[k].length);
        out.push({ score, to: T.idx, hand: k, dim });
      }
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Cards a teammate could use that they are not yet sure about. The convention is to point at one of these when any exists.
function usefulSlots(G, p) {
  const O = A.active(G), set = new Set();
  for (const T of G.players) {
    if (T.idx === p || !T.hand.length || A.plantedBy(O, T.idx)) continue;
    const c0 = A.handCandidates(G, T.idx, A.modelPool(G, p, T.idx));
    T.hand.forEach((s, k) => { if (O.sec.test(s.card) && !(c0[k].length && allPass(c0[k], O.sec.test))) set.add(T.idx + ':' + k); });
  }
  return set;
}

function decideHint(G, p) {
  let opts = hintOptions(G, p);
  if (CFG.convention) {
    const u = usefulSlots(G, p);
    if (u.size) { const f = opts.filter((o) => u.has(o.to + ':' + o.hand)); if (f.length) opts = f; }
  }
  if (opts.length) { const o = opts[0]; return { type: 'hint', to: o.to, hand: o.hand, dim: o.dim }; }
  // Forced to hint something: give any new fact, otherwise repeat one.
  for (const T of G.players) {
    if (T.idx === p) continue;
    for (let k = 0; k < T.hand.length; k++) {
      for (const dim of ['rank', 'suit']) if (T.hand[k].known[dim] == null) return { type: 'hint', to: T.idx, hand: k, dim };
    }
  }
  const T = G.players.find((q) => q.idx !== p && q.hand.length);
  return { type: 'hint', to: T.idx, hand: 0, dim: 'rank' };
}

// Judgement call: instead of fixed rules, imagine plausible versions of the hidden cards, play each candidate move
// forward with the ordinary crew policy, and pick the move that wins most often.
let inRollout = false;
function rollout(W, act) {
  if (!A.apply(W, act).ok) return null;
  let steps = 0;
  while (!W.result && steps++ < 400) { if (!A.apply(W, decide(W)).ok) break; }
  return W.result && W.result.won ? 1 : 0.3 * (Math.min(W.cur, W.obstacles.length) / W.obstacles.length);
}
function mcChoose(G, p, cands) {
  if (!CFG.mc || inRollout || cands.length < 2) return null;
  const tot = cands.map(() => 0);
  let got = 0;
  inRollout = true;
  try {
    for (let k = 0; k < CFG.mcSamples; k++) {
      const W0 = A.sampleWorld(G, p, (G.seed * 7919 + G.turnCount * 104729 + k * 15485863) >>> 0);
      if (!W0) continue;
      const vals = cands.map((cd) => rollout(A.cloneWorld(W0), cd.act));
      if (vals.some((v) => v == null)) continue;
      vals.forEach((v, i) => { tot[i] += v; });
      got++;
    }
  } finally { inRollout = false; }
  if (got < Math.ceil(CFG.mcSamples / 2)) return null;
  let bi = 0;
  tot.forEach((t, i) => { if (t > tot[bi] + 1e-9) bi = i; });
  return cands[bi].act;
}

function decideAction(G, p) {
  const me = G.players[p], O = A.active(G), L = A.legal(G), test = O.sec.test, N = G.obstacles[G.cur + 1];
  const myRec = A.plantedBy(O, p);

  // 1. Remove any planted card we know will fail.
  for (const rec of O.planted) {
    const cs = A.plantedCandidates(G, p, rec);
    if (cs.length && cs.every((c) => !test(c)) && L.distract.ok) return { type: 'distract', player: rec.player };
  }

  const cands = A.handCandidates(G, p);
  const P = cands.map((cs) => frac(cs, test));
  const futureVal = (i) => (N ? frac(cands[i], N.sec.test) : 0);

  // 2. Plant.
  if (!myRec && L.plant.ok) {
    const best = argmax(me.hand, (s, i) => P[i] * 10 - futureVal(i));
    if (P[best] === 1) return { type: 'plant', hand: best };
    if (CFG.mc && !inRollout) {
      const cs = [{ act: { type: 'plant', hand: best } }];
      const dump = argmax(me.hand, (s, i) => -futureVal(i) * 3 - P[i] * 0.2 - (A.isExact(s.known) ? 5 : 0));
      if (dump !== best) cs.push({ act: { type: 'plant', hand: dump } });
      if (L.guard.ok) cs.push({ act: { type: 'guard' } });
      if (L.riot.ok && G.deck.length >= 6) cs.push({ act: { type: 'riot' } });
      if (L.pass.ok) cs.push({ act: { type: 'pass' } });
      const pick = mcChoose(G, p, cs);
      if (pick) return pick;
    }
    if (P[best] >= CFG.gamble && (!CFG.needVerifier || verifierExists(G, p))) return { type: 'plant', hand: best };
    if (!L.guard.ok && P[best] > 0) return { type: 'plant', hand: best };
    if (CFG.cycleOnExcluded && G.deck.length >= (typeof CFG.cycleExcludedMinDeck === 'object' ? CFG.cycleExcludedMinDeck[G.n] : CFG.cycleExcludedMinDeck) && P.every((x) => x === 0)) {
      const dump = argmax(me.hand, (s, i) => -futureVal(i) * 3 - (A.isExact(s.known) ? 5 : 0));
      return { type: 'plant', hand: dump };
    }
    if (CFG.cycle && G.deck.length >= (typeof CFG.cycleMinDeck === 'object' ? CFG.cycleMinDeck[G.n] : CFG.cycleMinDeck) && P[best] < CFG.gamble && (!CFG.cycleNeedsVerifier || verifierExists(G, p))) {
      const hs = hintOptions(G, p);
      if (!CFG.cycleNeedsNoHint || !hs.length || hs[0].score < 2) {
        // Dump the card that matters least later; teammates will discard it if it is wrong.
        const dump = argmax(me.hand, (s, i) => -(futureVal(i) * 3 + P[i] * 0.2) - (A.isExact(s.known) ? 5 : 0));
        return { type: 'plant', hand: dump };
      }
    }
  }

  // 3. Guard check when a useful hint is on offer.
  const hints = hintOptions(G, p);
  if (L.guard.ok && hints.length && hints[0].score >= 2) return { type: 'guard' };

  // 4. Riot when I need a fresh card and no teammate can help.
  if (!myRec && me.hand.length && L.riot.ok && G.deck.length >= 6) {
    const best = Math.max(0, ...P);
    const pAny = 1 - P.reduce((a, x) => a * (1 - x), 1);
    if (best < CFG.gamble && pAny < 0.55) return { type: 'riot' };
  }

  // 5. Idle: a guard check may still earn a useful hint.
  if (L.guard.ok) return { type: 'guard' };
  if (L.pass.ok) return { type: 'pass' };
  if (L.riot.ok) return { type: 'riot' };
  if (L.distract.ok) return { type: 'distract', player: O.planted[0].player };
  if (L.plant.ok) return { type: 'plant', hand: argmax(me.hand, (s, i) => P[i]) };
  return { type: 'pass' };
}

function decideSwap(G, p) {
  const O = A.active(G), N = G.obstacles[G.cur + 1];
  // What each player knows about their own cards, as far as I can tell.
  const info = G.players.map((q) => {
    const mine = q.idx === p;
    const cands = A.handCandidates(G, q.idx, mine ? undefined : A.modelPool(G, p, q.idx));
    return {
      planted: !!A.plantedBy(O, q.idx),
      certO: cands.map((cs) => allPass(cs, O.sec.test)),
      certN: cands.map((cs) => (N ? allPass(cs, N.sec.test) : false)),
      // chance each card matches, from my point of view (my own cards are hidden from me)
      pm: q.hand.map((s, i) => (mine ? frac(cands[i], O.sec.test) : O.sec.test(s.card) ? 1 : 0)),
      pn: q.hand.map((s, i) => (!N ? 0 : mine ? frac(cands[i], N.sec.test) : N.sec.test(s.card) ? 1 : 0)),
    };
  });
  const loc = (kind, a, b) => {
    if (kind === 'discard') { const c = G.discard[a]; return { l: { kind, index: a }, owner: null, slot: -1, pm: O.sec.test(c) ? 1 : 0, pn: N && N.sec.test(c) ? 1 : 0, certO: false }; }
    const I = info[a];
    return { l: { kind, player: a, hand: b }, owner: a, slot: b, pm: I.pm[b], pn: I.pn[b], certO: I.certO[b] };
  };
  const readyO = (I) => I.certO.some(Boolean), readyN = (I) => I.certN.some(Boolean);
  const gain = (owner, inc, out) => {
    const I = info[owner];
    let v = 0;
    if (!I.planted) {
      v += inc.pm * (readyO(I) ? 1 : 10);
      if (out.certO) v -= I.certO.some((c, i) => c && i !== out.slot) ? 1 : 10;
      else v -= 1.5 * out.pm;
    }
    if (N) { v += inc.pn * (readyN(I) ? 0.3 : 2.5); v -= 0.8 * out.pn; }
    return v;
  };
  const spots = [];
  G.players.forEach((q) => q.hand.forEach((s, k) => spots.push(loc('player', q.idx, k))));
  const discs = G.discard.map((c, i) => loc('discard', i));
  let best = null;
  const consider = (x, y, score) => { if (!best || score > best.score) best = { score, a: x.l, b: y.l }; };
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const x = spots[i], y = spots[j];
      consider(x, y, x.owner === y.owner ? 0 : gain(x.owner, y, x) + gain(y.owner, x, y));
    }
    for (const d of discs) consider(spots[i], d, gain(spots[i].owner, d, spots[i]) - 0.01);
  }
  return { type: 'riotSwap', a: best.a, b: best.b };
}

function decidePatrolPick(G, p) {
  const pool = A.poolFor(G, p);
  const idx = argmax(G.patrolDiscard, (pc) => frac(pool, (c) => !pc.test(c)));
  return { type: 'distractPatrol', index: idx };
}

// Could another player safely break through? (Their own planted card is certain to them and everyone else's card matches.)
function someoneElseCanBreak(G, p) {
  const O = A.active(G);
  for (const q of G.players) {
    if (q.idx === p) continue;
    const rec = A.plantedBy(O, q.idx);
    const cs = A.isExact(rec.known) ? [rec.card] : A.modelPool(G, p, q.idx).filter((c) => A.knownMatches(c, rec.known));
    if (!allPass(cs, O.sec.test)) continue;
    if (O.planted.every((r) => r.player === q.idx || O.sec.test(r.card))) return true;
  }
  return false;
}

function decidePost(G, p) {
  if (!A.allPlanted(G)) return { type: 'end' };
  const O = A.active(G);
  let pAll = 1;
  for (const rec of O.planted) pAll *= frac(A.plantedCandidates(G, p, rec), O.sec.test);
  if (pAll > 0.9999) return { type: 'breakthrough' };
  if (CFG.alarmGamble && A.alarmVisible(G) && pAll >= 0.34 && !someoneElseCanBreak(G, p)) return { type: 'breakthrough' };
  return { type: 'end' };
}

function decideDirection(G) {
  // Tackle the hardest locks first, while the flashlight deck is full.
  const w = { easy: 1, medium: 2, hard: 3 };
  const n = G.obstacles.length;
  const score = (order) => order.reduce((s, o, i) => s + w[o.sec.level] * (n - i), 0);
  const l = score(G.obstacles), r = score(G.obstacles.slice().reverse());
  return { type: 'direction', dir: r > l ? 'rtl' : 'ltr' };
}

function decide(G) {
  const p = G.turn;
  switch (G.phase) {
    case 'direction': return decideDirection(G);
    case 'action': return decideAction(G, p);
    case 'hint': return decideHint(G, p);
    case 'riotSwap': return decideSwap(G, p);
    case 'distractPatrol': return decidePatrolPick(G, p);
    case 'post': return decidePost(G, p);
  }
  return null;
}

const api = { decide, hintOptions, verifierExists, CFG };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AceCPU = api;
})(typeof window !== 'undefined' ? window : globalThis);
