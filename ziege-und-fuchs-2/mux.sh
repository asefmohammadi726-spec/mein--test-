#!/bin/sh
# Bild + Ton zusammenführen, für ffmpeg 6.x (das mux.sh der Bibliothek verlangt ffmpeg 7+).
#   sh mux.sh video.mp4 mix.wav out.mp4
# Zwei-Pass-loudnorm auf −14 LUFS / −2 dBTP in eine WAV-Datei, auf die Bildlänge aufgefüllt, dann AAC; das Bild wird kopiert.
set -e
LC_ALL=C; export LC_ALL
V="$1"; A="$2"; O="$3"
[ -f "$V" ] && [ -f "$A" ] && [ -n "$O" ] || { echo "usage: sh mux.sh video.mp4 mix.wav out.mp4" >&2; exit 1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
J=$(ffmpeg -hide_banner -nostats -i "$A" -af loudnorm=I=-14:TP=-2.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -hide_banner -loglevel error -y -i "$A" \
  -af "loudnorm=I=-14:TP=-2.0:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000,apad,atrim=0:$VD" \
  -c:a pcm_s24le "$TMP/a.wav"
ffmpeg -hide_banner -loglevel error -y -i "$V" -i "$TMP/a.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart "$TMP/o.mp4"
mv "$TMP/o.mp4" "$O"
ffmpeg -hide_banner -nostats -i "$O" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|Peak:)' | tr -s ' ' | sed 's/^/mux.sh: /'
echo "$O"
