#!/bin/sh
{
echo '<title>Escape from Ace-catraz</title>'
echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
echo '<meta name="theme-color" content="#14301f"><link rel="manifest" href="app.webmanifest"><link rel="icon" href="icon-192.png">'
echo '<style>'; cat src/font.css src/style.css; echo '</style>'
echo '<div id="app"></div>'
echo '<script>'; cat src/engine.js; echo '</script>'
echo '<script>'; cat src/cpu.js; echo '</script>'
echo '<script>'; cat src/rulebook.js; echo '</script>'
echo '<script>'; cat src/rulebook_prison.js; echo '</script>'
echo '<script>'; cat src/demo.js; echo '</script>'
echo '<script>'; cat src/ui.js; echo '</script>'
} > index.html
wc -c index.html
