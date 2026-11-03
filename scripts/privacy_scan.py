#!/usr/bin/env python3
"""Conservative source allowlist and accidental-secret scan; not proof of secrecy."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALLOW = {
    '.gitignore', '.gitattributes', 'LICENSE', 'README.md', 'SECURITY.md', 'THIRD_PARTY_NOTICES.md',
    'docs/architecture.md', 'docs/pitfalls.md',
    'Shadowrocket/Phone-WLOC.template.conf', 'Shadowrocket/phone-wloc-amap.js', 'Shadowrocket/response-wrapper.js',
    *('Shadowrocket/Control/' + n for n in ('settings.js', 'session.js', 'places.js', 'map.js', 'amap.js', 'experience.js', 'page.html', 'page.css')),
    *('Tests/Shadowrocket/' + n + 'Checks.swift' for n in ('AMap', 'Bootstrap', 'Control', 'Experience', 'Expiry', 'Map', 'Places', 'ResponseExpiry', 'Search')),
    *('scripts/' + n + '.py' for n in ('build_control', 'build_response', 'test', 'privacy_scan')),
}
IGNORE = {'.git', '.private-build', 'dist', '__pycache__'}
PATTERNS = {
    'private key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'personal path': r'(?:/Users/[A-Za-z0-9_-]+/|[A-Z]:[\\/]Users[\\/])',
    'device identifier': r'(?<![0-9a-fA-F])[0-9a-fA-F]{8}-[0-9a-fA-F]{16}(?![0-9a-fA-F])',
    'IPv4 address': r'(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])',
    'GitHub token': r'gh[pousr]_[A-Za-z0-9]{20,}',
    'assigned map credential': r'(?:securityJsCode|["\']key["\'])\s*[:=]\s*["\'][a-zA-Z0-9_-]{24,}["\']',
}

def scan():
    errors = []
    for path in ROOT.rglob('*'):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in IGNORE for part in rel.parts):
            continue
        name = rel.as_posix()
        if name not in ALLOW:
            errors.append(name + ': not in public source allowlist')
            continue
        if name in ('LICENSE', 'scripts/privacy_scan.py'):
            continue
        text = path.read_text(encoding='utf-8')
        for label, pattern in PATTERNS.items():
            if re.search(pattern, text):
                errors.append(name + ': possible ' + label)
    for name in ALLOW:
        if not (ROOT / name).is_file():
            errors.append(name + ': expected source missing')
    return errors

if __name__ == '__main__':
    errors = scan()
    if errors:
        print('FAIL\n' + '\n'.join(errors))
        raise SystemExit(1)
    print('PASS: ' + str(len(ALLOW)) + ' allowlisted public source files; ignored outputs excluded. Manual review still required.')
