// Phone-local control page compatible with hankinsus/wloc's wloc_settings format.
// Runs inside Shadowrocket; no computer or web server supplies this page.
(function () {
  'use strict';
  var key = 'wloc_settings';
  /* PHONE_SESSION_HELPER */
  var q = {};
  var raw = ($request.url.split('?')[1] || '').split('#')[0];
  raw.split('&').forEach(function (part) {
    var i = part.indexOf('=');
    if (i < 0) return;
    try { q[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' ')); } catch (_) {}
  });
  function read() {
    return readWlocSession();
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function number(value) {
    return value == null || value.trim() === '' ? NaN : Number(value);
  }
  var action = q.action || ((q.lat != null || q.lon != null) ? 'save' : 'panel');
  if (action === 'search') {
    function searchReply(value) {
      $done({ response: { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(value) } });
    }
    var query = String(q.q || '').trim();
    if (!query || query.length > 120) { searchReply({ success: false, error: '请输入 1～120 字的地点名称。' }); return; }
    $httpClient.get({ url: 'https://photon.komoot.io/api/?limit=5&q=' + encodeURIComponent(query), timeout: 8,
      headers: { 'User-Agent': 'PhoneWLOC/1.0 personal-map-picker' } }, function (error, response, body) {
      if (error || !response || Number(response.status || response.statusCode) !== 200) { searchReply({ success: false, error: '在线查找暂不可用，请使用常用地点或地图选点。' }); return; }
      try {
        var data = JSON.parse(body);
        if (!Array.isArray(data.features)) throw Error('invalid search response');
        var places = data.features.map(function (feature) {
          var xy = feature.geometry && feature.geometry.coordinates, p = feature.properties || {};
          if (!xy || typeof xy[0] !== 'number' || typeof xy[1] !== 'number' || !isFinite(xy[0]) || !isFinite(xy[1]) || Math.abs(xy[0]) > 180 || Math.abs(xy[1]) > 90) return null;
          return { lat: xy[1], lon: xy[0], label: String(p.name || p.street || query).slice(0, 120),
            address: [p.country, p.state, p.city, p.district, p.street, p.housenumber].filter(Boolean).join(' · ').slice(0, 240) };
        }).filter(Boolean).slice(0, 5);
        searchReply({ success: true, places: places });
      } catch (_) { searchReply({ success: false, error: '搜索结果解析失败，请稍后重试。' }); }
    });
    return;
  }
  var result;
  if (action === 'save') {
    var lat = number(q.lat != null ? q.lat : q.latitude);
    var lon = number(q.lon != null ? q.lon : q.longitude);
    var acc = number(q.acc == null ? '25' : q.acc);
    if (!isFinite(lat) || Math.abs(lat) > 90 || !isFinite(lon) || Math.abs(lon) > 180 || !isFinite(acc) || acc < 1 || acc > 10000) {
      result = { success: false, error: '请输入有效的 WGS-84 纬度（-90～90）、经度（-180～180）及精度（1～10000 米）。' };
    } else {
      var now = Date.now();
      var data = { latitude: lat, longitude: lon, accuracy: acc, updatedAt: new Date(now).toISOString(), startedAt: now, expiresAt: now + 600000 };
      result = $persistentStore.write(JSON.stringify(data), key)
        ? { success: true, latitude: lat, longitude: lon, accuracy: acc, startedAt: now, expiresAt: data.expiresAt }
        : { success: false, error: '手机本地保存失败，请重试。' };
    }
  } else if (action === 'clear') {
    result = $persistentStore.write('null', key)
      ? { success: true }
      : { success: false, error: '清除失败，目标可能仍在生效，请重试。' };
  } else if (action === 'query') {
    var saved = read();
    result = saved && saved.latitude != null && saved.longitude != null
      ? Object.assign({ success: true }, saved)
      : { success: false, error: '无已保存的坐标数据' };
  } else if (action !== 'panel') {
    result = { success: false, error: '未知操作。' };
  }
  var html = action === 'panel' || q.ui === '1';
  var body;
  if (html) {
    var current = read();
    var configured = current && current.latitude != null && current.longitude != null;
    var notice = result ? (result.success
      ? (action === 'clear' ? '目标已清除。等待系统位置刷新，并到地图核对恢复情况。' : '目标已保存，有效 10 分钟。等待网络定位刷新，并到地图核对是否生效。')
      : result.error) : '';
    var template = /* PHONE_PAGE_TEMPLATE */;
    var amapConfig = {};
    try { amapConfig = JSON.parse($persistentStore.read('phone_wloc_amap_config') || '{}'); } catch (_) {}
    var fields = {
      AMAP_CONFIG: JSON.stringify(amapConfig).replace(/</g, '\\u003c'),
      NOTICE: notice ? '<p class="notice" role="status">' + esc(notice) + '</p>' : '',
      STATUS: configured ? '已保存目标坐标' : '未设置目标 · 原始响应透传',
      SAVED: configured ? '纬度 ' + esc(current.latitude) + ' · 经度 ' + esc(current.longitude) : '当前没有保存目标位置。',
      LAT: configured ? esc(current.latitude) : '',
      LON: configured ? esc(current.longitude) : '',
      ACC: configured ? esc(current.accuracy) : '25',
      EXPIRES: configured ? String(current.expiresAt) : '0',
      DISABLED: configured ? '' : 'disabled'
    };
    body = template.replace(/@@(NOTICE|STATUS|SAVED|LAT|LON|ACC|EXPIRES|DISABLED|AMAP_CONFIG)@@/g, function (_, key) { return fields[key]; });
  } else {
    body = JSON.stringify(result);
  }
  $done({ response: { status: 200, headers: {
    'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://webapi.amap.com https://*.amap.com https://*.autonavi.com; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org https://*.autonavi.com https://*.amap.com data: blob:; connect-src 'self' https://*.amap.com https://*.autonavi.com; worker-src blob:; font-src data: https://*.amap.com https://*.autonavi.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  }, body: body } });
})();
