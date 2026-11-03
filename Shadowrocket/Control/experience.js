(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var api = window.wlocMap, storage;
  try { storage = window.localStorage; } catch (_) {}
  var places = window.createWlocPlaces(storage || { getItem: function () { return null; }, setItem: function () { throw Error('storage'); } });
  var deadline = Number(el('session-countdown').dataset.expires || 0);
  var saved = deadline ? { lat: Number(document.querySelector('[name="lat"]').value), lon: Number(document.querySelector('[name="lon"]').value) } : null;
  var busy = false, geoPending = false, geoEpoch = 0, selectedLabel = '', interacted = false;
  var lastSearch = 0, searchVersion = 0, autoRefresh = true;
  try { autoRefresh = storage.getItem('phone-wloc-auto-refresh') !== 'off'; } catch (_) {}
  el('auto-refresh').checked = autoRefresh;
  el('auto-refresh').onchange = function () {
    autoRefresh = this.checked;
    try { storage.setItem('phone-wloc-auto-refresh', autoRefresh ? 'on' : 'off'); } catch (_) {}
    buttons();
  };
  function openRefreshShortcut() {
    if (!autoRefresh) return;
    try { window.location.assign('shortcuts://run-shortcut?name=' + encodeURIComponent('定位刷新')); }
    catch (_) { message('操作已成功。请点下方“定位刷新”前往定位服务。'); }
  }
  function active() { return deadline > Date.now(); }
  function message(text, error) {
    el('feedback').textContent = '';
    var p = document.createElement('p'); p.className = 'notice' + (error ? ' error' : ''); p.textContent = text;
    el('feedback').appendChild(p);
  }
  function endpoint(action, fields) {
    var params = new URLSearchParams(fields || {}); params.set('action', action);
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 12000);
    return fetch('/wloc-settings/save?' + params.toString(), { cache: 'no-store', signal: controller.signal })
      .then(function (r) { if (!r.ok) throw Error('接口返回 ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(timeout); });
  }
  function buttons() {
    el('save-target').disabled = busy || !api.state().selected;
    el('clear-target').disabled = busy;
    el('refresh-session').disabled = busy;
    el('auto-refresh').disabled = busy;
    if (!busy) {
      el('save-target').textContent = autoRefresh ? '保存并刷新 · 10 分钟' : '保存 · 10 分钟';
      el('clear-target').textContent = autoRefresh ? '清除并刷新' : '清除';
    }
    el('origin-record').disabled = busy || geoPending || active();
    el('origin-view').disabled = el('origin-map').disabled = !places.origin();
    el('saved-map').disabled = !saved || !active();
  }
  function tick() {
    var seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el('session-countdown').textContent = seconds ? '剩余 ' + Math.floor(seconds / 60) + ':' + ('0' + seconds % 60).slice(-2) : '当前没有有效定位会话';
    el('session-status').textContent = seconds ? '已保存目标坐标' : '未设置目标 · 原始响应透传';
    buttons();
  }
  function setSession(r) {
    deadline = r.success && Number.isFinite(r.expiresAt) ? r.expiresAt : 0;
    saved = deadline ? { lat: r.latitude, lon: r.longitude } : null;
    el('session-countdown').dataset.expires = String(deadline);
    el('saved-target').textContent = saved ? '目标 ' + saved.lat.toFixed(6) + ', ' + saved.lon.toFixed(6) : '当前没有保存目标位置。';
    tick();
  }
  function originInfo() {
    geoPending = false;
    var p = places.origin();
    el('origin-badge').textContent = p ? '已保留' : '尚未记录';
    if (p) {
      el('origin-info').textContent = p.lat.toFixed(6) + ', ' + p.lon.toFixed(6) + ' · 精度约 ' + Math.round(p.accuracy) + ' 米 · ' + new Date(p.time).toLocaleString();
      el('origin-record').textContent = '重新记录系统位置';
    }
    buttons();
  }
  function choose(p) {
    ++searchVersion; el('search-submit').disabled = false;
    interacted = true;
    api.center(p.lat, p.lon, 16, true);
    selectedLabel = p.label || '';
    if (selectedLabel) el('picked').textContent = selectedLabel + ' · ' + p.lat.toFixed(6) + ', ' + p.lon.toFixed(6);
    el('search-results').hidden = true; el('place-query').blur();
    buttons();
  }
  window.onWlocNamedPick = function (name, lat, lon) { selectedLabel = name; el('picked').textContent = name + ' · ' + lat.toFixed(6) + ', ' + lon.toFixed(6); };
  window.onWlocPick = function () { selectedLabel = ''; interacted = true; buttons(); };
  function renderList(id, points, favorite) {
    var list = el(id); list.textContent = '';
    if (!points.length) {
      var empty = document.createElement('p'); empty.className = 'subtle';
      empty.textContent = favorite ? '选好位置后，点书签图标收藏。' : '成功保存的地点会出现在这里。';
      list.appendChild(empty); return;
    }
    points.forEach(function (p) {
      var row = document.createElement('div'); row.className = 'place-row';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = p.label;
      var coordinates = document.createElement('small'); coordinates.textContent = p.lat.toFixed(6) + ', ' + p.lon.toFixed(6);
      b.appendChild(coordinates); b.onclick = function () { choose(p); el('map').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
      row.appendChild(b);
      if (favorite) {
        var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-place';
        remove.textContent = '移除'; remove.setAttribute('aria-label', '移除常用地点 ' + p.label);
        remove.onclick = function () { if (!places.removeFavorite(p.id)) message('无法保存到此手机，请检查 Safari 网站数据权限。', true); renderPlaces(); };
        row.appendChild(remove);
      }
      list.appendChild(row);
    });
  }
  function renderPlaces() { renderList('favorites', places.favorites(), true); renderList('recent-places', places.recents(), false); }
  function recordOrigin(replace) {
    if (busy || geoPending || active()) { message('当前虚拟目标生效中，暂不记录系统位置，避免覆盖进入时的位置。', true); return; }
    if (!navigator.geolocation) { message('此浏览器无法请求定位，请检查 Safari 定位权限。', true); return; }
    var epoch = ++geoEpoch; geoPending = true;
    el('origin-record').disabled = true; el('origin-badge').textContent = '正在定位…';
    endpoint('query').then(function (r) {
      if (epoch !== geoEpoch) return;
      if (r.success) { setSession(r); originInfo(); message('已有虚拟目标，未记录进入时位置。', true); return; }
      navigator.geolocation.getCurrentPosition(function (position) {
        endpoint('query').then(function (current) {
          if (epoch !== geoEpoch) return;
          if (current.success || busy || active()) { originInfo(); message('定位期间目标发生变化，未覆盖位置记录。', true); return; }
          var c = position.coords, p = { lat: c.latitude, lon: c.longitude, accuracy: c.accuracy, time: position.timestamp };
          var ok = places.recordOrigin(p, false, replace);
          originInfo();
          if (!ok) { message('位置未写入本地。请检查网站数据权限，原记录已保留。', true); return; }
          if (!interacted && !api.state().selected) api.center(p.lat, p.lon, 16, false);
          message('已保留进入时的系统位置。它不会被后续虚拟目标自动覆盖。');
        }).catch(function () { originInfo(); message('无法确认目标状态，本次未记录位置，请稍后重试。', true); });
      }, function (error) {
        if (epoch !== geoEpoch) return;
        originInfo();
        var reason = error.code === 1 ? '定位权限未允许。请在 Safari 网站设置和系统定位服务中允许定位。' : '暂时无法取得系统位置，请稍后再点“记录系统当前位置”。';
        message(reason, true); el('origin-badge').textContent = places.origin() ? '已保留' : '未取得位置';
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    }).catch(function () { originInfo(); message('无法确认当前目标状态，未请求定位。请确认小火箭连接。', true); });
  }
  el('origin-record').onclick = function () { recordOrigin(true); };
  el('origin-map').onclick = el('origin-view').onclick = function () { var p = places.origin(); if (p) choose(Object.assign({ label: '进入时位置' }, p)); };
  el('saved-map').onclick = function () { if (saved && active()) choose(Object.assign({ label: '已保存目标' }, saved)); };
  el('favorite-add').onclick = function () {
    if (!api.state().selected) { message('先轻点地图选择一个地点。', true); return; }
    el('favorite-editor').hidden = !el('favorite-editor').hidden;
    if (!el('favorite-editor').hidden) { el('favorite-name').value = selectedLabel; el('favorite-name').focus(); }
  };
  el('favorite-confirm').onclick = function () {
    var p = places.parseCoordinates(document.querySelector('[name="lat"]').value + ',' + document.querySelector('[name="lon"]').value);
    if (!p) { message('请先选择有效位置，空白坐标不能加入收藏。', true); return; }
    p.label = el('favorite-name').value.trim() || selectedLabel || '地图选点';
    if (!places.addFavorite(p)) { message('常用地点保存失败，请检查网站数据权限。', true); return; }
    el('favorite-editor').hidden = true; renderPlaces(); message('已加入常用地点。');
  };
  el('target-form').onsubmit = function (event) {
    event.preventDefault(); if (busy) return;
    var lat = document.querySelector('[name="lat"]'), lon = document.querySelector('[name="lon"]'), acc = document.querySelector('[name="acc"]');
    if (!lat.value.trim() || !lon.value.trim() || !Number.isFinite(Number(lat.value)) || Math.abs(Number(lat.value)) > 90 || !Number.isFinite(Number(lon.value)) || Math.abs(Number(lon.value)) > 180 || !Number.isFinite(Number(acc.value)) || Number(acc.value) < 1 || Number(acc.value) > 10000) {
      message('请选一个有效地点，或检查高级设置中的坐标和精度。', true); return;
    }
    busy = true; ++geoEpoch; buttons(); el('save-target').textContent = '正在保存…';
    var pick = { lat: Number(lat.value), lon: Number(lon.value), label: selectedLabel || '地图选点' };
    var confirmed = false;
    endpoint('save', { lat: lat.value, lon: lon.value, acc: acc.value }).then(function (r) {
      if (!r.success) throw Error(r.error || '保存失败');
      setSession(r);
      confirmed = true;
      var stored = places.addRecent(pick); renderPlaces();
      message('目标已保存，有效 10 分钟。请到高德核对；未变化时点下方刷新帮助。' + (stored ? '' : ' 最近记录未能存储。'));
    }).catch(function (e) { message('保存未确认：' + e.message + '。请先刷新状态再决定是否重试。', true); })
      .finally(function () { busy = false; originInfo(); if (confirmed) openRefreshShortcut(); });
  };
  el('clear-target').onclick = function () {
    if (busy) return;
    busy = true; ++geoEpoch; buttons(); el('clear-target').textContent = '清除中…';
    var confirmed = false;
    endpoint('clear').then(function (r) {
      if (!r.success) throw Error(r.error || '清除失败');
      confirmed = true;
      setSession({ success: false }); message('目标已清除，后续不再改写。若蓝点仍未恢复，点下方刷新帮助。');
    }).catch(function (e) { message('清除未确认：' + e.message + '。请刷新状态核对。', true); })
      .finally(function () { busy = false; originInfo(); if (confirmed) openRefreshShortcut(); });
  };
  function refreshSession(quiet) {
    if (busy) return;
    busy = true; buttons();
    endpoint('query').then(setSession).catch(function () { if (!quiet) message('状态查询失败，请检查小火箭连接。', true); })
      .finally(function () { busy = false; buttons(); });
  }
  el('refresh-session').onclick = function () { refreshSession(false); };
  if (document.addEventListener) document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refreshSession(true); });
  if (window.addEventListener) window.addEventListener('pageshow', function (event) { if (event.persisted) refreshSession(true); });
  el('refresh-guide').onclick = function () { el('refresh-help').open = true; el('refresh-help').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  el('place-search').onsubmit = function (event) {
    event.preventDefault();
    var q = el('place-query').value.trim(), output = el('search-results'), direct = places.parseCoordinates(q);
    if (direct) { choose(Object.assign({ label: '坐标选点' }, direct)); return; }
    if (!q) return;
    var version = ++searchVersion;
    var local = places.favorites().concat(places.recents()).filter(function (p) { return p.label.toLowerCase().indexOf(q.toLowerCase()) !== -1; });
    output.textContent = ''; output.hidden = false;
    function results(items) {
      items.forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'search-result'; b.textContent = p.label;
        if (p.address) { var sub = document.createElement('small'); sub.textContent = p.address; b.appendChild(sub); }
        b.onclick = function () { choose(p); }; output.appendChild(b);
      });
    }
    if (local.length) results(local);
    if (Date.now() - lastSearch < 2000) {
      el('search-submit').disabled = false;
      if (!local.length) { var wait = document.createElement('p'); wait.textContent = '请稍候再查找，或直接在地图选点。'; output.appendChild(wait); }
      return;
    }
    lastSearch = Date.now();
    var hint = document.createElement('p'); hint.textContent = '正在查找地点…'; output.appendChild(hint);
    el('search-submit').disabled = true;
    var searchRequest = api.search
      ? api.search(q).then(function (items) { return { success: true, places: items }; }).catch(function () { return endpoint('search', { q: q }); })
      : endpoint('search', { q: q });
    searchRequest.then(function (r) {
      if (version !== searchVersion) return;
      hint.remove();
      if (!r.success) throw Error(r.error || '搜索失败');
      results(r.places);
      if (!r.places.length && !local.length) { var empty = document.createElement('p'); empty.textContent = '未找到地点。试试“城市 + 地标”，或直接拖动地图。'; output.appendChild(empty); }
    }).catch(function () {
      if (version !== searchVersion) return;
      hint.textContent = '在线查找暂不可用。仍可使用常用地点、城市按钮或粘贴 WGS-84 坐标。';
      if (!hint.parentNode) output.appendChild(hint);
    }).finally(function () { if (version === searchVersion) el('search-submit').disabled = false; });
  };
  originInfo(); renderPlaces(); tick(); setInterval(tick, 1000);
  var origin = places.origin();
  if (!active() && origin && !api.state().selected) api.center(origin.lat, origin.lon, 16, false);
  if (!active() && !origin) recordOrigin(false);
})();
