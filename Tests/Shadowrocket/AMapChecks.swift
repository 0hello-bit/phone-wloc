import Foundation
import JavaScriptCore
let c=JSContext()!
func run(_ s:String){c.exception=nil;c.evaluateScript(s);if let e=c.exception{print("FAIL: "+e.toString());exit(1)}}
run("""
var events={},options,created=0,chosen,failed;
function FakeMap(host,opts){created++;options=opts;this.on=(name,fn)=>events[name]=fn;this.setZoomAndCenter=(z,p)=>{this.z=z;this.p=p};this.setCenter=p=>this.p=p;this.getZoom=()=>this.z||16;this.getCenter=()=>({getLat:()=>23,getLng:()=>113});this.destroy=()=>{};this.resize=()=>{}}
var window={AMap:{Map:FakeMap}};
var document={createElement:()=>({}),head:{appendChild:function(){}}};
function setTimeout(){return 1}function clearTimeout(){}
function check(x,m){if(!x)throw Error(m)}
""")
let path="Shadowrocket/Control/amap.js"
guard FileManager.default.fileExists(atPath:path) else{print("FAIL: official vector map adapter is missing");exit(1)}
run(try String(contentsOfFile:path,encoding:.utf8))
run("""
var picker=window.createAMapPicker({key:'test',securityJsCode:'private',host:'vector-map',center:[113,23],zoom:16,onPick:(p,label)=>chosen={point:p,label:label},onView:()=>{},onReady:()=>{},onError:e=>failed=e});
check(created===1,'SDK map constructed');
check(options.touchZoom===true&&options.zoomEnable===true,'native pinch zoom enabled');
check(options.showLabel===true&&options.isHotspot===true&&options.features.includes('point'),'POI labels enabled');
picker.center(114,24,18);check(picker.map.p[0]===114&&picker.map.z===18,'coordinate order and programmatic center');
events.hotspotclick({lnglat:{getLng:()=>113.3,getLat:()=>23.1},name:'Landmark'});
check(chosen.label==='Landmark'&&chosen.point.lon===113.3&&chosen.point.lat===23.1,'clickable POI retains exact name and coordinates');
check(window._AMapSecurityConfig.securityJsCode==='private','security code supplied before SDK setup');
""")
print("AMap checks passed: pinch configuration, POI labels, native coordinates, map centering and security config")
