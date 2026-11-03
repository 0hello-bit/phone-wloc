#!/usr/bin/env python3
"""Build a standalone local Shadowrocket control script, without upstream code."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def build(config=None):
    control = ROOT / 'Shadowrocket/Control'
    page = (control / 'page.html').read_text(encoding='utf-8')
    for marker, names in {'MAP_JS': ['map.js', 'experience.js'], 'PLACES_JS': ['places.js'], 'AMAP_JS': ['amap.js'], 'PAGE_CSS': ['page.css']}.items():
        page = page.replace('@@' + marker + '@@', '\n'.join((control / n).read_text(encoding='utf-8') for n in names))
    source = (control / 'settings.js').read_text(encoding='utf-8')
    source = source.replace('/* PHONE_SESSION_HELPER */', (control / 'session.js').read_text(encoding='utf-8'))
    source = source.replace('/* PHONE_PAGE_TEMPLATE */', json.dumps(page, ensure_ascii=False))
    if config is not None:
        values = json.loads(config.read_text(encoding='utf-8'))
        values = {key: str(values.get(key, '')) for key in ('key', 'securityJsCode')}
        source = '$persistentStore.write(' + json.dumps(json.dumps(values)) + ', "phone_wloc_amap_config");\n' + source
    return source

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--amap-config', type=Path, help='ignored local JSON containing your own key/securityJsCode')
    parser.add_argument('--loader-bootstrap', action='store_true', help='also create one-shot local loader cache installer')
    args = parser.parse_args()
    if args.amap_config and not args.amap_config.resolve().is_relative_to((ROOT / '.private-build').resolve()):
        parser.error('AMap config must be inside ignored .private-build/')
    output = ROOT / ('.private-build' if args.amap_config else 'dist') / 'phone-wloc-settings.js'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build(args.amap_config), encoding='utf-8')
    if args.loader_bootstrap:
        bootstrap = output.with_name('phone-wloc-bootstrap.js')
        bootstrap.write_text('var ok=$persistentStore.write(' + json.dumps(output.read_text(encoding='utf-8'), ensure_ascii=False) + ', "phone_wloc_control_amap_v1");\n$done({response:{status:ok?200:500,body:ok?"Control cache installed":"Cache write failed"}});\n', encoding='utf-8')
        print('Built', bootstrap.relative_to(ROOT))
    print('Built', output.relative_to(ROOT))
