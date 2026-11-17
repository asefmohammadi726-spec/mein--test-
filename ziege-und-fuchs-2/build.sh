#!/bin/sh
# Filmi baştan üretir: sh build.sh   (Lemo-Opuscar kütüphanesi gerekir: setup.sh deps music)
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "LIB değişkenini kütüphane klasörüne ayarla"; exit 1; }
cd "$LIB"
"$LIB/.venv/bin/python" core/audio/sampler.py --need "$HERE/mix.py"          # VCSL örneklerini (CC0) önceden indir
node core/render/events.mjs "$HERE"                                          # zaman çizelgesi → events.json
"$LIB/.venv/bin/python" "$HERE/mix.py"                                       # partisyon + sesler → out/mix.wav
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$HERE/out/video.mp4" -c:v libx264 -crf 28 -preset slow -tune grain -pix_fmt yuv420p -r 24 "$HERE/out/video_small.mp4"   # kâğıt dokusu → yoksa 300 MB üstü
sh "$HERE/mux.sh" "$HERE/out/video_small.mp4" "$HERE/out/mix.wav" "$HERE/ziege-und-fuchs-2.mp4"   # −14 LUFS, ffmpeg 6.x
node core/render/still.mjs "$HERE" 37.5 --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_37.5.jpg" "$HERE/poster.jpg"
