#!/usr/bin/env python3
"""Private-only response build. Upstream redistribution permission is unresolved."""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM_COMMIT = '8ce5aaa3098d7887373954dddf64f58afae4cd97'
UPSTREAM_SHA256 = '4ea95c543f101dd25febfac292ba7faa914e87bcbf78eb7e23ee171f0f8e02c5'

if __name__ == '__main__':
    source = ROOT / '.private-build/upstream-wloc.js'
    if not source.is_file():
        raise SystemExit('Missing .private-build/upstream-wloc.js: obtain upstream separately; see THIRD_PARTY_NOTICES.md')
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != UPSTREAM_SHA256:
        raise SystemExit('Upstream SHA256 mismatch; refusing to build')
    session = (ROOT / 'Shadowrocket/Control/session.js').read_text(encoding='utf-8')
    wrapper = (ROOT / 'Shadowrocket/response-wrapper.js').read_text(encoding='utf-8')
    output = wrapper.replace('/* PHONE_SESSION_HELPER */', session).replace('/* PRIVATE_UPSTREAM_SOURCE */', raw.decode('utf-8'))
    (ROOT / '.private-build/phone-wloc-response.js').write_text(output, encoding='utf-8')
    print('Built private response; do not redistribute without upstream permission')
