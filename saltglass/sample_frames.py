"""Extract evenly-spaced review frames from the muxed episode for QC."""
import json
import os
import subprocess
import sys

BUILD = '/tmp/claude-0/-home-user-stunning-giggle/19df9652-c879-5865-b6f6-712001ab7324/scratchpad/build'
FFMPEG = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'


def main(video, out_dir, n=28):
    os.makedirs(out_dir, exist_ok=True)
    tl = json.load(open(os.path.join(BUILD, 'timeline.json')))
    total = tl['total']
    # sample inside shots (avoid transition frames): pick times spread across
    # scenes proportionally, snapped to shot midpoints
    times = []
    shots = [sh for sc in tl['scenes'] for sh in sc['shots']]
    stride = max(1, len(shots) // n)
    for sh in shots[::stride]:
        times.append((sh['start'] + sh['dur'] * 0.55, sh['scene'], sh['idx'], sh['template']))
    for t, scn, idx, tpl in times[:n + 6]:
        name = f's{scn:02d}_shot{idx:02d}_{tpl}.jpg'
        subprocess.run([FFMPEG, '-y', '-ss', f'{t:.2f}', '-i', video,
                        '-frames:v', '1', '-q:v', '3', os.path.join(out_dir, name)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('sampled', len(times[:n + 6]), 'frames ->', out_dir)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 28)
