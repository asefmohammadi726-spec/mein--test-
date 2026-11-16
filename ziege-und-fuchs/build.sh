#!/bin/sh
# Baut den Film komplett neu: sh build.sh   (braucht die Lemo-Opuscar-Bibliothek: setup.sh deps music)
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "LIB auf den Bibliotheksordner setzen"; exit 1; }
cd "$LIB"
"$LIB/.venv/bin/python" core/audio/sampler.py --need "$HERE/mix.py"          # VCSL-Samples (CC0) vorab laden
node core/render/events.mjs "$HERE"                                          # Zeitachse → events.json
"$LIB/.venv/bin/python" "$HERE/mix.py"                                       # Partitur + Geräusche → out/mix.wav
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh "$HERE/mux.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/ziege-und-fuchs.mp4"
node core/render/still.mjs "$HERE" 41.5 --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_41.5.jpg" "$HERE/poster.jpg"
