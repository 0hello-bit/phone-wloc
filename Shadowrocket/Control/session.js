// Shared by the phone control and response scripts. No browser timer is trusted.
function readWlocSession() {
  var raw;
  try { raw = $persistentStore.read('wloc_settings'); } catch (_) { return null; }
  if (!raw || raw === 'null') return null;
  var s;
  try { s = JSON.parse(raw); } catch (_) {}
  var now = Date.now();
  var valid = s && typeof s.latitude === 'number' && isFinite(s.latitude) && Math.abs(s.latitude) <= 90
    && typeof s.longitude === 'number' && isFinite(s.longitude) && Math.abs(s.longitude) <= 180
    && typeof s.startedAt === 'number' && isFinite(s.startedAt)
    && typeof s.expiresAt === 'number' && isFinite(s.expiresAt)
    && s.expiresAt - s.startedAt === 600000 && now >= s.startedAt && now < s.expiresAt;
  if (valid) return s;
  try { $persistentStore.write('null', 'wloc_settings'); } catch (_) {}
  return null; // A failed cleanup must never permit an expired rewrite.
}
