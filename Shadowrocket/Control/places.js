(function () {
  'use strict';
  window.createWlocPlaces = function (storage) {
    var key = 'phone-wloc-places-v1';
    function valid(p) {
      return p && typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90
        && typeof p.lon === 'number' && Number.isFinite(p.lon) && Math.abs(p.lon) <= 180;
    }
    function point(p) {
      return { lat: p.lat, lon: p.lon, label: String(p.label || '地图选点').slice(0, 80),
        id: p.lat.toFixed(6) + ',' + p.lon.toFixed(6) };
    }
    var data = { origin: null, recent: [], favorites: [] };
    try {
      var saved = JSON.parse(storage.getItem(key) || 'null');
      if (saved) {
        if (valid(saved.origin) && Number.isFinite(saved.origin.time) && Number.isFinite(saved.origin.accuracy)) data.origin = saved.origin;
        ['recent', 'favorites'].forEach(function (list) {
          if (Array.isArray(saved[list])) data[list] = saved[list].filter(valid).slice(0, list === 'recent' ? 8 : 20).map(point);
        });
      }
    } catch (_) {}
    function commit(next) {
      try { storage.setItem(key, JSON.stringify(next)); data = next; return true; } catch (_) { return false; }
    }
    function add(list, p, limit) {
      if (!valid(p)) return false;
      var clean = point(p), next = Object.assign({}, data);
      next[list] = [clean].concat(data[list].filter(function (old) { return old.id !== clean.id; })).slice(0, limit);
      return commit(next);
    }
    return {
      origin: function () { return data.origin && Object.assign({}, data.origin); },
      recents: function () { return data.recent.slice(); },
      favorites: function () { return data.favorites.slice(); },
      recordOrigin: function (p, active, replace) {
        if (active || !valid(p) || !Number.isFinite(p.time) || !Number.isFinite(p.accuracy) || p.accuracy < 0 || (data.origin && !replace)) return false;
        return commit(Object.assign({}, data, { origin: { lat: p.lat, lon: p.lon, time: p.time, accuracy: p.accuracy } }));
      },
      addRecent: function (p) { return add('recent', p, 8); },
      addFavorite: function (p) { return add('favorites', p, 20); },
      removeFavorite: function (id) {
        return commit(Object.assign({}, data, { favorites: data.favorites.filter(function (p) { return p.id !== id; }) }));
      },
      parseCoordinates: function (text) {
        var m = String(text).trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[,，]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
        if (!m) return null;
        var p = { lat: Number(m[1]), lon: Number(m[2]) };
        return valid(p) ? p : null;
      }
    };
  };
})();
