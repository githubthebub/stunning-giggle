#!/bin/sh
# Fetch the fonts needed to rebuild the proposal PDF (Google Fonts, OFL-licensed)
set -e
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
BASE="https://raw.githubusercontent.com/google/fonts/main"
curl -sfLo NotoSansJP-Regular.ttf "$BASE/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"
curl -sfLo NotoSerifJP.ttf "$BASE/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf"
curl -sfLo NotoSansDevanagari.ttf "$BASE/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf"
curl -sfLo NotoSansTamil.ttf "$BASE/ofl/notosanstamil/NotoSansTamil%5Bwdth,wght%5D.ttf"
curl -sfLo Cormorant.ttf "$BASE/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
curl -sfLo Marcellus.ttf "$BASE/ofl/marcellus/Marcellus-Regular.ttf"
curl -sfLo Inter.ttf "$BASE/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
