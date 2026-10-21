(function () {
'use strict';
const A = window.Ace, CPU = window.AceCPU;
const app = document.getElementById('app');
let G = null, timer = null;
const ui = { n: 2, extra: false, speed: 800, assist: false, dialog: 'setup', endSeen: false, sel: null, swapA: null, hintSel: null, reveal: null, flash: null, tray: false, notice: null, help: false, summary: null, options: false, logOpen: false, summaries: true, plantPopup: true, showNot: false, cardsOpen: false, cardSide: 'plan', playMode: 'cpu', hot: false, handoff: null, pendingSummary: null, presenter: false, tour: null, lastEnd: {}, startLog: 0, sumOff: false, keepPlant: true, turnStart: 0 };
try { const s = JSON.parse(localStorage.getItem('ace.settings') || 'null'); if (s) for (const k of ['n', 'extra', 'speed', 'assist', 'summaries', 'plantPopup', 'showNot', 'playMode']) if (k in s) ui[k] = s[k]; } catch (e) {}
const save = () => { try { localStorage.setItem('ace.settings', JSON.stringify({ n: ui.n, extra: ui.extra, speed: ui.speed, assist: ui.assist, summaries: ui.summaries, plantPopup: ui.plantPopup, showNot: ui.showNot, playMode: ui.playMode })); } catch (e) {} };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const redSuit = (s) => s === 'H' || s === 'D';
const symHTML = (s) => '<span class="' + (redSuit(s) ? 'rd' : '') + '">' + A.SYM[s] + '</span>';
const LEVEL = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };

function card(c, cls, attrs) {
  return '<button class="pc ' + (redSuit(c.suit) ? 'red ' : '') + (cls || '') + '" ' + (attrs || '') + ' aria-label="' + esc(A.label(c)) + '">' +
    '<span class="r">' + A.RANKS[c.rank - 1] + '</span><span class="s">' + A.SYM[c.suit] + '</span><span class="big">' + A.SYM[c.suit] + '</span></button>';
}
function back(cls, attrs) { return '<button class="pc back ' + (cls || '') + '" ' + (attrs || '') + ' aria-label="Face-down card"></button>'; }
const SUITWORD = { HEART: 'H', DIAMOND: 'D', CLUB: 'C', SPADE: 'S' };
function notTag(not) {
  return (not || []).map((key) => {
    const nm = A.SEC.find((x) => x.key === key).name, st = SUITWORD[String(nm).toUpperCase()];
    return '<span class="known not" title="Cannot be ' + esc(nm) + '"><em>✕</em>' + (st ? symHTML(st) : esc(nm)) + '</span>';
  }).join('');
}
function known(k, not) {
  const nt = ui.showNot ? notTag(not) : '';
  if (A.isExact(k)) return '<span class="known exact" title="Known exactly"><b>' + A.RANKS[k.rank - 1] + '</b>' + symHTML(k.suit) + '</span>';
  const parts = [];
  if (k.suit) parts.push('<span class="ks" title="Suit is known">' + symHTML(k.suit) + '</span>');
  if (k.rank) parts.push('<b class="kr" title="Rank is known">' + A.RANKS[k.rank - 1] + '</b>');
  if (parts.length) return '<span class="known has">' + parts.join('') + '</span>' + nt;
  return nt || '<span class="known none" title="No hints yet">?</span>';
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

const VIEW = () => (ui.hot && G ? G.turn : 0);
const isMe = (p) => p.idx === VIEW();
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
  const bar = '<header class="bar"><h1>Escape from <span class="tag">Ace-catraz!</span><span class="demo" data-act="badge">Demo</span></h1><span class="barbtns">' + (G ? '<button class="btn sm" data-act="logopen">Log</button> ' : '') + '<button class="btn sm" data-act="cards">Cards</button> <button class="btn sm" data-act="help">How to play</button> ' + (G ? '<button class="btn sm" data-act="options">Options</button> ' : '') + '<button class="btn sm" data-act="newgame">New game</button></span></header>';
  if (!G) return bar;
  return bar + '<div class="sub"><div class="chips">' + chips + '</div></div>';
}

function planHTML() {
  const md = mode();
  const mini = (O, i, st) => {
    const lvl = O.faceUp ? LEVEL[O.sec.level] : LEVEL[O.sec.level];
    if (st === 'done') return '<div class="mo done" title="Cleared"><b>' + esc(O.sec.name) + '</b><span>✓</span></div>';
    return '<div class="mo ' + (O.faceUp ? 'up' : 'down ' + O.sec.level) + '"><i>' + (i + 1) + '</i><b>' + (O.faceUp ? esc(O.sec.name) : lvl) + '</b><span>' + (O.faceUp ? lvl : 'locked') + '</span></div>';
  };
  const big = (O, i, tag, active) => '<div class="obs ' + (active ? 'active' : '') + '"><span class="tagline">' + (i + 1) + ' · ' + tag + '</span>' +
    (O.faceUp ? secUp(O.sec) : '<div class="sec down ' + O.sec.level + '"><small>LOCK SECURITY LEVEL</small><b>' + LEVEL[O.sec.level] + '</b></div>') + '</div>';
  const cur = G.cur, n = G.obstacles.length;
  if (G.phase === 'direction') {
    const tiles = G.obstacles.map((O) => '<div class="mo ' + (O.faceUp ? 'up' : 'down ' + O.sec.level) + ' path"><b>' + (O.faceUp ? esc(O.sec.name) : LEVEL[O.sec.level]) + '</b><span>' + (O.faceUp ? LEVEL[O.sec.level] : 'locked') + '</span></div>').join('<span class="arrow">\u203a</span>');
    return '<section class="panel"><h2>Escape plan <small>direction not chosen yet</small></h2><div class="pathrow">' + tiles + '</div><div class="pathends"><span>\u2190 left end</span><span>right end \u2192</span></div></section>';
  }
  let html = '<div class="focusrow">';
  if (cur < n) {
    const O = G.obstacles[cur], act = true;
    const cell = (p) => {
      const rec = act && A.plantedBy(O, p.idx);
      const pick = rec && md === 'distract' ? 'pick' : '';
      const card = !act ? '' : rec ? back('mini ' + pick, pick ? 'data-act="distract-pick" data-p="' + p.idx + '"' : '') : '<div class="pc mini ghost"></div>';
      return '<div class="corner ' + (rec ? 'has' : 'empty') + ' c' + p.idx + '" style="--pc:' + AV[p.idx % 4].bg + '">' + card + '<span class="who">' + avatar(p.idx, 20) + esc(p.name) + (isMe(p) ? ' (you)' : '') + '</span></div>';
    };
    html += '<div class="cgrid">' + G.players.map(cell).join('') + '<div class="ccenter">' + big(O, cur, act ? 'Active' : 'First', act).replace('class="obs ', 'class="obs ') + '</div></div>';
    if (cur + 1 < n) html += '<div class="nextwrap">' + big(G.obstacles[cur + 1], cur + 1, G.obstacles[cur + 1].faceUp ? 'Next' : 'Locked', false) + '</div>';
  }
  html += '</div>';
  const doneT = [], lockT = [];
  for (let i = 0; i < n; i++) { if (i < cur) doneT.push(mini(G.obstacles[i], i, 'done')); else if (i >= cur + 2) lockT.push(mini(G.obstacles[i], i, 'locked')); }
  html += '<div class="lowrow"><div class="lowcol left"><div class="restlabel">Cleared (' + doneT.length + ')</div><div class="restrow">' + (doneT.join('') || '<span class="emptynote">none yet</span>') + '</div></div>' +
    '<div class="lowcol right"><div class="restlabel">Still locked (' + lockT.length + ')</div><div class="restrow">' + (lockT.join('') || '<span class="emptynote">none</span>') + '</div></div></div>';
  return '<section class="panel"><h2>Escape plan <small>' + (G.dir === 'ltr' ? 'escaping left to right' : G.dir === 'rtl' ? 'escaping right to left' : 'direction not chosen yet') + '</small></h2>' + html + '</section>';
}

function tableHTML() {
  const alarm = A.alarmVisible(G);
  const PL = { easy: ['EXTREME CAUTION', 'hard to pass', 'caution'], medium: ['MEDIUM', 'medium odds', 'med'], hard: ['RELAXED', 'easy to pass', 'relaxed'] };
  const top = G.patrol[G.patrol.length - 1];
  const lv = top ? PL[top.level] : null;
  const pile = (visual, title, sub, btn) => '<div class="pile">' + (btn ? '<button class="pilebtn" data-act="tray" title="Browse the discard piles">' + visual + '</button>' : visual) + '<b class="pt">' + title + '</b><span>' + sub + '</span></div>';
  const patDraw = pile(top ? '<div class="stack patrol ' + lv[2] + '">GUARD PATROL<b>' + lv[0] + '</b></div>' : '<div class="stack empty">empty</div>', 'Patrol deck', top ? 'next check: ' + lv[1] + '<br>' + G.patrol.length + ' left' : 'empty');
  const pd = G.patrolDiscard[G.patrolDiscard.length - 1];
  const patDisc = pile(pd ? patUp(pd, 'mini tall') : '<div class="stack empty">none</div>', 'Patrol discard', G.patrolDiscard.length + ' card' + (G.patrolDiscard.length === 1 ? '' : 's'), true);
  const fd = G.discard[G.discard.length - 1];
  const flDisc = pile(fd ? card(fd, 'pilec') : '<div class="stack empty">none</div>', 'Flashlight discard', G.discard.length + ' card' + (G.discard.length === 1 ? '' : 's'), true);
  const flDraw = pile(alarm ? '<div class="stack alarm">ALARM<br>SOUNDS</div>' : '<div class="stack flash">' + G.deck.length + '</div>', 'Flashlight deck', alarm ? 'drawing is locked' : G.deck.length + ' left');
  const lg = G.lastGuard;
  let mid = '<div class="vtxt">No guard check yet.</div>';
  if (lg) {
    const who = esc(G.players[lg.by].name);
    mid = '<div class="verdict ' + (lg.pass ? 'pass' : 'fail') + '">' + (lg.pass ? 'Pass \u2713' : 'Fail \u2717') + '</div>' +
      '<div class="vtxt sm">' + (lg.pass ? who + ' may give a hint' : who + ' stays silent') + '</div>';
  }
  return '<section class="panel"><h2>The yard</h2><div class="table">' +
    '<div class="cluster">' + patDraw + patDisc + '</div><div class="mid"><div class="lab">Guard check</div>' + mid + '</div><div class="cluster">' + flDisc + flDraw + '</div></div></section>';
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
    if (isMe(p)) {
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
    return '<div class="slot">' + inner + known(s.known, s.not) + '</div>';
  }).join('') || '<span class="mono" style="color:var(--muted)">Out of cards</span>';
  return '<div class="seat ' + (isMe(p) ? 'me ' : '') + (turn ? 'turn' : '') + '" style="--pc:' + AV[p.idx % 4].bg + '"><h3>' + avatar(p.idx, 38) + esc(p.name) + (isMe(p) ? ' (you)' : '') +
    (turn ? '<span class="st on">TURN</span>' : '') + '<span class="st ' + (planted ? 'on' : '') + '">' + (planted ? 'PLANTED' : 'NEEDS CARD') + '</span></h3>' +
    '<div class="hand">' + slots + '</div></div>';
}

function controlsHTML() {
  if (G.result) return '';
  const me = G.players[VIEW()], md = mode(), cur = G.players[G.turn];
  if (!md) return '<div class="prompt wait"><span>' + esc(cur.name) + ' is thinking…</span></div>';
  const L = A.legal(G);
  const O = A.active(G);
  const TIPS = {
    plant: 'Plant one of your face-down cards on the active obstacle without looking at it, then draw a replacement. Once everyone has planted, the cards are revealed. If even one does not match, the alarm sounds.',
    guard: 'Flip a flashlight card against the top patrol card. If it does NOT match the patrol card you pass, and you must point at a teammate\u2019s card and tell them its suit or its rank. If it matches, you stay silent.',
    distract: 'Discard a planted card you think will not match the obstacle, so that player can plant again. Costs your turn.',
    riot: 'Discard five flashlight cards (needs at least five left), then swap any two cards on the table.',
    pass: 'Do nothing this turn. Only allowed once the Alarm Sounds card is showing, or when you have no other legal action.'
  };
  const b = (act, name, key, sub) => {
    const l = L[key];
    const ok = l && l.ok;
    const tip = TIPS[key] + (ok ? '' : ' \u2014 Unavailable now: ' + (l ? l.why : ''));
    return '<button class="btn tip" data-act="' + act + '" data-tip="' + esc(tip) + '" ' + (ok ? '' : 'disabled') + '>' + name + '<small>' + esc(l && !l.ok ? l.why : sub) + '</small></button>';
  };
  const cancel = '<button class="btn sm" data-act="cancel">Cancel</button>';
  switch (md) {
    case 'choose':
      return '<div class="prompt"><span>Your turn, ' + esc(me.name) + '. Choose one action.</span></div><div class="actions">' +
        b('a-plant', 'Play my part', 'plant', 'plant a blind card, then draw') + b('a-guard', 'Guard check', 'guard', 'pass to give a hint') +
        b('a-distract', 'Distract', 'distract', 'discard a planted card') + b('a-riot', 'Riot', 'riot', 'discard 5, then swap') + b('a-pass', 'Pass', 'pass', 'alarm only') + '</div>';
    case 'direction': return '<div class="prompt"><span>Choose which end the crew starts from.</span></div>';
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
  return '<aside><section class="panel"><h2>Log</h2><div class="log" id="log">' + G.log.map((l) => '<div class="' + (!ui.hot && l.p === 0 ? 'me' : l.p == null ? 'sys' : '') + '">' + esc(l.text) + '</div>').join('') + '</div></section></aside>';
}

function helpHTML() {
  // The rulebook is the same document as the printable PDF, shown page by page in a framed viewer.
  return '<div class="overlay rbover"><div class="rbdlg" role="dialog" aria-label="How to play">' +
    '<div class="rbbar"><b>How to play</b><span class="rbbtns"><a class="btn sm" href="Escape_from_Ace-catraz_Rules.pdf" target="_blank" rel="noopener">Printable PDF</a>' +
    '<button class="btn sm primary" data-act="closehelp">' + (G ? 'Back to the game' : 'Close') + '</button></span></div>' +
    '<iframe class="rbframe" title="Escape from Ace-catraz rules" srcdoc="' + esc(window.RULEBOOK_HTML) + '"></iframe></div></div>';
}

function cardsDialogHTML() {
  const plan = ui.cardSide === 'plan';
  const PL = A.PATROL_LABEL;
  const face = (sec) => plan ? secUp(sec) :
    '<div class="pat full"><span class="pill">GUARD CHECK</span><span class="nm">NOT ' + esc(sec.name) + '</span><div class="dn">DO NOT MATCH: ' + esc(sec.text) + '</div><span class="plv ' + sec.level + '">' + PL[sec.level] + '</span></div>';
  const groups = ['easy', 'medium', 'hard'].map((lv) => '<h3 class="lvh ' + lv + '">' + LEVEL[lv] + ' locks · ' + A.SEC.filter((x) => x.level === lv).length + ' cards</h3><div class="cardgrid">' +
    A.SEC.filter((x) => x.level === lv).map((x) => '<div class="cc ' + (plan ? 'plan' : 'patrol') + '">' + face(x) + '</div>').join('') + '</div>').join('');
  return '<div class="overlay"><div class="dialog cards"><div class="box"><div class="cardshead"><h2 class="dh">All 17 security cards</h2>' +
    '<button class="btn primary" data-act="flipcards">⇄ Flip to ' + (plan ? 'guard patrol side' : 'escape plan side') + '</button></div>' +
    '<p class="sidenote">' + (plan ? '<b>Escape plan side.</b> Face up, a card is an obstacle your crew must break through. Face down, only its lock level shows.' : '<b>Guard patrol side.</b> The top card of the patrol deck. A flashlight card that does NOT match it passes the guard check. The label shows how hard that check is to pass.') + '</p>' +
    groups + '<button class="btn primary" data-act="closecards">Close</button></div></div></div>';
}
function dirDialogHTML() {
  const cards = '<div class="dirrow cardsrow">' + G.obstacles.map((o) => '<div class="dt ' + o.sec.level + '"><small>LOCK</small><b>' + LEVEL[o.sec.level] + '</b></div>').join('') + '</div>';
  const go = (v, title, sub) => '<button class="dirbtn go ' + v + '" data-act="dir" data-v="' + v + '"><span class="dirtitle">' + title + '</span><span class="dline"></span><small>' + sub + '</small></button>';
  return '<div class="overlay"><div class="dialog dirdlg"><div class="box"><h2 class="dh">Choose your escape direction</h2>' +
    '<p>You have checked the lock levels. The cards show the line of obstacles as laid out. Pick which end the crew breaks out from first.</p>' +
    go('ltr', 'Left to right', 'Start at the left card, finish at the right') + cards + go('rtl', 'Right to left', 'Start at the right card, finish at the left') + '</div></div></div>';
}
function logDialogHTML() {
  return '<div class="overlay"><div class="dialog"><div class="box"><h2 class="dh">Game log</h2><div class="log" id="log">' + G.log.map((l) => '<div class="' + (!ui.hot && l.p === 0 ? 'me' : l.p == null ? 'sys' : '') + '">' + esc(l.text) + '</div>').join('') + '</div>' +
    '<button class="btn primary" data-act="closelog">Close</button></div></div></div>';
}
function optionsDialogHTML() {
  const segS = [['Fast', 350], ['Normal', 800], ['Slow', 1500]].map((d) => '<button data-act="setspeed" data-v="' + d[1] + '" aria-pressed="' + (ui.speed === d[1]) + '">' + d[0] + '</button>').join('');
  return '<div class="overlay"><div class="dialog"><div class="box"><h2 class="dh">Options</h2>' +
    '<label class="check"><input type="checkbox" data-act="opt-summaries" ' + (ui.summaries ? 'checked' : '') + '> ' + (ui.hot ? 'Show a recap of everything since your last turn' : 'Show a summary after each CPU turn') + '</label>' +
    (ui.hot ? '' : '<label class="check ' + (ui.summaries ? 'dim' : '') + '"><input type="checkbox" data-act="opt-plant" ' + (ui.plantPopup ? 'checked' : '') + (ui.summaries ? ' disabled' : '') + '> Show the card whenever a CPU plants one' + (ui.summaries ? ' (included in the summary)' : '') + '</label>') +
    '<label class="check"><input type="checkbox" data-act="opt-not" ' + (ui.showNot ? 'checked' : '') + '> Show \u201cnot\u2026\u201d hints under cards (what a player has been ruled out as holding)</label>' +
    '<label class="check"><input type="checkbox" data-act="assist" ' + (ui.assist ? 'checked' : '') + '> Outline cards that match the active obstacle</label>' +
    (ui.hot ? '' : '<div class="field"><b>CPU speed</b><div class="seg">' + segS + '</div></div>') +
    '<button class="btn primary" data-act="closeopt">Done</button></div></div></div>';
}
function summaryDialogHTML() {
  const m = ui.summary;
  return '<div class="overlay"><div class="dialog notice sum"><div class="box"><div class="who">' + avatar(m.idx, 56) + '<h2>' + (m.since ? 'Since your last turn, ' + esc(m.name) : esc(m.name) + '’s turn') + '</h2></div>' +
    (m.card ? '<div class="xlwrap">' + card(m.card, 'xl') + '<p class="note">Planted face-down at ' + esc(m.obs.name) + '. Nobody can look at it again.</p></div>' : '') +
    '<ul class="turnlist">' + m.lines.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
    '<label class="check"><input type="checkbox" data-act="sumoff" ' + (ui.sumOff ? 'checked' : '') + '> Don’t show these ' + (ui.hot ? 'recaps' : 'summaries') + ' anymore</label>' +
    (ui.sumOff && !ui.hot ? '<label class="check sub2"><input type="checkbox" data-act="keepplant" ' + (ui.keepPlant ? 'checked' : '') + '> Still show me the card when a CPU plants one</label>' : '') +
    '<button class="btn primary" data-act="ack">OK</button></div></div></div>';
}

function dialogHTML() {
  if (ui.presenter) return presenterHTML();
  if (ui.help) return helpHTML();
  if (ui.cardsOpen) return cardsDialogHTML();
  if (G && ui.options) return optionsDialogHTML();
  if (G && ui.logOpen) return logDialogHTML();
  if (G && ui.summary) return summaryDialogHTML();
  if (G && !G.result && !ui.dialog && !ui.notice && G.phase === 'direction' && G.players[G.turn].human) return dirDialogHTML();
  if (ui.dialog === 'setup') {
    const segM = [['cpu', 'You vs CPU crew'], ['hot', 'Hotseat (pass and play)']].map((d) => '<button data-act="setmode" data-v="' + d[0] + '" aria-pressed="' + (ui.playMode === d[0]) + '">' + d[1] + '</button>').join('');
    const hotM = ui.playMode === 'hot';
    const segN = [2, 3, 4].map((n) => '<button data-act="setn" data-v="' + n + '" aria-pressed="' + (ui.n === n) + '">' + n + ' players</button>').join('');
    const obs = { 2: 8, 3: 5, 4: 3 }[ui.n] + (ui.extra ? 1 : 0);
    const fan = [[1, 'S'], [12, 'H'], [1, 'D'], [11, 'C'], [13, 'S']].map((c, k) => '<div class="fc" style="transform:rotate(' + (k - 2) * 9 + 'deg) translateY(' + Math.abs(k - 2) * 4 + 'px)">' + card({ rank: c[0], suit: c[1] }, '', 'tabindex="-1"') + '</div>').join('');
    return '<div class="overlay"><div class="dialog">' +
      '<div class="hero"><h2 data-act="badge">Escape from <span class="tag">Ace-catraz!</span></h2><div class="fan">' + fan + '</div>' +
      '<div class="crew">' + [0, 1, 2, 3].map((k) => avatar(k, 44)).join('') + '</div>' +
      '<p>' + (hotM ? 'Pass the device between turns. Everyone sees their crewmates’ cards but never their own.' : 'You are Ace. You can see every crewmate’s cards but never your own.') + '</p><p class="demobadge">Playable demo by Andy Serwatuk · Feedback or publishing inquiries: games@serwatuk.ca</p></div>' +
      '<div class="box"><div class="field"><b>Play mode</b><div class="seg">' + segM + '</div>' + (hotM ? '<p class="note">No CPU players. A cover screen hides every hand between turns.</p>' : '') + '</div><div class="field"><b>Crew size</b><div class="seg">' + segN + '</div><p class="note">' + obs + ' obstacles, ' + (ui.n - 1) + ' extra HARD card' + (ui.n > 2 ? 's' : '') + ' shuffled in</p></div>' +
      '<label class="check"><input type="checkbox" data-act="extra" ' + (ui.extra ? 'checked' : '') + '> Add one obstacle (harder, per the rules tip)</label>' +
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
  return '<footer class="site"><span class="demo">Demo</span><span>A playable demo of a cooperative card game by designer Andy Serwatuk. Send feedback, or get in touch about publishing opportunities: <a href="mailto:' + MAIL + '?subject=Escape%20from%20Ace-catraz">' + MAIL + '</a></span></footer>';
}

function coverHTML() {
  const h = ui.handoff, to = G.players[h.to];
  return '<div class="cover"><div class="coverbox">' + avatar(h.to, 96) + '<h2>Pass the device to <span>' + esc(to.name) + '</span></h2>' +
    '<p>Everyone else, look away. Press Ready when you are ' + esc(to.name) + ' and it is your turn.</p>' +
    '<button class="btn primary big" data-act="ready">Ready</button></div></div>';
}

function render() {
  const scroll = document.getElementById('log');
  const atBottom = !scroll || scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 30;
  if (!G) { app.innerHTML = headerHTML() + footHTML() + dialogHTML(); return; }
  tourAdvance();
  if (ui.hot && ui.handoff && !G.result) { app.innerHTML = headerHTML() + coverHTML() + footHTML() + dialogHTML(); return; }
  const view = VIEW();
  const crewSection = ui.hot
    ? '<section class="panel"><h2>The crew <small>everyone else\u2019s cards, with what each of them knows</small></h2><div class="seats crewgrid' + (G.n === 2 ? ' one' : '') + '">' + G.players.filter((p) => p.idx !== view).map(seatHTML).join('') + '</div></section>' +
      '<section class="panel handPanel"><h2>Your hand <small>' + esc(G.players[view].name) + ', you cannot see these cards</small></h2><div class="seats crewgrid one">' + seatHTML(G.players[view]) + '</div></section>'
    : '<section class="panel"><h2>Crew <small>each tag shows what that player knows about their own card</small></h2><div class="seats crewgrid">' + G.players.map(seatHTML).join('') + '</div></section>';
  app.innerHTML = headerHTML() + '<div class="wrap"><div class="main">' + planHTML() + tableHTML() + trayHTML() +
    '<section class="panel actionsPanel">' + controlsHTML() + '</section>' +
    crewSection + '</div></div>' + footHTML() + (ui.tour ? '<div style="height:190px"></div>' : '') + dialogHTML() + tourHTML();
  const lg = document.getElementById('log');
  if (lg && atBottom) lg.scrollTop = lg.scrollHeight;
  tourAfterRender();
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
  const actor = G.turn, actorP = G.players[actor];
  const before = a.type === 'breakthrough' && O ? O.planted.map((r) => ({ player: r.player, card: r.card })) : null;
  const r = A.apply(G, a);
  if (!r.ok) { console.warn(a, r.why); return r; }
  if (ui.tour && actorP.human) ui.tour.seen[a.type] = true;
  if (notice) { if (ui.summaries) ui.turnPlant = notice; else if (ui.plantPopup) ui.notice = notice; }
  if (G.turn !== actor || G.result) {
    if (!actorP.human && ui.summaries) {
      ui.summary = { name: actorP.name, idx: actor, lines: G.log.slice(ui.turnStart).map((l) => l.text), card: ui.turnPlant ? ui.turnPlant.card : null, obs: ui.turnPlant ? ui.turnPlant.obs : null };
    }
    if (ui.hot && !G.result) {
      ui.handoff = { from: actor, to: G.turn };
      ui.lastEnd[actor] = G.log.length;
      const since = ui.lastEnd[G.turn] != null ? ui.lastEnd[G.turn] : ui.startLog;
      ui.pendingSummary = ui.summaries ? { name: G.players[G.turn].name, idx: G.turn, since: true, lines: G.log.slice(since).map((l) => l.text), card: null, obs: null } : null;
    }
    ui.turnStart = G.log.length; ui.turnPlant = null;
  }
  ui.flash = a.type === 'hint' ? { to: a.to, hand: a.hand } : null;
  if (before) ui.reveal = { ok: G.lastBreak.ok, items: before };
  ui.sel = null; ui.hintSel = null; if (a.type === 'riotSwap') ui.swapA = null;
  return r;
}

function schedule() {
  clearTimeout(timer);
  if (!G || G.result || ui.dialog || ui.notice || ui.help || ui.summary || ui.options || ui.logOpen || ui.cardsOpen || ui.presenter || ui.handoff) return;
  const p = G.players[G.turn];
  if (p.human) {
    if (!ui.hot && G.phase === 'post' && !A.allPlanted(G)) timer = setTimeout(() => { doApply({ type: 'end' }); render(); schedule(); }, 1100);
    return;
  }
  timer = setTimeout(() => {
    const a = CPU.decide(G);
    if (!a) return;
    doApply(a); render(); schedule();
  }, ui.speed);
}
function go(a) { const r = doApply(a); render(); schedule(); return r; }

/* ---------- Presenter tools (hidden): pitch position and guided tour ---------- */
function presenterHTML() {
  return '<div class="overlay"><div class="dialog notice"><div class="box"><h2>Presenter tools</h2>' +
    '<p>Hidden from the public view. Tap the “Demo” badge (or the title on the start screen) five times, or add <b>?demo</b> or <b>?tour</b> to the address.</p>' +
    '<div class="actions"><button class="btn primary" data-act="loaddemo">Load pitch position<small>4 players, mid-game, your move</small></button>' +
    '<button class="btn" data-act="starttour">Start guided tour<small>2 players, fresh game, coach marks</small></button></div>' +
    '<button class="btn sm" data-act="presclose">Close</button></div></div></div>';
}
function loadDemo() {
  const D = window.DEMO; if (!D) return;
  clearTimeout(timer);
  ui.presenter = false; ui.tour = null; ui.hot = false; ui.handoff = null; ui.pendingSummary = null; ui.lastEnd = {};
  G = A.newGame({ n: D.n, seed: D.seed, human: [true, false, false, false] });
  for (const a of D.acts) A.apply(G, a);
  ui.n = D.n; ui.dialog = null; ui.notice = null; ui.summary = null; ui.turnPlant = null; ui.turnStart = G.log.length; ui.startLog = 0;
  ui.sumOff = false; ui.keepPlant = true; ui.endSeen = false; ui.sel = null; ui.swapA = null; ui.hintSel = null; ui.reveal = null; ui.flash = null; ui.tray = false;
  ui.logOpen = false; ui.help = false; ui.cardsOpen = false; ui.options = false;
  render(); schedule(); window.scrollTo(0, 0);
}
const TOUR = [
  { t: 'Welcome to the escape. You are Ace, one of the inmates. You can see every crewmate’s cards but never your own. Let me show you the table.' },
  { t: 'First, choose which end of the plan the crew starts from. Either way works; it just sets the order of the obstacles.', when: () => G.phase !== 'direction' },
  { sel: '.main > section.panel:nth-of-type(1)', t: 'This is the escape plan. The big card is the active obstacle: everyone must plant a matching card there. The next one is on deck, cleared ones sit lower left, locked ones lower right.' },
  { sel: '.main > section.panel:nth-of-type(2)', t: 'The yard holds the flashlight deck, the patrol deck and the guard-check area. Flashlight cards are what you draw and plant.' },
  { sel: '.main > section.panel:last-child', t: 'The crew. Your teammates’ cards are face-up to you; yours are hidden. The small tags show what each player has been told about their own card.' },
  { sel: '.actionsPanel', t: 'Your turn. Try “Play my part”: tap it, then tap one of your own cards to plant it blind. Hover over any action for a tooltip.', when: () => ui.tour.seen.plant },
  { sel: '.actionsPanel', t: 'Planted face-down. Now the CPU crew take their turns, and a short recap appears after each. Tap OK to carry on.', when: () => ui.tour.seen.plant && G.turn === 0 && G.phase === 'action' && !ui.summary && !ui.notice },
  { sel: '.actionsPanel', t: 'Try a Guard check. Flip a flashlight card: if it does not match the patrol card you pass and get to give a hint; if it matches, you stay silent.', when: () => ui.tour.seen.guard },
  { sel: '.crewgrid', t: 'You passed! Point at a teammate’s card and tell them its suit or rank. Hints are the only way anyone learns what they are holding. Silence teaches things too.', when: () => ui.tour.seen.hint || G.phase !== 'hint' },
  { sel: '.barbtns', t: 'Log replays everything, Cards shows every obstacle and patrol card (with a flip), How to play opens the rulebook, and Options has the CPU speed.' },
  { t: 'That is the whole loop: plant, guard check, hint. Clear every obstacle before the alarm ends the escape. Good luck!', last: true },
];
function startTour() {
  clearTimeout(timer);
  ui.presenter = false; ui.n = 2; ui.playMode = 'cpu'; ui.extra = false;
  startGame();
  ui.tour = { i: 0, seen: {}, shown: -1 };
  render();
}
function tourAdvance() {
  const T = ui.tour; if (!T) return;
  let guard = 0;
  while (T.i < TOUR.length - 1 && TOUR[T.i].when && TOUR[T.i].when() && guard++ < 12) T.i++;
}
function tourHTML() {
  const T = ui.tour; if (!T || !G) return '';
  const st = TOUR[T.i];
  return '<div class="tour"><div class="tourstep">Tour · step ' + (T.i + 1) + ' of ' + TOUR.length + '</div><p>' + esc(st.t) + '</p><div class="tourrow">' +
    '<button class="btn sm" data-act="tourquit">' + (st.last ? 'Close' : 'End tour') + '</button>' +
    (st.last ? '' : '<button class="btn sm primary" data-act="tournext">' + (st.when ? 'Skip step' : 'Next') + '</button>') + '</div></div>';
}
function tourAfterRender() {
  document.querySelectorAll('.tourhl').forEach((e) => e.classList.remove('tourhl'));
  const T = ui.tour; if (!T) return;
  const st = TOUR[T.i];
  if (!st.sel) return;
  const el = document.querySelector(st.sel);
  if (!el) return;
  el.classList.add('tourhl');
  if (T.shown !== T.i) { T.shown = T.i; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
}
let badgeTaps = [];

function startGame() {
  ui.hot = ui.playMode === 'hot'; ui.handoff = null; ui.pendingSummary = null; ui.lastEnd = {};
  const human = ui.hot ? [true, true, true, true] : [true, false, false, false];
  G = A.newGame({ n: ui.n, extra: ui.extra, human });
  ui.dialog = null; ui.notice = null; ui.summary = null; ui.turnPlant = null; ui.turnStart = G.log.length; ui.startLog = G.log.length; ui.sumOff = false; ui.keepPlant = true; ui.endSeen = false; ui.sel = null; ui.swapA = null; ui.hintSel = null; ui.reveal = null; ui.flash = null; ui.tray = false;
  save(); render(); schedule();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const d = el.dataset, md = mode();
  switch (d.act) {
    case 'badge': { const now = Date.now(); badgeTaps = badgeTaps.filter((t) => now - t < 3000); badgeTaps.push(now); if (badgeTaps.length >= 5) { badgeTaps = []; ui.presenter = true; render(); } return; }
    case 'presclose': ui.presenter = false; render(); schedule(); return;
    case 'loaddemo': loadDemo(); return;
    case 'starttour': startTour(); return;
    case 'tournext': if (ui.tour) { ui.tour.i = Math.min(TOUR.length - 1, ui.tour.i + 1); render(); } return;
    case 'tourquit': ui.tour = null; render(); return;
    case 'setmode': ui.playMode = d.v; save(); render(); return;
    case 'ready': ui.handoff = null; ui.summary = ui.pendingSummary; ui.pendingSummary = null; render(); schedule(); return;
    case 'setn': ui.n = +d.v; render(); return;
    case 'dir': go({ type: 'direction', dir: d.v }); return;
    case 'setspeed': ui.speed = +d.v; save(); render(); return;
    case 'extra': ui.extra = el.checked; render(); return;
    case 'assist': ui.assist = el.checked; save(); render(); return;
    case 'start': case 'again': startGame(); return;
    case 'newgame': clearTimeout(timer); ui.dialog = 'setup'; render(); return;
    case 'cards': ui.cardsOpen = true; render(); return;
    case 'closecards': ui.cardsOpen = false; render(); schedule(); return;
    case 'flipcards': ui.cardSide = ui.cardSide === 'plan' ? 'patrol' : 'plan'; render(); return;
    case 'help': ui.help = true; render(); return;
    case 'closehelp': ui.help = false; render(); schedule(); return;
    case 'ack':
      if (ui.summary && ui.sumOff) { ui.summaries = false; ui.plantPopup = ui.keepPlant; save(); }
      ui.notice = null; ui.summary = null; ui.sumOff = false; ui.keepPlant = true; render(); schedule(); return;
    case 'sumoff': ui.sumOff = el.checked; render(); return;
    case 'keepplant': ui.keepPlant = el.checked; render(); return;
    case 'logopen': ui.logOpen = true; render(); return;
    case 'closelog': ui.logOpen = false; render(); schedule(); return;
    case 'options': ui.options = true; render(); return;
    case 'closeopt': ui.options = false; render(); schedule(); return;
    case 'opt-summaries': ui.summaries = el.checked; save(); render(); return;
    case 'opt-not': ui.showNot = el.checked; save(); render(); return;
    case 'opt-plant': ui.plantPopup = el.checked; save(); render(); return;
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

try { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
const q = (location.search + location.hash).toLowerCase();
if (/demo/.test(q) && window.DEMO) loadDemo();
else if (/tour/.test(q)) startTour();
else render();
})();
