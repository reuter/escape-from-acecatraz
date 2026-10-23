/* Escape from Ace-catraz: rules engine. Browser global `Ace`, or module.exports in Node. */
(function (root) {
'use strict';

const SUITS = ['S', 'H', 'D', 'C'];
const SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_WORD = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

const CARDS = [];
for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) CARDS.push({ id: s * 13 + r - 1, suit: SUITS[s], rank: r });
const label = (c) => (DECK.id === 'prison' ? TOOLS[c.rank - 1].icon + ' ' + TOOLS[c.rank - 1].name + ' ' + SYM[c.suit] : RANKS[c.rank - 1] + SYM[c.suit]);
const idOf = (suit, rank) => SUITS.indexOf(suit) * 13 + rank - 1;

// The 17 security cards. `text` is the MATCH line printed on the card.
const SEC = [
  { key: 'odd', name: 'ODD', level: 'easy', text: 'A, 3, 5, 7, 9, J, K', test: (c) => c.rank % 2 === 1 },
  { key: 'high', name: 'HIGH', level: 'easy', text: 'RANKS 7 THROUGH K', test: (c) => c.rank >= 7 },
  { key: 'red', name: 'RED', level: 'easy', text: 'HEARTS ♥ OR DIAMONDS ♦', test: (c) => c.suit === 'H' || c.suit === 'D' },
  { key: 'black', name: 'BLACK', level: 'easy', text: 'SPADES ♠ OR CLUBS ♣', test: (c) => c.suit === 'S' || c.suit === 'C' },
  { key: 'even', name: 'EVEN', level: 'easy', text: '2, 4, 6, 8, 10, Q', test: (c) => c.rank % 2 === 0 },
  { key: 'low', name: 'LOW', level: 'easy', text: 'RANKS A THROUGH 6', test: (c) => c.rank <= 6 },
  { key: 'heart', name: 'HEART', level: 'medium', text: 'HEARTS ♥', test: (c) => c.suit === 'H' },
  { key: 'diamond', name: 'DIAMOND', level: 'medium', text: 'DIAMONDS ♦', test: (c) => c.suit === 'D' },
  { key: 'spade', name: 'SPADE', level: 'medium', text: 'SPADES ♠', test: (c) => c.suit === 'S' },
  { key: 'club', name: 'CLUB', level: 'medium', text: 'CLUBS ♣', test: (c) => c.suit === 'C' },
  { key: 'face', name: 'FACE', level: 'medium', text: 'JACK, QUEEN, OR KING', test: (c) => c.rank >= 11 },
  { key: 'a23', name: 'A, 2, 3', level: 'medium', text: 'A, 2, OR 3', test: (c) => c.rank <= 3 },
  { key: 'qk', name: 'Q, K', level: 'hard', text: 'QUEEN OR KING', test: (c) => c.rank >= 12 },
  { key: 'aj', name: 'A, J', level: 'hard', text: 'ACE OR JACK', test: (c) => c.rank === 1 || c.rank === 11 },
  { key: 'c89', name: '8 OR 9', level: 'hard', text: '8 OR 9', test: (c) => c.rank === 8 || c.rank === 9 },
  { key: 'c67', name: '6 OR 7', level: 'hard', text: '6 OR 7', test: (c) => c.rank === 6 || c.rank === 7 },
  { key: 'c45', name: '4 OR 5', level: 'hard', text: '4 OR 5', test: (c) => c.rank === 4 || c.rank === 5 },
];
const PATROL_LABEL = { easy: 'EXTREME CAUTION', medium: 'MEDIUM', hard: 'RELAXED' };

// ---- Deck packs: the same 4 x 13 card structure, dressed two ways ----------------------------------
// 'standard' = an ordinary 52-card deck (suits and ranks). 'prison' = the standalone deck: 4 Prison Gangs x 13 Tools.
// Rank 1..13 and suit S/H/D/C stay the internal identity, so every rule, hint and CPU decision is identical.
const DECK = { id: 'standard', suitWord: 'suit', rankWord: 'rank', gang: null, tools: null };
const T = (name, short, icon, cat, noise) => ({ name, short, icon, cat, noise, zone: ZONE_OF[cat] });
// Six tool categories (5 pairs + the Lock Set trio), grouped into two zones: Cell Work and Yard Work.
const ZONE_OF = { 'Lock Set': 'Cell', Sharps: 'Cell', Cutters: 'Cell', 'Climbing Gear': 'Yard', Smashers: 'Yard', 'Dig Set': 'Yard' };
const TOOLS = [
  T('Bobby Pin', 'PIN', '🧷', 'Lock Set', 'quiet'), T('Paperclip', 'CLIP', '📎', 'Lock Set', 'quiet'), T('Spoon', 'SPOON', '🥄', 'Dig Set', 'quiet'),
  T('Shiv', 'SHIV', '🪥', 'Sharps', 'quiet'), T('Nail File', 'FILE', '💅', 'Sharps', 'loud'), T('Stolen Key', 'KEY', '🔑', 'Lock Set', 'loud'),
  T('Hacksaw', 'HACKSAW', '🪚', 'Cutters', 'loud'), T('Bedsheet Rope', 'ROPE', '🪢', 'Climbing Gear', 'quiet'), T('Bolt Cutter', 'CUTTER', '✂️', 'Cutters', 'quiet'),
  T('Grappling Hook', 'HOOK', '🪝', 'Climbing Gear', 'loud'), T('Crowbar', 'CROWBAR', '🔧', 'Smashers', 'loud'), T('Sledgehammer', 'SLEDGE', '🔨', 'Smashers', 'loud'),
  T('Pickaxe', 'PICKAXE', '⛏️', 'Dig Set', 'loud'),
];
const GANGS = {
  S: { name: 'Diggers', color: '#2f6fd0', bg: '#e4eefc', block: 'South' },
  C: { name: 'Brawlers', color: '#7a4fd1', bg: '#eee7fb', block: 'South' },
  H: { name: 'Heartbreakers', color: '#d1334a', bg: '#fde6ea', block: 'North' },
  D: { name: 'Diamond Dogs', color: '#d9890a', bg: '#fdf0d9', block: 'North' },
};
const ic = (...r) => r.map((k) => TOOLS[k - 1].icon).join(' ');
const rk = (...r) => (c) => r.indexOf(c.rank) >= 0;
const PRISON_SEC = [
  { key: 'red', name: 'NORTH BLOCK', short: 'NORTH', level: 'easy', text: 'HEARTBREAKERS ★ OR DIAMOND DOGS ●', test: (c) => c.suit === 'H' || c.suit === 'D' },
  { key: 'black', name: 'SOUTH BLOCK', short: 'SOUTH', level: 'easy', text: 'DIGGERS ▲ OR BRAWLERS ■', test: (c) => c.suit === 'S' || c.suit === 'C' },
  { key: 'low', name: 'CELL WORK', short: 'CELL', level: 'easy', text: 'LOCKS, SHARPS, CUTTERS: ' + ic(1, 2, 6, 4, 5, 7, 9), test: rk(1, 2, 4, 5, 6, 7, 9) },
  { key: 'high', name: 'YARD WORK', short: 'YARD', level: 'easy', text: 'CLIMB, SMASH, DIG: ' + ic(8, 10, 11, 12, 3, 13), test: rk(3, 8, 10, 11, 12, 13) },
  { key: 'odd', name: 'QUIET TOOLS', short: 'QUIET', level: 'easy', text: 'NO NOISE: ' + ic(1, 2, 3, 4, 8, 9), test: rk(1, 2, 3, 4, 8, 9) },
  { key: 'even', name: 'LOUD TOOLS', short: 'LOUD', level: 'easy', text: 'MAKES A RACKET: ' + ic(5, 6, 7, 10, 11, 12, 13), test: rk(5, 6, 7, 10, 11, 12, 13) },
  { key: 'heart', name: 'HEARTBREAKERS', short: 'BREAKERS', level: 'medium', text: 'THE HEARTBREAKERS ★', test: (c) => c.suit === 'H' },
  { key: 'diamond', name: 'DIAMOND DOGS', short: 'DOGS', level: 'medium', text: 'THE DIAMOND DOGS ●', test: (c) => c.suit === 'D' },
  { key: 'spade', name: 'DIGGERS', short: 'DIGGERS', level: 'medium', text: 'THE DIGGERS ▲', test: (c) => c.suit === 'S' },
  { key: 'club', name: 'BRAWLERS', short: 'BRAWLERS', level: 'medium', text: 'THE BRAWLERS ■', test: (c) => c.suit === 'C' },
  { key: 'face', name: 'HEAVY HITTERS', short: 'HEAVY', level: 'medium', text: ic(11) + ' CROWBAR · ' + ic(12) + ' SLEDGEHAMMER · ' + ic(13) + ' PICKAXE', test: rk(11, 12, 13) },
  { key: 'a23', name: 'LOCK SET', short: 'LOCKS', level: 'medium', text: ic(1) + ' BOBBY PIN · ' + ic(2) + ' PAPERCLIP · ' + ic(6) + ' STOLEN KEY', test: rk(1, 2, 6) },
  { key: 'qk', name: 'DIG SET', short: 'DIG', level: 'hard', text: ic(13) + ' PICKAXE OR ' + ic(3) + ' SPOON', test: rk(3, 13) },
  { key: 'aj', name: 'SMASHERS', short: 'SMASH', level: 'hard', text: ic(11) + ' CROWBAR OR ' + ic(12) + ' SLEDGEHAMMER', test: rk(11, 12) },
  { key: 'c89', name: 'CLIMBING GEAR', short: 'CLIMB', level: 'hard', text: ic(8) + ' ROPE OR ' + ic(10) + ' GRAPPLING HOOK', test: rk(8, 10) },
  { key: 'c67', name: 'CUTTERS', short: 'CUTTERS', level: 'hard', text: ic(7) + ' HACKSAW OR ' + ic(9) + ' BOLT CUTTER', test: rk(7, 9) },
  { key: 'c45', name: 'SHARPS', short: 'SHARPS', level: 'hard', text: ic(4) + ' SHIV OR ' + ic(5) + ' NAIL FILE', test: rk(4, 5) },
];
const PACKS = {
  standard: { id: 'standard', suitWord: 'suit', rankWord: 'rank', gang: null, tools: null,
    SYM: Object.assign({}, SYM), SUIT_NAME: Object.assign({}, SUIT_NAME), RANKS: RANKS.slice(), RANK_WORD: RANK_WORD.slice(), SEC: SEC.slice() },
  prison: { id: 'prison', suitWord: 'gang', rankWord: 'tool', gang: GANGS, tools: TOOLS,
    SYM: { S: '▲', C: '■', H: '★', D: '●' }, SUIT_NAME: { S: 'Diggers', C: 'Brawlers', H: 'Heartbreakers', D: 'Diamond Dogs' },
    RANKS: TOOLS.map((t) => t.icon), RANK_WORD: TOOLS.map((t) => t.name), SEC: PRISON_SEC },
};
function setDeck(id) {
  const D = PACKS[id] || PACKS.standard;
  DECK.id = D.id; DECK.suitWord = D.suitWord; DECK.rankWord = D.rankWord; DECK.gang = D.gang; DECK.tools = D.tools;
  Object.assign(SYM, D.SYM); Object.assign(SUIT_NAME, D.SUIT_NAME);
  RANKS.splice(0, RANKS.length, ...D.RANKS); RANK_WORD.splice(0, RANK_WORD.length, ...D.RANK_WORD); SEC.splice(0, SEC.length, ...D.SEC);
  return DECK;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const isExact = (k) => k.suit != null && k.rank != null;
const knownMatches = (c, k) => (k.suit == null || c.suit === k.suit) && (k.rank == null || c.rank === k.rank);
const emptyKnown = () => ({ suit: null, rank: null });
const mkSlot = (card) => ({ card, known: emptyKnown(), not: [] });
const exactSlot = (card) => ({ card, known: { suit: card.suit, rank: card.rank }, not: [] });
const secOf = (key) => SEC.find((x) => x.key === key);
const failsAllNot = (c, not) => !not || not.every((k) => !secOf(k).test(c));

const NAMES = ['Ace', 'Deuce', 'Knuckles', 'Duke'];

function newGame(opts) {
  opts = opts || {};
  const n = opts.n || 2;
  const seed = opts.seed != null ? opts.seed : (Math.random() * 4294967296) >>> 0;
  const rng = mulberry32(seed);
  const hardAll = shuffle(SEC.filter((s) => s.level === 'hard'), rng);
  const easyMed = SEC.filter((s) => s.level !== 'hard');
  const hardIn = n - 1; // 2p:1, 3p:2, 4p:3
  const obsDeck = shuffle(easyMed.concat(hardAll.slice(0, hardIn)), rng);
  const nObs = { 2: 8, 3: 5, 4: 3 }[n] + (opts.extra ? 1 : 0);
  const obstacles = obsDeck.slice(0, nObs).map((sec, i) => ({ sec, faceUp: false, cleared: false, planted: [] }));
  const patrol = shuffle(obsDeck.slice(nObs).concat(hardAll.slice(hardIn)), rng);
  const deck = shuffle(CARDS, rng);
  const players = [];
  for (let i = 0; i < n; i++) {
    const hand = [];
    for (let k = 0; k < 5; k++) hand.push(mkSlot(deck.pop()));
    players.push({ idx: i, name: (opts.names && opts.names[i]) || NAMES[i], human: !!(opts.human && opts.human[i]), hand });
  }
  const G = {
    n, seed, rng, opts, players, deck, discard: [], patrol, patrolDiscard: [], obstacles, cur: 0,
    turn: 0, phase: 'direction', dir: null, pending: null, seen: players.map(() => new Set()),
    result: null, passStreak: 0, turnCount: 0, log: [], stats: { guards: 0, guardPass: 0, riots: 0, distracts: 0, plants: 0, hints: 0 },
  };
  refreshSeen(G);
  say(G, null, 'Setup: ' + nObs + ' obstacles, ' + patrol.length + ' patrol cards, ' + deck.length + ' flashlight cards left.');
  return G;
}

// Silence speaks: a crewmate who points at a card must point at a card that fits the active obstacle if any teammate
// is holding one they are not yet sure about. So if nobody has such a card, every unresolved card in the other hands
// is known NOT to fit. This only records the inference when it is actually true, so it can never mislead the crew.
function silenceCheck(G, hinter) {
  const O = active(G);
  if (!O) return null;
  const who = [];
  for (const q of G.players) {
    if (q.idx === hinter || !q.hand.length || plantedBy(O, q.idx)) continue;
    const cands = handCandidates(G, q.idx);
    for (let k = 0; k < q.hand.length; k++) {
      if (!O.sec.test(q.hand[k].card)) continue;
      if (cands[k].length && cands[k].every(O.sec.test)) continue; // they already know this one fits
      return null; // there was a card worth pointing at, so silence tells us nothing
    }
    who.push(q.idx);
  }
  return who.length ? { key: O.sec.key, who } : null;
}
function applySilence(G, hinter, sil) {
  const O = active(G);
  const names = [];
  for (const i of sil.who) {
    for (const s of G.players[i].hand) {
      if (isExact(s.known) || O.sec.test(s.card) || s.not.includes(sil.key)) continue;
      s.not.push(sil.key);
    }
    names.push(G.players[i].name);
  }
  G.lastSilence = { by: hinter, key: sil.key, who: sil.who };
  say(G, null, 'Silence speaks: ' + G.players[hinter].name + ' had no better card to point at, so ' + names.join(', ') + ' can tell that no unlabelled card in their hand fits ' + O.sec.name + '.');
}

function say(G, p, text) { G.log.push({ n: G.log.length, p, text }); }
function active(G) { return G.cur < G.obstacles.length ? G.obstacles[G.cur] : null; }
function alarmVisible(G) { return G.deck.length === 0; }
function plantedBy(O, p) { return O && O.planted.find((r) => r.player === p); }
function allPlanted(G) {
  const O = active(G);
  if (!O) return false;
  for (let i = 0; i < G.n; i++) if (O.planted.filter((r) => r.player === i).length !== 1) return false;
  return true;
}

function refreshSeen(G) {
  for (let p = 0; p < G.n; p++) {
    const s = G.seen[p];
    for (let q = 0; q < G.n; q++) if (q !== p) for (const sl of G.players[q].hand) s.add(sl.card.id);
    for (const c of G.discard) s.add(c.id);
  }
}

// ---- Knowledge helpers (used by CPU and by the UI for hint tags) ----
function poolFor(G, p) {
  const seen = G.seen[p];
  const ex = new Set(G.players[p].hand.filter((s) => isExact(s.known)).map((s) => idOf(s.known.suit, s.known.rank)));
  return CARDS.filter((c) => !seen.has(c.id) && !ex.has(c.id));
}
function handCandidates(G, p, pool) {
  const hand = G.players[p].hand;
  pool = pool || poolFor(G, p);
  const cands = hand.map((s) => (isExact(s.known) ? [CARDS[idOf(s.known.suit, s.known.rank)]] : pool.filter((c) => knownMatches(c, s.known) && failsAllNot(c, s.not))));
  let changed = true;
  while (changed) {
    changed = false;
    const singles = new Set(cands.filter((a) => a.length === 1).map((a) => a[0].id));
    for (let i = 0; i < cands.length; i++) {
      if (cands[i].length > 1) {
        const f = cands[i].filter((c) => !singles.has(c.id));
        if (f.length !== cands[i].length && f.length > 0) { cands[i] = f; changed = true; }
      }
    }
  }
  return cands;
}
// What viewer h can infer about teammate T's candidate pool, using only what h can see.
function modelPool(G, h, T) {
  const out = new Set(G.seen[h]);
  for (const s of G.players[T].hand) out.delete(s.card.id);
  for (const O of G.obstacles) for (const r of O.planted) if (r.player === T && !isExact(r.known)) out.delete(r.card.id);
  const ex = new Set(G.players[T].hand.filter((s) => isExact(s.known)).map((s) => idOf(s.known.suit, s.known.rank)));
  return CARDS.filter((c) => !out.has(c.id) && !ex.has(c.id));
}
function plantedCandidates(G, viewer, rec) {
  if (rec.player !== viewer || isExact(rec.known) || G.seen[viewer].has(rec.card.id)) return [rec.card];
  return poolFor(G, viewer).filter((c) => knownMatches(c, rec.known) && failsAllNot(c, rec.not));
}

// ---- Actions ----
const OK = { ok: true };
const no = (why) => ({ ok: false, why });

function legal(G) {
  const p = G.turn, me = G.players[p], O = active(G), L = {};
  if (G.result) return L;
  if (G.phase !== 'action') return L;
  L.plant = plantedBy(O, p) ? no('You already planted a card here.') : !me.hand.length ? no('You have no cards in hand.') : OK;
  L.guard = !G.deck.length ? no('No flashlight cards left.') : !G.patrol.length ? no('The patrol deck is empty.') : OK;
  L.distract = !O.planted.length ? no('No planted cards to discard.') : OK;
  L.riot = G.deck.length < 5 ? no('Needs 5 flashlight cards left to discard.') : OK;
  const stuck = !L.plant.ok && !L.guard.ok && !L.distract.ok && !L.riot.ok;
  L.pass = alarmVisible(G) || stuck ? OK : no('Only after the Alarm Sounds card is visible.');
  return L;
}

function hasSwapOption(G) {
  const hands = G.players.reduce((n, q) => n + q.hand.length, 0);
  return hands >= 1 && hands + G.discard.length >= 2;
}
function locOf(G, l) {
  if (!l) return null;
  if (l.kind === 'discard') return G.discard[l.index] ? { kind: 'discard', index: l.index } : null;
  if (l.kind === 'player') { const q = G.players[l.player]; return q && q.hand[l.hand] ? { kind: 'player', player: l.player, hand: l.hand } : null; }
  return null;
}

function apply(G, a) {
  if (G.result) return no('Game over.');
  const p = G.turn, me = G.players[p], O = active(G);
  const ph = G.phase;
  const L = ph === 'action' ? legal(G) : null;
  switch (a.type) {
    case 'direction': {
      if (ph !== 'direction') return no('The direction is already chosen.');
      if (a.dir !== 'ltr' && a.dir !== 'rtl') return no('Pick left to right or right to left.');
      G.dir = a.dir;
      if (a.dir === 'rtl') G.obstacles.reverse();
      G.obstacles[0].faceUp = true;
      if (G.obstacles[1]) G.obstacles[1].faceUp = true;
      say(G, p, me.name + ' leads the crew ' + (a.dir === 'ltr' ? 'left to right' : 'right to left') + '. The first two obstacles are flipped.');
      G.phase = 'action'; return OK;
    }
    case 'plant': {
      if (ph !== 'action' || !L.plant.ok) return no(L && L.plant ? L.plant.why : 'Not allowed now.');
      if (!(a.hand >= 0 && a.hand < me.hand.length)) return no('Pick a card in your hand.');
      const slot = me.hand.splice(a.hand, 1)[0];
      O.planted.push({ player: p, card: slot.card, known: Object.assign({}, slot.known), not: (slot.not || []).slice() });
      if (isExact(slot.known)) G.seen[p].add(slot.card.id);
      G.stats.plants++;
      say(G, p, me.name + ' plants a card face-down at the active obstacle.');
      if (G.deck.length) { me.hand.push(mkSlot(G.deck.pop())); say(G, p, me.name + ' draws a flashlight card.'); }
      else say(G, p, 'Drawing is locked.');
      G.passStreak = 0; G.phase = 'post'; break;
    }
    case 'guard': {
      if (ph !== 'action' || !L.guard.ok) return no(L && L.guard ? L.guard.why : 'Not allowed now.');
      const pat = G.patrol.pop(), fl = G.deck.pop();
      const passed = !pat.test(fl); // patrol side says "do not match"
      G.patrolDiscard.push(pat); G.discard.push(fl);
      G.stats.guards++; G.passStreak = 0;
      G.lastGuard = { patrol: pat, flash: fl, pass: passed, by: p };
      say(G, p, me.name + ' flips ' + label(fl) + ' vs patrol NOT ' + pat.name + ': ' + (passed ? 'PASS' : 'FAIL (stay silent)') + '.');
      if (passed) {
        G.stats.guardPass++;
        const hasTarget = G.players.some((q) => q.idx !== p && q.hand.length);
        G.phase = hasTarget ? 'hint' : 'post';
      } else G.phase = 'post';
      break;
    }
    case 'hint': {
      if (ph !== 'hint') return no('Not allowed now.');
      const T = G.players[a.to];
      if (!T || a.to === p) return no('Pick a teammate.');
      const slot = T.hand[a.hand];
      if (!slot) return no('Pick a card in their hand.');
      if (a.dim !== 'suit' && a.dim !== 'rank') return no('Choose suit or rank.');
      const silent = G.opts.silence !== false ? silenceCheck(G, p) : null; // before the hint lands
      slot.known[a.dim] = slot.card[a.dim];
      G.stats.hints++;
      const txt = a.dim === 'suit' ? 'a ' + SUIT_NAME[slot.card.suit].slice(0, -1) : 'a ' + RANK_WORD[slot.card.rank - 1];
      say(G, p, me.name + ' points at ' + T.name + "'s card " + (a.hand + 1) + ': it is ' + (a.dim === 'suit' ? 'a ' + SUIT_NAME[slot.card.suit] + ' card' : txt) + '.');
      G.lastHint = { by: p, to: a.to, hand: a.hand, dim: a.dim };
      if (silent) applySilence(G, p, silent);
      G.phase = 'post'; break;
    }
    case 'distract': {
      if (ph !== 'action' || !L.distract.ok) return no(L && L.distract ? L.distract.why : 'Not allowed now.');
      const i = O.planted.findIndex((r) => r.player === a.player);
      if (i < 0) return no('Pick a planted card.');
      const rec = O.planted.splice(i, 1)[0];
      G.discard.push(rec.card);
      G.stats.distracts++; G.passStreak = 0;
      say(G, p, me.name + ' creates a distraction: ' + G.players[rec.player].name + "'s planted card is discarded face-up (" + label(rec.card) + ').');
      G.phase = G.patrolDiscard.length ? 'distractPatrol' : 'post';
      break;
    }
    case 'distractPatrol': {
      if (ph !== 'distractPatrol') return no('Not allowed now.');
      const pc = G.patrolDiscard[a.index];
      if (!pc) return no('Pick a patrol card from the discard.');
      G.patrolDiscard.splice(a.index, 1);
      G.patrol = shuffle(G.patrol.concat([pc]), G.rng);
      say(G, p, me.name + ' shuffles patrol card NOT ' + pc.name + ' back into the patrol deck.');
      G.phase = 'post'; break;
    }
    case 'riot': {
      if (ph !== 'action' || !L.riot.ok) return no(L && L.riot ? L.riot.why : 'Not allowed now.');
      const out = [];
      for (let k = 0; k < 5 && G.deck.length; k++) { const c = G.deck.pop(); G.discard.push(c); out.push(c); }
      G.stats.riots++; G.passStreak = 0;
      say(G, p, me.name + ' starts a riot and discards ' + out.map(label).join(' ') + (alarmVisible(G) ? ' (the Alarm Sounds!)' : '') + '.');
      G.phase = hasSwapOption(G) ? 'riotSwap' : 'post';
      break;
    }
    case 'riotSwap': {
      if (ph !== 'riotSwap') return no('Not allowed now.');
      const la = locOf(G, a.a), lb = locOf(G, a.b);
      if (!la || !lb) return no('Pick two cards to swap.');
      if (la.kind === 'discard' && lb.kind === 'discard') return no('Pick at least one card from a hand.');
      if (la.kind === lb.kind && (la.kind === 'discard' ? la.index === lb.index : la.player === lb.player && la.hand === lb.hand)) return no('Pick two different cards.');
      const txt = (l) => (l.kind === 'discard' ? 'the discard pile' : G.players[l.player].name + "'s card " + (l.hand + 1));
      if (la.kind === 'player' && lb.kind === 'player') {
        const P = G.players[la.player], Q = G.players[lb.player];
        const sa = P.hand[la.hand], sb = Q.hand[lb.hand];
        if (la.player === lb.player) {
          P.hand[la.hand] = sb; P.hand[lb.hand] = sa; // hints travel with the cards
          say(G, p, me.name + ' swaps two cards in ' + P.name + "'s hand" + (P.human ? '.' : ' (' + label(sa.card) + ' and ' + label(sb.card) + ').'));
        } else {
          P.hand[la.hand] = exactSlot(sb.card); Q.hand[lb.hand] = exactSlot(sa.card);
          G.seen[la.player].add(sb.card.id); G.seen[lb.player].add(sa.card.id);
          say(G, p, me.name + ' swaps ' + txt(la) + ' (' + label(sa.card) + ') with ' + txt(lb) + ' (' + label(sb.card) + '). Each now knows the card they received.');
        }
      } else {
        const h = la.kind === 'player' ? la : lb, d = la.kind === 'discard' ? la : lb;
        const P = G.players[h.player], slot = P.hand[h.hand], dc = G.discard[d.index];
        G.discard.splice(d.index, 1);
        G.discard.push(slot.card);
        P.hand[h.hand] = exactSlot(dc);
        G.seen[h.player].add(dc.id);
        say(G, p, me.name + ' swaps ' + txt(h) + ' (' + label(slot.card) + ') with ' + label(dc) + ' from the discard pile.');
      }
      G.phase = 'post'; break;
    }
    case 'pass': {
      if (ph !== 'action' || !L.pass.ok) return no(L && L.pass ? L.pass.why : 'Not allowed now.');
      G.passStreak++;
      say(G, p, me.name + ' passes.');
      G.phase = 'post'; break;
    }
    case 'breakthrough': {
      if (ph !== 'post') return no('Not allowed now.');
      if (!allPlanted(G)) return no('Every player needs exactly one planted card.');
      const bad = O.planted.filter((r) => !O.sec.test(r.card));
      say(G, p, me.name + ' goes for a breakthrough! Revealed: ' + O.planted.map((r) => G.players[r.player].name + ' ' + label(r.card)).join(', ') + '.');
      G.lastBreak = { ok: !bad.length, obstacle: G.cur };
      if (bad.length) {
        G.result = { won: false, reason: 'The breakthrough failed. ' + label(bad[0].card) + ' did not meet "' + O.sec.text + '". The alarm is tripped.' };
        G.phase = 'over'; refreshSeen(G); return OK;
      }
      for (const rc of O.planted) for (const st of G.seen) st.add(rc.card.id); // revealed to everyone
      O.cleared = true; G.cur++;
      if (G.cur >= G.obstacles.length) {
        G.result = { won: true, reason: 'Every obstacle is cleared. Freedom!' };
        G.phase = 'over'; refreshSeen(G); return OK;
      }
      G.obstacles[G.cur].faceUp = true;
      if (G.obstacles[G.cur + 1]) G.obstacles[G.cur + 1].faceUp = true;
      say(G, p, 'Obstacle cleared. ' + (G.obstacles.length - G.cur) + ' to go.');
      refreshSeen(G);
      return endTurn(G);
    }
    case 'end': {
      if (ph !== 'post') return no('Not allowed now.');
      refreshSeen(G);
      return endTurn(G);
    }
    default: return no('Unknown action.');
  }
  refreshSeen(G);
  return OK;
}

// A plausible full table, built from what player p can know: p's own hidden cards, the deck order, the hidden
// obstacles and the patrol deck are re-dealt at random but consistent with every hint and silence inference.
// Used by the CPU to play candidate moves forward ("rollouts"). Returns null if it can't make a consistent world.
function sampleWorld(G, p, seed) {
  const rng = mulberry32(seed);
  const O = active(G), me = G.players[p];
  const pool = poolFor(G, p);
  const unk = [];
  me.hand.forEach((s, i) => { if (!isExact(s.known)) unk.push({ t: 'h', i, known: s.known, not: s.not }); });
  const rec = O ? plantedBy(O, p) : null;
  if (rec && !isExact(rec.known) && !G.seen[p].has(rec.card.id)) unk.push({ t: 'r', known: rec.known, not: rec.not });
  if (pool.length - unk.length !== G.deck.length) return null;
  const cand = unk.map((u) => pool.filter((c) => knownMatches(c, u.known) && failsAllNot(c, u.not)));
  const order = unk.map((_, i) => i).sort((a, b) => cand[a].length - cand[b].length);
  let pick = null;
  for (let attempt = 0; attempt < 30 && !pick; attempt++) {
    const used = new Set(), got = new Array(unk.length);
    let ok = true;
    for (const i of order) {
      const opts = cand[i].filter((c) => !used.has(c.id));
      if (!opts.length) { ok = false; break; }
      const c = opts[Math.floor(rng() * opts.length)];
      used.add(c.id); got[i] = c;
    }
    if (ok) pick = { got, used };
  }
  if (!pick) return null;
  const rest = shuffle(pool.filter((c) => !pick.used.has(c.id)), rng);
  // hidden security cards: obstacles still face down keep their (visible) lock level; the rest become the patrol deck
  const known = new Set();
  for (const o of G.obstacles) if (o.faceUp || o.cleared) known.add(o.sec.key);
  for (const c of G.patrolDiscard) known.add(c.key);
  const hiddenIdx = G.obstacles.map((o, i) => i).filter((i) => !G.obstacles[i].faceUp && !G.obstacles[i].cleared);
  const unknownSec = shuffle(SEC.filter((c) => !known.has(c.key)), rng);
  const newSec = {};
  for (const i of hiddenIdx) {
    const lvl = G.obstacles[i].sec.level, j = unknownSec.findIndex((c) => c.level === lvl);
    if (j < 0) return null;
    newSec[i] = unknownSec.splice(j, 1)[0];
  }
  if (unknownSec.length !== G.patrol.length) return null;
  const topLvl = G.patrol.length ? G.patrol[G.patrol.length - 1].level : null;
  if (topLvl) { const j = unknownSec.findIndex((c) => c.level === topLvl); if (j < 0) return null; unknownSec.push(unknownSec.splice(j, 1)[0]); }
  const W = Object.assign({}, G);
  W.rng = rng; W.rngSeed = (seed ^ 0x9e3779b9) >>> 0; W.log = []; W.stats = Object.assign({}, G.stats); W.result = null;
  W.discard = G.discard.slice(); W.patrolDiscard = G.patrolDiscard.slice(); W.deck = rest; W.patrol = unknownSec;
  W.players = G.players.map((pl) => ({ idx: pl.idx, name: pl.name, human: false, hand: pl.hand.map((s) => ({ card: s.card, known: Object.assign({}, s.known), not: (s.not || []).slice() })) }));
  W.obstacles = G.obstacles.map((o, i) => ({ sec: newSec[i] || o.sec, faceUp: o.faceUp, cleared: o.cleared, planted: o.planted.map((r) => ({ player: r.player, card: r.card, known: Object.assign({}, r.known), not: (r.not || []).slice() })) }));
  W.seen = G.seen.map((st) => new Set(st));
  const realIds = [];
  unk.forEach((u, k) => {
    if (u.t === 'h') { realIds.push(me.hand[u.i].card.id); W.players[p].hand[u.i].card = pick.got[k]; }
    else { const wr = plantedBy(W.obstacles[G.cur], p); realIds.push(wr.card.id); wr.card = pick.got[k]; }
  });
  for (let q = 0; q < G.n; q++) {
    if (q === p) continue;
    for (const id of realIds) W.seen[q].delete(id);
    for (const c of pick.got) W.seen[q].add(c.id);
  }
  return W;
}

function cloneWorld(W) {
  const C = Object.assign({}, W);
  C.rng = mulberry32(W.rngSeed); C.log = []; C.stats = Object.assign({}, W.stats);
  C.deck = W.deck.slice(); C.discard = W.discard.slice(); C.patrol = W.patrol.slice(); C.patrolDiscard = W.patrolDiscard.slice();
  C.players = W.players.map((pl) => ({ idx: pl.idx, name: pl.name, human: false, hand: pl.hand.map((s) => ({ card: s.card, known: Object.assign({}, s.known), not: s.not.slice() })) }));
  C.obstacles = W.obstacles.map((o) => ({ sec: o.sec, faceUp: o.faceUp, cleared: o.cleared, planted: o.planted.map((r) => ({ player: r.player, card: r.card, known: Object.assign({}, r.known), not: (r.not || []).slice() })) }));
  C.seen = W.seen.map((st) => new Set(st));
  return C;
}

function endTurn(G) {
  G.turnCount++;
  if (G.players.every((q) => !q.hand.length) && G.cur < G.obstacles.length) {
    G.result = { won: false, reason: 'Everyone is out of cards and obstacles remain. Back to your cells.' };
    G.phase = 'over'; return OK;
  }
  if (G.passStreak >= G.n) {
    G.result = { won: false, reason: 'Nobody can make progress. Back to your cells.' };
    G.phase = 'over'; return OK;
  }
  if (G.turnCount > 600) {
    G.result = { won: false, reason: 'Turn cap reached.' };
    G.phase = 'over'; return OK;
  }
  G.turn = (G.turn + 1) % G.n;
  G.phase = 'action';
  return OK;
}

const api = {
  SUITS, SYM, SUIT_NAME, RANKS, RANK_WORD, CARDS, SEC, PATROL_LABEL, NAMES, DECK, TOOLS, GANGS, setDeck,
  label, idOf, isExact, knownMatches, mulberry32, shuffle,
  newGame, sampleWorld, cloneWorld, apply, legal, active, alarmVisible, allPlanted, plantedBy, hasSwapOption,
  poolFor, handCandidates, modelPool, plantedCandidates,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Ace = api;
})(typeof window !== 'undefined' ? window : globalThis);
