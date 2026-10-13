#!/bin/sh
{
echo '<title>Escape from Ace-catraz</title>'
echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">'
echo '<style>'; cat src/style.css; echo '</style>'
echo '<div id="app"></div>'
echo '<script>'; cat src/engine.js; echo '</script>'
echo '<script>'; cat src/cpu.js; echo '</script>'
echo '<script>'; cat src/ui.js; echo '</script>'
} > index.html
wc -c index.html
