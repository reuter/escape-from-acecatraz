// Wraps the printable rulebook (rules.html) so the app can show it as a scrollable, scaled "paper" viewer.
const fs = require('fs');
let h = fs.readFileSync('/home/claude/rules/rules.html', 'utf8');
const viewer = `<style>
@media screen { html { background: #394753; } body { background: #394753; padding: 6px 0 18px; }
  .page { margin: 14px auto 0; box-shadow: 0 6px 24px rgba(0,0,0,.45); border-radius: 4px; }
  .page > .hero, .page > .hd { border-radius: 4px 4px 0 0; } }
</style><script>
(function () {
  function fit() {
    var w = document.documentElement.clientWidth - 16, k = Math.max(0.3, Math.min(1.35, w / 816));
    var ps = document.querySelectorAll('.page'); for (var i = 0; i < ps.length; i++) ps[i].style.zoom = k;
  }
  addEventListener('resize', fit); addEventListener('DOMContentLoaded', fit); addEventListener('load', fit);
})();
</script>`;
h = h.replace('</style>', '</style>' + viewer);
fs.writeFileSync('/home/claude/ace/src/rulebook.js', 'window.RULEBOOK_HTML = ' + JSON.stringify(h).replace(/<\//g, '<\\/') + ';\n');
console.log('rulebook.js', h.length);
