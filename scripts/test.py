#!/usr/bin/env python3
"""Run self-contained Apple JavaScriptCore checks; optional upstream check is explicit."""
import argparse
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--response', action='store_true', help='also test privately built upstream response')
args = parser.parse_args()
subprocess.run([sys.executable, str(ROOT / 'scripts/build_control.py'), '--loader-bootstrap'], cwd=ROOT, check=True)
if platform.system() != 'Darwin':
    print('SKIP: Swift JavaScriptCore checks require macOS; no behavioral tests ran.')
    raise SystemExit(0)
for name in ('AMap', 'Bootstrap', 'Control', 'Experience', 'Expiry', 'Map', 'Places', 'Search'):
    subprocess.run(['swift', str(ROOT / 'Tests/Shadowrocket' / (name + 'Checks.swift'))], cwd=ROOT, check=True)
if args.response:
    subprocess.run([sys.executable, str(ROOT / 'scripts/build_response.py')], cwd=ROOT, check=True)
    subprocess.run(['swift', str(ROOT / 'Tests/Shadowrocket/ResponseExpiryChecks.swift')], cwd=ROOT, check=True)
else:
    print('SKIP: response binary test needs separately obtained upstream; use --response.')
