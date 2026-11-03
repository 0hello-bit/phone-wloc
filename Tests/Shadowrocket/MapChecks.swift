import Foundation
import JavaScriptCore

let context = JSContext()!
context.evaluateScript("""
var elements={};
function node(id){return elements[id]||(elements[id]={id:id,value:'',textContent:'',style:{},dataset:{},handlers:{},children:[],complete:true,naturalWidth:256,
 addEventListener:function(k,f){this.handlers[k]=f},getBoundingClientRect:function(){return {left:10,top:20,width:320,height:290}},
 setPointerCapture:function(){},appendChild:function(c){this.children.push(c)},remove:function(){}})}
var cities=['23.1291,113.2644','31.2304,121.4737','39.9042,116.4074'].map(function(p,i){var n=node('city'+i);n.dataset.place=p;return n});
var document={getElementById:node,querySelector:function(s){return node(s)},querySelectorAll:function(){return cities},createElement:function(){return {style:{},complete:true,naturalWidth:256,remove:function(){}}}};
var navigations=[];var window={addEventListener:function(){},history:{replaceState:function(state,title,url){navigations.push(url)}}};
function assert(ok,msg){if(!ok)throw Error(msg)}
function approx(a,b){return Math.abs(a-b)<1e-7}
""")
var source = try String(contentsOfFile: "Shadowrocket/Control/map.js", encoding: .utf8)
source = source.replacingOccurrences(of: "  draw();\n})();", with: "  window.testMap={project:project,unproject:unproject,mapProject:mapProject,mapUnproject:mapUnproject,toGCJ:toGCJ,fromGCJ:fromGCJ,center:center,state:function(){return {lat:latitude,lon:longitude,zoom:zoom,loaded:loaded}}};\n  draw();\n})();")
context.evaluateScript(source)
context.evaluateScript("""
var api=window.testMap;
assert(navigations.length===1&&navigations[0]==='/wloc-settings/save?action=panel','refresh must return to panel instead of resubmitting a timed save');
var fixture=api.toGCJ(39.908823,116.397470);assert(Math.abs(fixture.lat-39.910226)<0.000003&&Math.abs(fixture.lon-116.403714)<0.000003,'known GCJ fixture');
var inverse=api.fromGCJ(fixture.lat,fixture.lon);assert(approx(inverse.lat,39.908823)&&approx(inverse.lon,116.397470),'GCJ inverse');
var outside=api.toGCJ(51.5074,-0.1278);assert(outside.lat===51.5074&&outside.lon===-0.1278,'outside China preserved');
assert(api.state().loaded>0,'tile load state');
[[0,0],[23.1291,113.2644],[31.2304,121.4737],[-33.8688,151.2093],[80,-179.9]].forEach(function(p){
 [2,13,19].forEach(function(z){var xy=api.project(p[0],p[1],z),r=api.unproject(xy.x,xy.y,z);assert(approx(p[0],r.lat)&&approx(p[1],r.lon),'projection round trip')})
});
assert(approx(api.unproject(256*4,512,2).lon,-180),'longitude wrapping');
cities[1].onclick();
assert(node('[name="lat"]').value==='31.230400'&&node('[name="lon"]').value==='121.473700','city picks WGS-84');
var old=api.state();node('zoom-in').onclick();assert(api.state().zoom===old.zoom+1&&api.state().lat===old.lat,'zoom preserves target');
var map=node('map');var start=api.mapProject(api.state().lat,api.state().lon,api.state().zoom);
var expected=api.mapUnproject(start.x+30,start.y+15,api.state().zoom);
var target={closest:function(){return false}};
map.handlers.pointerdown({target:target,pointerId:1,clientX:200,clientY:180,preventDefault:function(){}});
map.handlers.pointerup({pointerId:1,clientX:200,clientY:180});
assert(Math.abs(Number(node('[name="lat"]').value)-expected.lat)<0.000001,'tap latitude');
assert(Math.abs(Number(node('[name="lon"]').value)-expected.lon)<0.000001,'tap longitude');
var before=api.state();var center=api.mapProject(before.lat,before.lon,before.zoom);expected=api.mapUnproject(center.x-60,center.y+40,before.zoom);
map.handlers.pointerdown({target:target,pointerId:2,clientX:180,clientY:160,preventDefault:function(){}});
map.handlers.pointermove({pointerId:2,clientX:240,clientY:120});map.handlers.pointerup({pointerId:2,clientX:240,clientY:120});
assert(Math.abs(api.state().lat-expected.lat)<0.000001&&Math.abs(api.state().lon-expected.lon)<0.000001,'drag updates map center');
before=api.state();map.handlers.pointerdown({target:target,pointerId:3,clientX:180,clientY:160,preventDefault:function(){}});map.handlers.pointercancel();
assert(api.state().lat===before.lat&&api.state().lon===before.lon,'cancel preserves location');
before=api.state();api.center(NaN,100,13,true);assert(api.state().lat===before.lat,'invalid coordinate ignored');
assert(node('save-target').disabled===false,'map selection enables save');
""")
if let error = context.exception { fatalError(error.toString()) }
print("Map checks passed: projection, world wrap, tap, drag, cancellation, zoom, input and save state")
