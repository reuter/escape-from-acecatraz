(function () {
'use strict';
const A = window.Ace, CPU = window.AceCPU;
const app = document.getElementById('app');
let G = null, timer = null;
const ui = { n: 2, extra: false, speed: 800, assist: false, dialog: 'setup', endSeen: false, sel: null, swapA: null, hintSel: null, reveal: null, flash: null, tray: false, notice: null, help: false };
try { const s = JSON.parse(localStorage.getItem('ace.settings') || 'null'); if (s) for (const k of ['n', 'extra', 'speed', 'assist']) if (k in s) ui[k] = s[k]; } catch (e) {}
const save = () => { try { localStorage.setItem('ace.settings', JSON.stringify({ n: ui.n, extra: ui.extra, speed: ui.speed, assist: ui.assist })); } catch (e) {} };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const redSuit = (s) => s === 'H' || s === 'D';
const symHTML = (s) => '<span class="' + (redSuit(s) ? 'rd' : '') + '">' + A.SYM[s] + '</span>';
const LEVEL = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };

function card(c, cls, attrs) {
  return '<button class="pc ' + (redSuit(c.suit) ? 'red ' : '') + (cls || '') + '" ' + (attrs || '') + ' aria-label="' + esc(A.label(c)) + '">' +
    '<span class="r">' + A.RANKS[c.rank - 1] + '</span><span class="s">' + A.SYM[c.suit] + '</span><span class="big">' + A.SYM[c.suit] + '</span></button>';
}
function back(cls, attrs) { return '<button class="pc back ' + (cls || '') + '" ' + (attrs || '') + ' aria-label="Face-down card"></button>'; }
function known(k) {
  if (A.isExact(k)) return '<span class="known exact">is ' + A.RANKS[k.rank - 1] + symHTML(k.suit) + '</span>';
  const parts = [];
  if (k.suit) parts.push(symHTML(k.suit));
  if (k.rank) parts.push(A.RANKS[k.rank - 1]);
  return parts.length ? '<span class="known has">' + parts.join(' ') + '</span>' : '<span class="known">no hints</span>';
}
function secUp(sec) {
  return '<div class="sec up"><span class="pill">ESCAPE PLAN</span><span class="nm">' + esc(sec.name) + '</span>' +
    '<div class="match"><i>MATCH:</i>' + esc(sec.text) + '</div><span class="lvl">' + LEVEL[sec.level] + '</span></div>';
}
function patUp(sec, cls, attrs) {
  return '<div class="pat ' + (cls || '') + '" ' + (attrs || '') + '><span class="pill">GUARD CHECK</span><span class="nm">NOT ' + esc(sec.name) + '</span>' +
    '<div class="dn">DO NOT MATCH: ' + esc(sec.text) + '</div></div>';
}


const AV = [
  { bg: '#f2a516', skin: '#f6c9a0', hair: '#5b3a1e', kind: 'beanie', hat: '#e23d4a' },
  { bg: '#e23d4a', skin: '#c68a5e', hair: '#222', kind: 'spiky' },
  { bg: '#1fa38a', skin: '#8d5a3c', hair: '#222', kind: 'bald' },
  { bg: '#7a4fd1', skin: '#f6d3b3', hair: '#c9822b', kind: 'crown' }
];
function avatar(i, size) {
  const a = AV[i % 4], sz = size || 36;
  let top = '';
  if (a.kind === 'beanie') top = '<path d="M20 36 Q20 14 40 14 Q60 14 60 36 Z" fill="' + a.hat + '"/><rect x="18" y="32" width="44" height="8" rx="4" fill="#fff"/><circle cx="40" cy="12" r="4" fill="#fff"/>';
  else if (a.kind === 'spiky') top = '<path d="M20 36 L22 16 L30 28 L36 10 L42 28 L50 12 L54 28 L60 18 L60 36 Z" fill="' + a.hair + '"/>';
  else if (a.kind === 'bald') top = '<ellipse cx="32" cy="24" rx="5" ry="3" fill="#fff" opacity=".45" transform="rotate(-30 32 24)"/>';
  else top = '<path d="M22 30 L22 14 L31 22 L40 10 L49 22 L58 14 L58 30 Z" fill="#f7c928" stroke="#c99a00" stroke-width="2" stroke-linejoin="round"/><rect x="22" y="28" width="36" height="5" fill="#f7c928" stroke="#c99a00" stroke-width="2"/>' + '<path d="M20 40 Q20 30 40 30 Q60 30 60 40 Z" fill="' + a.hair + '" opacity="0"/>';
  return '<svg class="av" width="' + sz + '" height="' + sz + '" viewBox="0 0 80 80" aria-hidden="true"><defs><clipPath id="avc' + i + '-' + sz + '"><circle cx="40" cy="40" r="40"/></clipPath></defs>' +
    '<g clip-path="url(#avc' + i + '-' + sz + ')"><rect width="80" height="80" fill="' + a.bg + '"/>' +
    '<path d="M6 84 Q8 58 40 56 Q72 58 74 84 Z" fill="#fff"/>' +
    [0, 1, 2, 3, 4].map((k) => '<rect x="' + (10 + k * 14) + '" y="56" width="7" height="26" fill="#222" opacity=".85"/>').join('') +
    '<rect x="34" y="50" width="12" height="9" fill="' + a.skin + '"/>' +
    '<ellipse cx="40" cy="36" rx="19" ry="20" fill="' + a.skin + '"/>' + top +
    '<ellipse cx="33" cy="38" rx="4.6" ry="5.4" fill="#fff"/><ellipse cx="47" cy="38" rx="4.6" ry="5.4" fill="#fff"/>' +
    '<circle cx="34" cy="39" r="2.5" fill="#222"/><circle cx="48" cy="39" r="2.5" fill="#222"/>' +
    '<path d="M33 47 Q40 54 47 47" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/></g></svg>';
}

function isSwapSel(pl, i) { const a = ui.swapA; return !!a && a.kind === 'player' && a.player === pl && a.hand === i; }
function mode() {
  if (!G || G.result || ui.dialog || ui.help) return null;
  if (!G.players[G.turn].human) return null;
  switch (G.phase) {
    case 'direction': return 'direction';
    case 'action': return ui.sel || 'choose';
    case 'hint': return 'hint';
    case 'distractPatrol': return 'patrol';
    case 'riotSwap': return ui.swapA == null ? 'swapA' : 'swapB';
    case 'post': return 'post';
  }
  return null;
}

function headerHTML() {
  const alarm = G && A.alarmVisible(G);
  let chips = '';
  if (G) {
    chips = '<span class="chip ' + (alarm ? 'alarm' : '') + '">' + (alarm ? '<b>ALARM SOUNDS</b> drawing locked' : 'Flashlight deck <b>' + G.deck.length + '</b>') + '</span>' +
      '<span class="chip">Patrol deck <b>' + G.patrol.length + '</b></span>' +
      '<span class="chip">Cleared <b>' + Math.min(G.cur, G.obstacles.length) + '/' + G.obstacles.length + '</b></span>';
  }
  const bar = '<header class="bar"><h1>Escape from <span class="tag">Ace-catraz!</span><span class="demo">Demo</span></h1><span class="barbtns"><button class="btn sm" data-act="help">How to play</button> <button class="btn sm" data-act="newgame">New game</button></span></header>';
  if (!G) return bar;
  return bar + '<div class="sub"><div class="chips">' + chips + '</div><label class="check"><input type="checkbox" data-act="assist" ' + (ui.assist ? 'checked' : '') + '> Outline cards that match the active obstacle</label></div>';
}

function planHTML() {
  const md = mode();
  const items = G.obstacles.map((O, i) => {
    let cls = 'obs', tag = 'Locked', face;
    if (i < G.cur) { cls += ' done'; tag = 'Cleared'; face = '<div class="sec">' + esc(O.sec.name) + ' ✓</div>'; }
    else {
      if (G.phase !== 'direction' && i === G.cur) { cls += ' active'; tag = 'Active'; } else if (O.faceUp) tag = 'Next';
      face = O.faceUp ? secUp(O.sec) : '<div class="sec down ' + O.sec.level + '"><small>LOCK SECURITY LEVEL</small><b>' + LEVEL[O.sec.level] + '</b></div>';
    }
    let corners = '';
    if (i === G.cur && G.phase !== 'direction') {
      corners = '<div class="corners">' + G.players.map((p) => {
        const rec = A.plantedBy(O, p.idx);
        const ini = esc(p.name) + (p.human ? ' (you)' : '');
        if (!rec) return '<div class="corner empty">' + back('mini') + '<span class="who">' + avatar(p.idx, 20) + ini + '</span></div>';
        const pick = md === 'distract' ? 'pick' : '';
        return '<div class="corner">' + back('mini ' + pick, pick ? 'data-act="distract-pick" data-p="' + p.idx + '"' : '') + '<span class="who">' + avatar(p.idx, 20) + ini + '</span></div>';
      }).join('') + '</div>';
    }
    return '<div class="' + cls + '"><span class="tagline">' + (i + 1) + ' · ' + tag + '</span>' + face + corners + '</div>';
  });
  return '<section class="panel"><h2>Escape plan <small>' + (G.dir === 'ltr' ? 'escaping left to right' : G.dir === 'rtl' ? 'escaping right to left' : 'direction not chosen yet') + '</small></h2><div class="plan ' + (G.dir === 'rtl' ? 'rtl' : '') + '">' + items.join('') + '</div></section>';
}

function tableHTML() {
  const alarm = A.alarmVisible(G);
  const flash = alarm ? '<div class="stack alarm">ALARM<br>SOUNDS</div>' : '<div class="stack flash">' + G.deck.length + '</div>';
  const top = G.patrol[G.patrol.length - 1];
  const PL = { easy: ['EXTREME CAUTION', 'hard to pass', 'caution'], medium: ['MEDIUM', 'medium odds', 'med'], hard: ['RELAXED', 'easy to pass', 'relaxed'] };
  const lv = top ? PL[top.level] : null;
  const pat = top ? '<div class="stack patrol ' + lv[2] + '">GUARD PATROL<b>' + lv[0] + '</b></div>' : '<div class="stack empty">empty</div>';
  const lg = G.lastGuard;
  let guard = '<span class="mono" style="color:var(--muted);font-size:12px">No guard check yet.</span>';
  if (lg) guard = patUp(lg.patrol) + card(lg.flash) + '<div><div class="verdict ' + (lg.pass ? 'pass' : 'fail') + '">' + (lg.pass ? 'Pass' : 'Fail') + '</div><div class="mono" style="font-size:11px;color:var(--muted)">' + esc(G.players[lg.by].name) + (lg.pass ? ' may give a hint' : ' stays silent') + '</div></div>';
  const last = G.log.slice(-3).reverse();
  let rev = '';
  if (ui.reveal) rev = '<div><b>Last breakthrough: ' + (ui.reveal.ok ? 'success' : 'FAILED') + '</b><div class="reveal">' + ui.reveal.items.map((r) => '<div class="corner">' + card(r.card, 'mini') + '<span>' + esc(G.players[r.player].name) + '</span></div>').join('') + '</div></div>';
  return '<section class="panel"><h2>The yard <small>flashlight deck, patrol deck, last guard check</small></h2><div class="table">' +
    '<div class="pile">' + flash + 'flashlight deck</div><div class="pile">' + pat + (lv ? 'next check: ' + lv[1] + ' \u00b7 ' + G.patrol.length + ' left' : 'patrol deck empty') + '</div>' +
    '<div class="pile"><button class="btn sm" data-act="tray">Discards ' + G.discard.length + ' / ' + G.patrolDiscard.length + '</button></div>' +
    '<div class="guardbox">' + guard + '</div>' +
    '<div class="banner"><b>Latest</b>' + last.map((l, i) => '<div style="' + (i ? 'opacity:.6;font-size:13px' : 'font-weight:600') + '">' + esc(l.text) + '</div>').join('') + rev + '</div></div></section>';
}

function trayHTML() {
  const md = mode();
  if (!(ui.tray || md === 'swapA' || md === 'swapB' || md === 'patrol')) return '';
  const sw = md === 'swapA' || md === 'swapB';
  const fl = G.discard.length ? G.discard.map((c, i) => card(c, 'mini ' + (sw ? 'pick ' : '') + (sw && ui.swapA && ui.swapA.kind === 'discard' && ui.swapA.index === i ? 'sel' : ''), sw ? 'data-act="swapslot" data-k="discard" data-i="' + i + '"' : '')).join('') : '<span class="none">empty</span>';
  const pt = G.patrolDiscard.length ? G.patrolDiscard.map((s, i) => patUp(s, 'mini ' + (md === 'patrol' ? 'pick' : ''), md === 'patrol' ? 'data-act="patrol-pick" data-i="' + i + '" role="button" tabindex="0"' : '')).join('') : '<span class="none">empty</span>';
  return '<section class="panel"><h2>Discard piles <small>face-up, nobody can reshuffle them</small></h2><div class="tray"><div class="group"><b>Flashlight discard</b><div class="cards">' + fl + '</div></div>' +
    '<div class="group"><b>Patrol discard</b><div class="cards">' + pt + '</div></div></div></section>';
}

function seatHTML(p) {
  const md = mode(), O = A.active(G), test = O ? O.sec.test : null;
  const turn = !G.result && G.turn === p.idx;
  const planted = O && A.plantedBy(O, p.idx);
  const slots = p.hand.map((s, i) => {
    let inner;
    if (p.human) {
      const sw = md === 'swapA' || md === 'swapB';
      const pick = md === 'plant' || sw;
      const sel = sw && isSwapSel(p.idx, i);
      inner = back((pick ? 'pick ' : '') + (sel ? 'sel' : '') + (ui.flash && ui.flash.to === p.idx && ui.flash.hand === i ? ' flash' : ''), md === 'plant' ? 'data-act="own" data-i="' + i + '"' : sw ? 'data-act="swapslot" data-k="player" data-p="' + p.idx + '" data-i="' + i + '"' : '');
    } else {
      const sw = md === 'swapA' || md === 'swapB';
      const pick = md === 'hint' || sw;
      const m = ui.assist && test && test(s.card) ? 'match ' : '';
      const fl = ui.flash && ui.flash.to === p.idx && ui.flash.hand === i ? 'flash ' : '';
      const selH = (md === 'hint' && ui.hintSel && ui.hintSel.to === p.idx && ui.hintSel.hand === i) || (sw && isSwapSel(p.idx, i)) ? 'sel ' : '';
      inner = card(s.card, m + fl + selH + (pick ? 'pick' : ''), md === 'hint' ? 'data-act="their" data-p="' + p.idx + '" data-i="' + i + '"' : sw ? 'data-act="swapslot" data-k="player" data-p="' + p.idx + '" data-i="' + i + '"' : '');
    }
    return '<div class="slot">' + inner + known(s.known) + '</div>';
  }).join('') || '<span class="mono" style="color:var(--muted)">Out of cards</span>';
  return '<div class="seat ' + (p.human ? 'me ' : '') + (turn ? 'turn' : '') + '"><h3>' + avatar(p.idx, 38) + esc(p.name) + (p.human ? ' (you)' : '') +
    (turn ? '<span class="st on">TURN</span>' : '') + '<span class="st ' + (planted ? 'on' : '') + '">' + (planted ? 'PLANTED' : 'NEEDS CARD') + '</span></h3>' +
    '<div class="hand">' + slots + '</div></div>';
}

function controlsHTML() {
  if (G.result) return '';
  const me = G.players[0], md = mode(), cur = G.players[G.turn];
  if (!md) return '<div class="prompt wait"><span>' + esc(cur.name) + ' is thinking…</span></div>';
  const L = A.legal(G);
  const O = A.active(G);
  const b = (act, name, key, sub) => {
    const l = L[key];
    return '<button class="btn" data-act="' + act + '" ' + (l && l.ok ? '' : 'disabled title="' + esc(l ? l.why : '') + '"') + '>' + name + '<small>' + esc(l && !l.ok ? l.why : sub) + '</small></button>';
  };
  const cancel = '<button class="btn sm" data-act="cancel">Cancel</button>';
  switch (md) {
    case 'choose':
      return '<div class="prompt"><span>Your turn, ' + esc(me.name) + '. Choose one action.</span></div><div class="actions">' +
        b('a-plant', 'Play my part', 'plant', 'plant a blind card, then draw') + b('a-guard', 'Guard check', 'guard', 'pass to give a hint') +
        b('a-distract', 'Distract', 'distract', 'discard a planted card') + b('a-riot', 'Riot', 'riot', 'discard 5, then swap') + b('a-pass', 'Pass', 'pass', 'alarm only') + '</div>';
    case 'direction': {
      const seq = (arr) => arr.map((o) => LEVEL[o.sec.level]).join(' \u2192 ');
      return '<div class="prompt"><span>Check the lock levels, then choose which end the crew starts from.</span><div class="hintbtns">' +
        '<button class="btn" data-act="dir" data-v="ltr">Start from the left<small style="display:block;font:500 10px var(--f-mono)">' + seq(G.obstacles) + '</small></button>' +
        '<button class="btn" data-act="dir" data-v="rtl">Start from the right<small style="display:block;font:500 10px var(--f-mono)">' + seq(G.obstacles.slice().reverse()) + '</small></button></div></div>';
    }
    case 'plant': return '<div class="prompt"><span>Pick a card to plant. You cannot look at it, so go by the hints.</span>' + cancel + '</div>';
    case 'distract': return '<div class="prompt"><span>Pick a planted card at the active obstacle to discard.</span>' + cancel + '</div>';
    case 'hint': {
      if (!ui.hintSel) return '<div class="prompt"><span>You passed the guard check. Point at a teammate’s card to give a hint.</span></div>';
      const T = G.players[ui.hintSel.to], sl = T.hand[ui.hintSel.hand], c = sl.card;
      return '<div class="prompt"><span>Tell ' + esc(T.name) + ' about card ' + (ui.hintSel.hand + 1) + ':</span><div class="hintbtns">' +
        '<button class="btn" data-act="hint-dim" data-dim="suit" ' + (sl.known.suit ? 'disabled' : '') + '>Its suit: ' + symHTML(c.suit) + ' ' + A.SUIT_NAME[c.suit] + '</button>' +
        '<button class="btn" data-act="hint-dim" data-dim="rank" ' + (sl.known.rank ? 'disabled' : '') + '>Its rank: ' + A.RANK_WORD[c.rank - 1] + '</button></div></div>';
    }
    case 'patrol': return '<div class="prompt"><span>Pick a patrol card from the discard to shuffle back into the patrol deck.</span></div>';
    case 'swapA': return '<div class="prompt"><span>Riot! Swap any two cards. Pick the first: a card in any hand (yours or a teammate\u2019s) or in the discard pile.</span></div>';
    case 'swapB': return '<div class="prompt"><span>Now pick the second card to swap with it. At least one must be from a hand.</span><button class="btn sm" data-act="swapreset">Change first card</button></div>';
    case 'post': {
      const can = A.allPlanted(G);
      return '<div class="prompt"><span>' + (can ? 'Everyone has planted a card. Break through now?' : 'Action done.') + '</span><div class="hintbtns">' +
        (can ? '<button class="btn primary" data-act="breakthrough">Breakthrough</button>' : '') + '<button class="btn" data-act="end">End turn</button></div></div>';
    }
  }
  return '';
}

function logHTML() {
  return '<aside><section class="panel"><h2>Log</h2><div class="log" id="log">' + G.log.map((l) => '<div class="' + (l.p === 0 ? 'me' : l.p == null ? 'sys' : '') + '">' + esc(l.text) + '</div>').join('') + '</div></section></aside>';
}

function helpHTML() {
  return '<div class="overlay"><div class="dialog help" role="dialog" aria-label="How to play">' +
    '<div class="hero"><h2>How to <span class="tag">Escape!</span></h2><p>A cooperative card deduction game for 2 to 4 inmates.</p></div>' +
    '<div class="box"><h3>The goal</h3><p>You and your crew are stuck in Ace-Catraz. Clear every obstacle in the escape plan together and you win. Set off the alarm even once and everyone loses.</p>' +
    '<p><b>The twist:</b> you can see your crewmates’ cards, but never your own. Your crew has to tell you what you are holding, and you have to remember it.</p></div>' +
    '<div class="box"><h3>The table</h3><ul>' +
    '<li><b>Escape plan:</b> a row of obstacle cards (7 for 2 players, 5 for 3, 3 for 4). Each one says which cards <i>match</i> it, such as “RED” or “ACE OR JACK”. Only the active obstacle and the next one are face up.</li>' +
    '<li><b>Flashlight deck:</b> a standard 52-card deck, with the Alarm Sounds card at the very bottom. Everyone starts with 5 cards.</li>' +
    '<li><b>Patrol deck:</b> guard cards used for guard checks. It shows how tough the next check will be (relaxed, careful or extreme caution).</li>' +
    '<li><b>Lock levels:</b> easy, medium and hard. Hard obstacles are shuffled in among the others, and the rest of the hard cards go into the patrol deck.</li></ul>' +
    '<p>Once the lock levels are visible, the crew picks an escape direction: left to right or right to left. That decides which obstacle comes first, so you can start with the easy ones or tackle the hard ones early.</p></div>' +
    '<div class="box"><h3>On your turn</h3><p>Do <b>one</b> of the actions below, then optionally try a Breakthrough.</p><ul>' +
    '<li><b>Play my part:</b> pick one of your cards without looking at it and plant it face down on a free corner of the active obstacle. Then draw a replacement. Each player may plant only one card per obstacle.</li>' +
    '<li><b>Guard check:</b> flip the top patrol card and the top flashlight card. If the flashlight card does <b>not</b> match what the patrol card says to avoid, you slip past and must give a hint: point at a teammate’s card and say either its suit or its rank. If it does match, you are spotted: stay silent and your turn ends. Both cards are discarded.</li>' +
    '<li><b>Distract:</b> discard any one planted card from the active obstacle, then shuffle one patrol card from the discard back into the patrol deck. Use it when a planted card is known to be wrong.</li>' +
    '<li><b>Riot:</b> discard 5 cards from the flashlight deck (you need at least 5 left), then swap any two cards: your own, a teammate’s, or one from the discard pile. At least one has to come from a hand.</li>' +
    '<li><b>Pass:</b> only when the Alarm Sounds card has been revealed (the deck has run out), or when you have no other legal action.</li></ul></div>' +
    '<div class="box"><h3>Breakthrough</h3><p>At the end of your turn, if <b>every</b> player has exactly one card planted on the active obstacle, you may try a Breakthrough. All planted cards are revealed.</p><ul>' +
    '<li>If <b>all</b> of them match the obstacle, you clear it. The next obstacle becomes active and another one is revealed.</li>' +
    '<li>If even <b>one</b> card doesn’t match, the alarm trips and the crew loses immediately.</li></ul>' +
    '<p>Nobody may look at a planted card again, so remember what each player put down. Anyone can see the cards other players planted, because they watched them being chosen.</p></div>' +
    '<div class="box"><h3>Winning and losing</h3><ul>' +
    '<li><b>Win:</b> every obstacle in the plan is cleared.</li>' +
    '<li><b>Lose:</b> a Breakthrough fails, or all players run out of cards with obstacles still left.</li>' +
    '<li>Decks are never reshuffled. When the flashlight deck runs out the Alarm Sounds card is revealed and drawing is locked, so hands shrink as cards are planted.</li></ul></div>' +
    '<div class="box"><h3>Tips</h3><ul>' +
    '<li>Hints are your lifeline. Each tag under a card shows what that player knows about their own card: a suit, a rank, or both. Once both are known, it reads “is 7♥”.</li>' +
    '<li>Planting a card you aren’t sure about can be a smart way to cycle your hand, because a teammate can Distract it if it’s wrong. The catch is that you shouldn’t trigger the Breakthrough yourself on a card you can’t verify.</li>' +
    '<li>It only takes one player who is certain of their own planted card to safely trigger the Breakthrough, as everyone else’s planted cards are known from memory.</li>' +
    '<li>Rank order: A is 1, J is 11, Q is 12 and K is 13. “Odd” includes A, J and K; “Low” is A to 6; “High” is 7 to K.</li></ul></div>' +
    '<div class="box"><h3>Playing this version</h3><ul>' +
    '<li>You are <b>Ace</b>. The CPU inmates reason from exactly the information a human at the table would have.</li>' +
    '<li>When a CPU plants a card, a pop-up shows you which one so you can remember it. Dismiss it to continue.</li>' +
    '<li>The “Outline cards that match the active obstacle” checkbox is a training aid that highlights matching cards in your crew’s hands.</li>' +
    '<li>Your own cards are always face down on screen, just like holding them outward at a real table.</li></ul>' +
    '<button class="btn primary" data-act="closehelp">Got it, back to the game</button></div></div></div>';
}

function dialogHTML() {
  if (ui.help) return helpHTML();
  if (ui.dialog === 'setup') {
    const segN = [2, 3, 4].map((n) => '<button data-act="setn" data-v="' + n + '" aria-pressed="' + (ui.n === n) + '">' + n + ' players</button>').join('');
    const obs = { 2: 7, 3: 5, 4: 3 }[ui.n] + (ui.extra ? 1 : 0);
    const segS = [['Fast', 350], ['Normal', 800], ['Slow', 1500]].map((d) => '<button data-act="setspeed" data-v="' + d[1] + '" aria-pressed="' + (ui.speed === d[1]) + '">' + d[0] + '</button>').join('');
    const fan = [[1, 'S'], [12, 'H'], [1, 'D'], [11, 'C'], [13, 'S']].map((c, k) => '<div class="fc" style="transform:rotate(' + (k - 2) * 9 + 'deg) translateY(' + Math.abs(k - 2) * 4 + 'px)">' + card({ rank: c[0], suit: c[1] }, '', 'tabindex="-1"') + '</div>').join('');
    return '<div class="overlay"><div class="dialog">' +
      '<div class="hero"><h2>Escape from <span class="tag">Ace-catraz!</span></h2><div class="fan">' + fan + '</div>' +
      '<div class="crew">' + [0, 1, 2, 3].map((k) => avatar(k, 44)).join('') + '</div>' +
      '<p>You are Ace. You can see every crewmate’s cards but never your own.</p><p class="demobadge">Playable demo · Feedback: Andy Serwatuk, games@serwatuk.ca</p></div>' +
      '<div class="box"><div class="field"><b>Crew size</b><div class="seg">' + segN + '</div><p class="note">' + obs + ' obstacles, ' + (ui.n - 1) + ' extra HARD card' + (ui.n > 2 ? 's' : '') + ' shuffled in</p></div>' +
      '<label class="check"><input type="checkbox" data-act="extra" ' + (ui.extra ? 'checked' : '') + '> Add one obstacle (harder, per the rules tip)</label>' +
      '<div class="field"><b>CPU speed</b><div class="seg">' + segS + '</div></div>' +
      '<button class="btn primary" data-act="start">Start the escape</button><button class="btn" data-act="help">How to play</button></div></div></div>';
  }
  if (ui.notice) {
    const n = ui.notice;
    return '<div class="overlay"><div class="dialog notice"><div class="box"><div class="who">' + avatar(n.idx || 0, 56) + '<h2>' + esc(n.name) + ' <span>planted</span> this card</h2></div>' +
      '<div class="xlwrap">' + card(n.card, 'xl') + '</div>' +
      '<p>Placed face-down at the active obstacle (' + esc(n.obs.name) + ': ' + esc(n.obs.text.toLowerCase()) + '). Once it is down, nobody can look at it again.</p>' +
      '<button class="btn primary" data-act="ack">Got it</button></div></div></div>';
  }
  if (G && G.result && !ui.endSeen) {
    const w = G.result.won;
    const done = Math.min(G.cur, G.obstacles.length);
    return '<div class="overlay"><div class="dialog ' + (w ? 'win' : 'lose') + '"><div class="box"><h2>' + (w ? 'Freedom!' : 'Back to your cells') + '</h2><p>' + esc(G.result.reason) + '</p>' +
      '<p class="note">Obstacles cleared ' + done + '/' + G.obstacles.length + ' · guard checks ' + G.stats.guards + ' (' + G.stats.guardPass + ' passed) · hints ' + G.stats.hints + ' · riots ' + G.stats.riots + ' · distractions ' + G.stats.distracts + '</p>' +
      '<div class="actions"><button class="btn primary" data-act="again">Play again</button><button class="btn" data-act="newgame">Change setup</button><button class="btn" data-act="closeend">Look at the board</button></div></div></div></div>';
  }
  return '';
}

const MAIL = 'games@serwatuk.ca';
function footHTML() {
  return '<footer class="site"><span class="demo">Demo</span><span>A playable demo of a cooperative card game in development. Feedback and playtest notes are very welcome: Andy Serwatuk, <a href="mailto:' + MAIL + '?subject=Escape%20from%20Ace-catraz%20feedback">' + MAIL + '</a></span></footer>';
}

function render() {
  const scroll = document.getElementById('log');
  const atBottom = !scroll || scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 30;
  if (!G) { app.innerHTML = headerHTML() + footHTML() + dialogHTML(); return; }
  const cpus = G.players.filter((p) => !p.human), me = G.players.filter((p) => p.human);
  app.innerHTML = headerHTML() + '<div class="wrap"><div class="main">' + planHTML() + tableHTML() + trayHTML() +
    '<section class="panel"><h2>Crew <small>each tag shows what that player knows about their own card</small></h2><div class="seats">' + cpus.map(seatHTML).join('') + '</div></section>' +
    '<section class="panel"><h2>Your hand</h2><div class="seats">' + me.map(seatHTML).join('') + '</div>' + controlsHTML() + '</section></div>' + logHTML() + '</div>' + footHTML() + dialogHTML();
  const lg = document.getElementById('log');
  if (lg && atBottom) lg.scrollTop = lg.scrollHeight;
  const ack = document.querySelector('[data-act=ack]');
  if (ack) ack.focus();
}

function doApply(a) {
  const O = A.active(G);
  let notice = null;
  if (a.type === 'plant') {
    const pl = G.players[G.turn];
    if (!pl.human && pl.hand[a.hand]) notice = { name: pl.name, card: pl.hand[a.hand].card, obs: O.sec, idx: pl.idx };
  }
  const before = a.type === 'breakthrough' && O ? O.planted.map((r) => ({ player: r.player, card: r.card })) : null;
  const r = A.apply(G, a);
  if (!r.ok) { console.warn(a, r.why); return r; }
  if (notice) ui.notice = notice;
  ui.flash = a.type === 'hint' ? { to: a.to, hand: a.hand } : null;
  if (before) ui.reveal = { ok: G.lastBreak.ok, items: before };
  ui.sel = null; ui.hintSel = null; if (a.type === 'riotSwap') ui.swapA = null;
  return r;
}

function schedule() {
  clearTimeout(timer);
  if (!G || G.result || ui.dialog || ui.notice || ui.help) return;
  const p = G.players[G.turn];
  if (p.human) {
    if (G.phase === 'post' && !A.allPlanted(G)) timer = setTimeout(() => { doApply({ type: 'end' }); render(); schedule(); }, 1100);
    return;
  }
  timer = setTimeout(() => {
    const a = CPU.decide(G);
    if (!a) return;
    doApply(a); render(); schedule();
  }, ui.speed);
}
function go(a) { const r = doApply(a); render(); schedule(); return r; }

function startGame() {
  const human = [true, false, false, false];
  G = A.newGame({ n: ui.n, extra: ui.extra, human });
  ui.dialog = null; ui.notice = null; ui.endSeen = false; ui.sel = null; ui.swapA = null; ui.hintSel = null; ui.reveal = null; ui.flash = null; ui.tray = false;
  save(); render(); schedule();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const d = el.dataset, md = mode();
  switch (d.act) {
    case 'setn': ui.n = +d.v; render(); return;
    case 'dir': go({ type: 'direction', dir: d.v }); return;
    case 'setspeed': ui.speed = +d.v; save(); render(); return;
    case 'extra': ui.extra = el.checked; render(); return;
    case 'assist': ui.assist = el.checked; save(); render(); return;
    case 'start': case 'again': startGame(); return;
    case 'newgame': clearTimeout(timer); ui.dialog = 'setup'; render(); return;
    case 'help': ui.help = true; render(); return;
    case 'closehelp': ui.help = false; render(); schedule(); return;
    case 'ack': ui.notice = null; render(); schedule(); return;
    case 'closeend': ui.endSeen = true; render(); return;
    case 'tray': ui.tray = !ui.tray; render(); return;
    case 'cancel': ui.sel = null; render(); return;
    case 'a-plant': ui.sel = 'plant'; render(); return;
    case 'a-distract': ui.sel = 'distract'; render(); return;
    case 'a-guard': go({ type: 'guard' }); return;
    case 'a-riot': go({ type: 'riot' }); return;
    case 'a-pass': go({ type: 'pass' }); return;
    case 'breakthrough': go({ type: 'breakthrough' }); return;
    case 'end': go({ type: 'end' }); return;
    case 'own': if (md === 'plant') go({ type: 'plant', hand: +d.i }); return;
    case 'swapreset': ui.swapA = null; render(); return;
    case 'swapslot': {
      if (md !== 'swapA' && md !== 'swapB') return;
      const l = d.k === 'discard' ? { kind: 'discard', index: +d.i } : { kind: 'player', player: +d.p, hand: +d.i };
      const a = ui.swapA;
      if (!a) { ui.swapA = l; render(); return; }
      const same = a.kind === l.kind && (l.kind === 'discard' ? a.index === l.index : a.player === l.player && a.hand === l.hand);
      if (same) { ui.swapA = null; render(); return; }
      if (a.kind === 'discard' && l.kind === 'discard') return;
      go({ type: 'riotSwap', a, b: l });
      return;
    }
    case 'their':
      if (md === 'hint') { ui.hintSel = { to: +d.p, hand: +d.i }; render(); }
      return;
    case 'hint-dim': if (ui.hintSel) go({ type: 'hint', to: ui.hintSel.to, hand: ui.hintSel.hand, dim: d.dim }); return;
    case 'distract-pick': if (md === 'distract') go({ type: 'distract', player: +d.p }); return;
    case 'patrol-pick': if (md === 'patrol') go({ type: 'distractPatrol', index: +d.i }); return;
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pat[data-act]')) { e.preventDefault(); e.target.click(); }
});

render();
})();
