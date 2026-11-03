(function () {
  'use strict';
  window.createAMapPicker = function (config) {
    var instance = null, pending = { point: config.center, zoom: config.zoom }, failed = false, timer;
    window._AMapSecurityConfig = { securityJsCode: config.securityJsCode || '' };
    function point(p) { return { lat: p.getLat(), lon: p.getLng() }; }
    function error() {
      if (failed) return;
      failed = true; clearTimeout(timer);
      config.onError('高清地图加载失败，已切换备用底图。');
    }
    function start() {
      if (failed) return;
      try {
        instance = new window.AMap.Map(config.host, {
          viewMode: '2D', center: pending.point, zoom: pending.zoom, zooms: [3, 20],
          resizeEnable: true, dragEnable: true, zoomEnable: true, touchZoom: true,
          doubleClickZoom: true, rotateEnable: false, pitchEnable: false,
          showLabel: true, isHotspot: true, showBuildingBlock: true,
          features: ['bg', 'road', 'building', 'point']
        });
        instance.on('complete', function () { if (!failed) { clearTimeout(timer); config.onReady(); } });
        instance.on('error', error);
        instance.on('dragend', function () { config.onView(point(instance.getCenter()), instance.getZoom(), true); });
        instance.on('zoomend', function () { config.onView(point(instance.getCenter()), instance.getZoom(), false); });
        instance.on('click', function (event) {
          if (!event.lnglat) return;
          instance.setCenter(event.lnglat); config.onPick(point(event.lnglat), '');
        });
        instance.on('hotspotclick', function (event) {
          if (!event.lnglat) return;
          instance.setCenter(event.lnglat); config.onPick(point(event.lnglat), String(event.name || '地图地标'));
        });
      } catch (_) { error(); }
    }
    timer = setTimeout(error, 20000);
    if (window.AMap && window.AMap.Map) start();
    else {
      window.__phoneAMapReady = function () { start(); };
      var script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(config.key) + '&callback=__phoneAMapReady';
      script.onerror = error; document.head.appendChild(script);
    }
    return {
      get map() { return instance; },
      center: function (lon, lat, zoom) {
        pending = { point: [lon, lat], zoom: zoom };
        if (instance) instance.setZoomAndCenter(zoom, pending.point);
      },
      search: function (query) {
        return new Promise(function (resolve, reject) {
          if (!instance || failed || !window.AMap.plugin) { reject(Error('地图尚未就绪')); return; }
          var timeout = setTimeout(function () { reject(Error('地点搜索超时')); }, 10000);
          window.AMap.plugin('AMap.PlaceSearch', function () {
            try {
              var search = new window.AMap.PlaceSearch({ pageSize: 5, pageIndex: 1, extensions: 'base' });
              search.search(query, function (status, result) {
                clearTimeout(timeout);
                if (status === 'no_data') { resolve([]); return; }
                if (status !== 'complete' || !result.poiList) { reject(Error('地点搜索暂不可用')); return; }
                resolve(result.poiList.pois.filter(function (p) { return p.location; }).map(function (p) {
                  var location = point(p.location);
                  return { lat: location.lat, lon: location.lon, label: p.name, address: [p.cityname, p.adname, p.address].filter(Boolean).join(' · ') };
                }));
              });
            } catch (e) { clearTimeout(timeout); reject(e); }
          });
        });
      },
      resize: function () { if (instance && typeof instance.resize === 'function') instance.resize(); }
    };
  };
})();
