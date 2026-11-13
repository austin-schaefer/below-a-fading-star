#!/bin/bash
# The README's Progress galleries: one picture a major release, four to a box (2 by 2), each labelled with its
# version. Builds one box from curated keepers:
#   tools/gallery.sh shots/gallery-v8-to-v11.webp v8=shots/a.webp v9=shots/b.webp v10=shots/c.webp v11=shots/d.webp
# One to four label=image pairs; missing tiles stay dark until their release ships (rebuild the box with one more
# pair, renaming it for the versions it holds, and point README.md's Progress at it).
set -euo pipefail
out=$1; shift
[ $# -ge 1 ] && [ $# -le 4 ] || { echo "usage: $0 out.webp label=image [label=image ...] (one to four)"; exit 1; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
font=/System/Library/Fonts/Supplemental/Baskerville.ttc; [ -f "$font" ] || font=Times-Roman
i=0; pos=("+6+6" "+978+6" "+6+558" "+978+558"); args=()
for pair in "$@"; do
  label=${pair%%=*}; img=${pair#*=}; [ -f "$img" ] || { echo "no such image: $img"; exit 1; }
  magick "$img" -resize 960x540^ -gravity center -extent 960x540 \
    \( -size 960x150 gradient:'rgba(13,11,18,0)-rgba(13,11,18,0.85)' \) -gravity south -composite \
    -font "$font" -pointsize 54 -fill '#f2ece4' -gravity southwest -annotate +28+10 "$label" "$tmp/$i.png"
  args+=("$tmp/$i.png" -geometry "${pos[$i]}" -composite); i=$((i + 1))
done
magick -size 1944x1104 xc:'#0d0b12' -gravity northwest "${args[@]}" -quality 82 "$out"
echo "$out: $i of 4 tiles"
