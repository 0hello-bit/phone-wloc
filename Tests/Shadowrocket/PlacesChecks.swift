import Foundation
import JavaScriptCore
let c = JSContext()!
func run(_ source: String) {
 c.exception=nil
 c.evaluateScript(source)
 if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
}

run("""
var window={};var values={};var disk={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};
function check(x,m){if(!x)throw Error(m)}
""")
let file="Shadowrocket/Control/places.js"
guard FileManager.default.fileExists(atPath:file) else { print("FAIL: entry-location and place storage are not implemented");exit(1) }
run(try String(contentsOfFile:file,encoding:.utf8))
run("""
var p=window.createWlocPlaces(disk);
check(p.parseCoordinates('0, 0').lat===0,'zero coordinate accepted');
check(p.parseCoordinates('91, 10')===null,'latitude range');
check(p.parseCoordinates('31.2, 121.4junk')===null,'reject partial number');
check(p.parseCoordinates('Shanghai')===null,'names are not coordinates');
check(!p.recordOrigin({lat:23,lon:113,accuracy:20,time:1000},true,false),'active target cannot become origin');
check(p.origin()===null,'active record leaves no origin');
check(p.recordOrigin({lat:23,lon:113,accuracy:20,time:1000},false,false),'inactive session records entry point');
check(!p.recordOrigin({lat:39,lon:116,accuracy:5,time:2000},false,false),'entry reference is not overwritten');
check(p.origin().lat===23,'preserve initial position');
var reloaded=window.createWlocPlaces(disk);check(reloaded.origin().time===1000,'origin survives reload');
for(var i=0;i<20;i++)p.addRecent({lat:i,lon:100,label:'Place '+i});
check(p.recents().length===8,'recents bounded');
p.addRecent({lat:19,lon:100,label:'Again'});check(p.recents().length===8&&p.recents()[0].label==='Again','deduplicate recents');
check(p.addFavorite({lat:0,lon:0,label:'Zero'}),'favorite created');
check(p.favorites()[0].lat===0,'favorite zero retained');
p.removeFavorite(p.favorites()[0].id);check(p.favorites().length===0,'favorite removed');
var n=p.recents().length;p.addRecent({lat:NaN,lon:Infinity,label:'bad'});check(p.recents().length===n,'reject invalid point');
values['phone-wloc-places-v1']='{broken';check(window.createWlocPlaces(disk).origin()===null,'corrupt store ignored');
var blocked=window.createWlocPlaces({getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}});
check(!blocked.recordOrigin({lat:1,lon:2,accuracy:3,time:4},false,false),'storage failure is reported');
check(blocked.origin()===null,'failed write is not reported as persisted');
""")
if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
print("Places checks passed: guarded entry location, persistence, recents, favorites, validation and storage failure")
