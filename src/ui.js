(function () {
'use strict';
const A = window.Ace, CPU = window.AceCPU;
const app = document.getElementById('app');
let G = null, timer = null;
const ui = { n: 2, extra: false, speed: 800, assist: false, dialog: 'setup', endSeen: false, sel: null, swapA: null, hintSel: null, reveal: null, flash: null, tray: false, toast: '' };
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

function isSwapSel(pl, i) { const a = ui.swapA; return !!a && a.kind === 'player' && a.player === pl && a.hand === i; }
function mode() {
  if (!G || G.result || ui.dialog) return null;
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
  return '<header class="top"><h1>Escape from <span>Ace-catraz</span></h1><div class="chips">' + chips + '</div>' +
    '<div class="tools"><label class="check"><input type="checkbox" data-act="assist" ' + (ui.assist ? 'checked' : '') + '> Outline cards that match the active obstacle</label>' +
    '<button class="btn sm" data-act="newgame">New game</button></div></header>';
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
        if (!rec) return '<div class="corner empty">' + back('mini') + '<span>' + ini + '</span></div>';
        const pick = md === 'distract' ? 'pick' : '';
        return '<div class="corner">' + back('mini ' + pick, pick ? 'data-act="distract-pick" data-p="' + p.idx + '"' : '') + '<span>' + ini + '</span></div>';
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
  return '<div class="seat ' + (p.human ? 'me ' : '') + (turn ? 'turn' : '') + '"><h3>' + esc(p.name) + (p.human ? ' (you)' : '') +
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

function dialogHTML() {
  if (ui.dialog === 'setup') {
    const segN = [2, 3, 4].map((n) => '<button data-act="setn" data-v="' + n + '" aria-pressed="' + (ui.n === n) + '">' + n + ' players</button>').join('');
    const obs = { 2: 7, 3: 5, 4: 3 }[ui.n] + (ui.extra ? 1 : 0);
    const segS = [['Fast', 350], ['Normal', 800], ['Slow', 1500]].map((d) => '<button data-act="setspeed" data-v="' + d[1] + '" aria-pressed="' + (ui.speed === d[1]) + '">' + d[0] + '</button>').join('');
    return '<div class="overlay"><div class="dialog"><h2>Escape from <span>Ace-catraz</span></h2>' +
      '<p>You are Ace. You can see every crewmate’s cards but never your own. The CPU inmates work from the same information you have.</p>' +
      '<div class="field"><b>Crew size</b><div class="seg">' + segN + '</div><p class="mono" style="font-size:12px">' + obs + ' obstacles, ' + (ui.n - 1) + ' extra HARD card' + (ui.n > 2 ? 's' : '') + ' shuffled in</p></div>' +
      '<label class="check"><input type="checkbox" data-act="extra" ' + (ui.extra ? 'checked' : '') + '> Add one obstacle (harder, per the rules tip)</label>' +
      '<div class="field"><b>CPU speed</b><div class="seg">' + segS + '</div></div>' +
      '<button class="btn primary" data-act="start">Start the escape</button></div></div>';
  }
  if (G && G.result && !ui.endSeen) {
    const w = G.result.won;
    const done = Math.min(G.cur, G.obstacles.length);
    return '<div class="overlay"><div class="dialog ' + (w ? 'win' : 'lose') + '"><h2>' + (w ? 'Freedom!' : 'Back to your cells') + '</h2><p style="color:var(--fg)">' + esc(G.result.reason) + '</p>' +
      '<p class="mono" style="font-size:12px">Obstacles cleared ' + done + '/' + G.obstacles.length + ' · guard checks ' + G.stats.guards + ' (' + G.stats.guardPass + ' passed) · hints ' + G.stats.hints + ' · riots ' + G.stats.riots + ' · distractions ' + G.stats.distracts + '</p>' +
      '<div class="actions"><button class="btn primary" data-act="again">Play again</button><button class="btn" data-act="newgame">Change setup</button><button class="btn" data-act="closeend">Look at the board</button></div></div></div>';
  }
  return '';
}

function render() {
  const scroll = document.getElementById('log');
  const atBottom = !scroll || scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 30;
  if (!G) { app.innerHTML = headerHTML() + dialogHTML(); return; }
  const cpus = G.players.filter((p) => !p.human), me = G.players.filter((p) => p.human);
  app.innerHTML = headerHTML() + '<div class="wrap"><div class="main">' + planHTML() + tableHTML() + trayHTML() +
    '<section class="panel"><h2>Crew <small>each tag shows what that player knows about their own card</small></h2><div class="seats">' + cpus.map(seatHTML).join('') + '</div></section>' +
    '<section class="panel"><h2>Your hand</h2><div class="seats">' + me.map(seatHTML).join('') + '</div>' + controlsHTML() + '</section></div>' + logHTML() + '</div>' + dialogHTML();
  const lg = document.getElementById('log');
  if (lg && atBottom) lg.scrollTop = lg.scrollHeight;
}

function doApply(a) {
  const O = A.active(G);
  const before = a.type === 'breakthrough' && O ? O.planted.map((r) => ({ player: r.player, card: r.card })) : null;
  const r = A.apply(G, a);
  if (!r.ok) { console.warn(a, r.why); return r; }
  ui.flash = a.type === 'hint' ? { to: a.to, hand: a.hand } : null;
  if (before) ui.reveal = { ok: G.lastBreak.ok, items: before };
  ui.sel = null; ui.hintSel = null; if (a.type === 'riotSwap') ui.swapA = null;
  return r;
}

function schedule() {
  clearTimeout(timer);
  if (!G || G.result || ui.dialog) return;
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
  ui.dialog = null; ui.endSeen = false; ui.sel = null; ui.swapA = null; ui.hintSel = null; ui.reveal = null; ui.flash = null; ui.tray = false;
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
