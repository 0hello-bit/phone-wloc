(function () {
  'use strict';
  // Reloading a successful save must not issue that save again and renew its deadline.
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', '/wloc-settings/save?action=panel');
  }
  var map = document.getElementById('map');
  var tiles = document.getElementById('tiles');
  var latInput = document.querySelector('[name="lat"]');
  var lonInput = document.querySelector('[name="lon"]');
  var status = document.getElementById('map-status');
  var latitude = Number(latInput.value || 23.1291);
  var longitude = Number(lonInput.value || 113.2644);
  var zoom = 13;
  var loaded = 0;
  var generation = 0;
  var tileNodes = {};
  var gesture;
  var selected = latInput.value !== '' && lonInput.value !== '';
  var vector = null;
  var vectorHost = document.getElementById('vector-map');
  var mapConfig = window.phoneAMapConfig || {};
  var provider = mapConfig.key ? 'amap' : 'gaode';
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function wrap(lon) { return ((lon + 180) % 360 + 360) % 360 - 180; }
  function project(lat, lon, z) {
    var size = 256 * Math.pow(2, z);
    var sin = Math.sin(clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180);
    return { x: (lon + 180) / 360 * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
  }
  function unproject(x, y, z) {
    var size = 256 * Math.pow(2, z);
    var n = Math.PI * (1 - 2 * clamp(y, 0, size) / size);
    return { lat: Math.atan(Math.sinh(n)) * 180 / Math.PI, lon: wrap(x / size * 360 - 180) };
  }
  // Keep saved coordinates WGS-84; only the Gaode raster map uses GCJ-02.
  function toGCJ(lat, lon) {
    if (lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271) return { lat: lat, lon: lon };
    var x = lon - 105, y = lat - 35, pi = Math.PI;
    var dy = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
    dy += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
    dy += (20*Math.sin(y*pi) + 40*Math.sin(y/3*pi))*2/3;
    dy += (160*Math.sin(y/12*pi) + 320*Math.sin(y*pi/30))*2/3;
    var dx = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
    dx += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
    dx += (20*Math.sin(x*pi) + 40*Math.sin(x/3*pi))*2/3;
    dx += (150*Math.sin(x/12*pi) + 300*Math.sin(x/30*pi))*2/3;
    var rad = lat*pi/180, magic = 1 - 0.00669342162296594323*Math.pow(Math.sin(rad), 2);
    return { lat: lat + dy*180/((6378245*(1-0.00669342162296594323))/(magic*Math.sqrt(magic))*pi), lon: lon + dx*180/(6378245/Math.sqrt(magic)*Math.cos(rad)*pi) };
  }
  function fromGCJ(lat, lon) {
    var guess = { lat: lat, lon: lon };
    for (var i=0;i<8;i++) { var f=toGCJ(guess.lat,guess.lon);guess.lat-=f.lat-lat;guess.lon-=f.lon-lon; }
    return guess;
  }
  function mapProject(lat, lon, z) {
    var p = provider !== 'osm' ? toGCJ(lat, lon) : { lat: lat, lon: lon };
    return project(p.lat, p.lon, z);
  }
  function mapUnproject(x, y, z) {
    var p = unproject(x, y, z);
    return provider !== 'osm' ? fromGCJ(p.lat, p.lon) : p;
  }
  function updateInputs() {
    latInput.value = latitude.toFixed(6);
    lonInput.value = longitude.toFixed(6);
    selected = true;
    if (window.onWlocPick) window.onWlocPick(latitude, longitude);
    document.getElementById('picked').textContent = '已选地图中心：' + latInput.value + ', ' + lonInput.value;
    document.getElementById('save-target').disabled = false;
  }
  function draw() {
    if (vectorHost) vectorHost.style.display = provider === 'amap' ? 'block' : 'none';
    tiles.style.display = provider === 'amap' ? 'none' : 'block';
    if (provider === 'amap') {
      var gcj = toGCJ(latitude, longitude);
      if (vector) vector.center(gcj.lon, gcj.lat, zoom);
      document.getElementById('zoom-level').textContent = '缩放 ' + Math.round(zoom);
      return;
    }
    var rect = map.getBoundingClientRect();
    var p = mapProject(latitude, longitude, zoom);
    var left = p.x - rect.width / 2;
    var top = p.y - rect.height / 2;
    var count = Math.pow(2, zoom);
    var needed = {};
    var current = ++generation;
    loaded = 0;
    status.textContent = '正在加载地图…';
    for (var x = Math.floor(left / 256); x <= Math.floor((left + rect.width) / 256); x++) {
      for (var y = Math.floor(top / 256); y <= Math.floor((top + rect.height) / 256); y++) {
        if (y < 0 || y >= count) continue;
        var tileX = ((x % count + count) % count);
        var key = provider + '/' + zoom + '/' + tileX + '/' + y;
        needed[key] = true;
        var img = tileNodes[key];
        if (!img) {
          img = document.createElement('img');
          img.alt = '';
          img.draggable = false;
          img.decoding = 'async';
          img.src = provider === 'gaode'
            ? 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x=' + tileX + '&y=' + y + '&z=' + zoom
            : 'https://tile.openstreetmap.org/' + zoom + '/' + tileX + '/' + y + '.png';
          tileNodes[key] = img;
          tiles.appendChild(img);
        }
        img.style.left = Math.round(x * 256 - left) + 'px';
        img.style.top = Math.round(y * 256 - top) + 'px';
        (function (tile, drawId) {
          function done() {
            if (generation !== drawId) return;
            if (tile.naturalWidth) {
              loaded++;
              status.textContent = '地图已显示 · 拖动或点选位置';
            } else if (!loaded) {
              status.textContent = '底图未加载成功，请检查网络；也可手动输入坐标。';
            }
          }
          tile.onload = done;
          tile.onerror = done;
          if (tile.complete) done();
        })(img, current);
      }
    }
    Object.keys(tileNodes).forEach(function (key) {
      if (!needed[key]) { tileNodes[key].remove(); delete tileNodes[key]; }
    });
    document.getElementById('zoom-level').textContent = '缩放 ' + zoom;
  }
  function center(lat, lon, z, pick) {
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) return;
    latitude = clamp(lat, -85.05112878, 85.05112878);
    longitude = wrap(lon);
    if (z != null) zoom = clamp(z, 2, provider === 'amap' ? 20 : 19);
    if (pick) updateInputs();
    draw();
  }
  map.addEventListener('pointerdown', function (event) {
    if (provider === 'amap' || event.target.closest('button,a') || gesture || !loaded) return;
    event.preventDefault();
    map.setPointerCapture(event.pointerId);
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, center: mapProject(latitude, longitude, zoom) };
  });
  map.addEventListener('pointermove', function (event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    var dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    tiles.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  map.addEventListener('pointerup', function (event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    var start = gesture;
    gesture = null;
    tiles.style.transform = '';
    var dx = event.clientX - start.x, dy = event.clientY - start.y;
    var p;
    if (Math.abs(dx) + Math.abs(dy) < 8) {
      var r = map.getBoundingClientRect();
      p = mapUnproject(start.center.x + event.clientX - r.left - r.width / 2, start.center.y + event.clientY - r.top - r.height / 2, zoom);
    } else {
      p = mapUnproject(start.center.x - dx, start.center.y - dy, zoom);
    }
    center(p.lat, p.lon, null, true);
  });
  map.addEventListener('pointercancel', function () { gesture = null; tiles.style.transform = ''; });
  document.getElementById('zoom-in').onclick = function () { center(latitude, longitude, zoom + 1, false); };
  document.getElementById('zoom-out').onclick = function () { center(latitude, longitude, zoom - 1, false); };
  document.getElementById('pick-center').onclick = function () { if (loaded) updateInputs(); };
  document.getElementById('show-coordinates').onclick = function () { center(Number(latInput.value), Number(lonInput.value), 15, false); };
  document.getElementById('map-source').onchange = function () {
    provider = this.value;
    if (provider === 'amap' && !mapConfig.key) provider = this.value = 'gaode';
    if (provider === 'amap' && !vector) startVector();
    var attribution = document.getElementById('map-attribution');
    attribution.textContent = provider !== 'osm' ? '© 高德地图 · 自动转换坐标' : '© OpenStreetMap';
    attribution.href = provider !== 'osm' ? 'https://www.amap.com/' : 'https://www.openstreetmap.org/copyright';
    draw();
  };
  document.querySelectorAll('[data-place]').forEach(function (button) {
    button.onclick = function () { var p = button.dataset.place.split(',').map(Number); center(p[0], p[1], 13, true); };
  });
  [latInput, lonInput].forEach(function (input) {
    input.addEventListener('input', function () {
      selected = true;
      document.getElementById('picked').textContent = '手动输入坐标；点“在地图显示”核对位置。';
      document.getElementById('save-target').disabled = false;
    });
  });
  function startVector() {
    if (!mapConfig.key || !window.createAMapPicker) return;
    var gcj = toGCJ(latitude, longitude);
    vector = window.createAMapPicker({ key: mapConfig.key, securityJsCode: mapConfig.securityJsCode,
      host: 'vector-map', center: [gcj.lon, gcj.lat], zoom: zoom,
      onReady: function () { loaded = 1; status.textContent = '高清地图 · 双指缩放，轻点地标选点'; },
      onView: function (gcj, z, pick) {
        if (provider !== 'amap') return;
        var p = fromGCJ(gcj.lat, gcj.lon); latitude = p.lat; longitude = p.lon; zoom = z;
        document.getElementById('zoom-level').textContent = '缩放 ' + Math.round(zoom);
        if (pick || selected) updateInputs();
      },
      onPick: function (gcj, name) {
        if (provider !== 'amap') return;
        var p = fromGCJ(gcj.lat, gcj.lon); latitude = p.lat; longitude = p.lon;
        updateInputs();
        if (name && window.onWlocNamedPick) window.onWlocNamedPick(name, latitude, longitude);
      },
      onError: function (reason) {
        provider = 'gaode'; document.getElementById('map-source').value = provider;
        draw();
        var feedback = document.getElementById('feedback');
        if (feedback) { var note = document.createElement('p'); note.className = 'notice error'; note.textContent = reason; feedback.appendChild(note); }
      }
    });
  }
  document.getElementById('map-source').value = provider;
  if (provider === 'amap') startVector();
  window.addEventListener('resize', function () { if (provider === 'amap' && vector) vector.resize(); else draw(); });
  window.wlocMap = {
    center: center,
    state: function () { return { lat: latitude, lon: longitude, selected: selected }; },
    search: function (query) {
      if (provider !== 'amap' || !vector) return Promise.reject(Error('高清地图尚未就绪'));
      return vector.search(query).then(function (items) { return items.map(function (item) {
        var p = fromGCJ(item.lat, item.lon);
        return { lat: p.lat, lon: p.lon, label: item.label, address: item.address };
      }); });
    }
  };
  if (selected) updateInputs();
  draw();
})();
