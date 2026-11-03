import Foundation
import JavaScriptCore
let settings = try String(contentsOfFile: "dist/phone-wloc-settings.js", encoding: .utf8)
let c = JSContext()!
c.evaluateScript("""
var store={},response,failWrite=false,now=1000;
Date.now=()=>now;
var $request={url:''};
var $persistentStore={read:k=>store[k]||null,write:(v,k)=>{if(failWrite)return false;store[k]=v;return true}};
var $done=r=>response=r;
function check(x,m){if(!x)throw Error(m)}
""")
func run(_ query: String, _ assertion: String) {
 c.exception=nil
 c.objectForKeyedSubscript("$request")!.setObject("https://gs-loc.apple.com/wloc-settings/save"+query,forKeyedSubscript:"url" as NSString)
 c.evaluateScript(settings);c.evaluateScript(assertion)
 if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
}
run("?lat=12.345678&lon=98.765432", "check(JSON.parse(store.wloc_settings).expiresAt===601000,'save sets exact 600-second deadline')")
c.evaluateScript("now=600999")
run("?action=query","check(JSON.parse(response.response.body).success,'active immediately before expiry')")
c.evaluateScript("now=601000;failWrite=true")
run("?action=query","check(!JSON.parse(response.response.body).success,'expired at boundary despite write failure')")
c.evaluateScript("failWrite=false")
run("?action=panel","check(response.response.body.includes('未设置目标'),'expired panel is inactive')")
run("?lat=39.9042&lon=116.4074","check(JSON.parse(store.wloc_settings).expiresAt===1201000,'resave renews deadline')")
run("?action=clear","check(JSON.parse(store.wloc_settings)===null,'manual clear cancels')")
c.evaluateScript("store.wloc_settings=JSON.stringify({latitude:1,longitude:2})")
run("?action=query","check(!JSON.parse(response.response.body).success,'legacy no deadline is inactive')")
print("Expiry control checks passed")
