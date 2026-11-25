#!/usr/bin/env bash
# Rend un morceau « bouclable » : la fin est fondue dans le début (fondu enchaîné), puis le niveau est
# ramené à -20 LUFS et le résultat est écrit en OGG et en MP3.
#   raccorder.sh entree sortie_sans_extension [fondu_secondes] [fin_utile_secondes]
# Le morceau obtenu dure (fin utile − fondu) secondes : il commence là où la fin s'arrête, donc la boucle ne s'entend pas.
# `fin_utile` : instant où couper (pour retirer un silence final) ; par défaut, la durée entière.
set -euo pipefail
entree=${1:?fichier_entree}
sortie=${2:?chemin de sortie sans extension}
fondu=${3:-2}
duree=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$entree")
fin=${4:-$duree}
filtre="[0:a]atrim=0:${fin},asetpts=PTS-STARTPTS,asplit=3[a][b][c];"
filtre+="[a]atrim=0:${fondu},asetpts=PTS-STARTPTS[debut];"
filtre+="[b]atrim=${fondu}:$(echo "$fin - $fondu" | bc -l),asetpts=PTS-STARTPTS[corps];"
filtre+="[c]atrim=$(echo "$fin - $fondu" | bc -l):${fin},asetpts=PTS-STARTPTS[queue];"
filtre+="[queue]afade=t=out:d=${fondu}:curve=qsin[q2];[debut]afade=t=in:d=${fondu}:curve=qsin[d2];"
filtre+="[q2][d2]amix=inputs=2:duration=longest:normalize=0[raccord];"
filtre+="[corps][raccord]concat=n=2:v=0:a=1,loudnorm=I=-20:TP=-1.5:LRA=11[s]"
ffmpeg -hide_banner -loglevel error -y -i "$entree" -filter_complex "$filtre" -map "[s]" -ar 44100 -ac 2 -c:a libvorbis -q:a 5 "${sortie}.ogg"
ffmpeg -hide_banner -loglevel error -y -i "${sortie}.ogg" -c:a libmp3lame -b:a 192k "${sortie}.mp3"
echo "$(basename "$sortie") : $(ffprobe -v error -show_entries format=duration -of csv=p=0 "${sortie}.ogg") s"
