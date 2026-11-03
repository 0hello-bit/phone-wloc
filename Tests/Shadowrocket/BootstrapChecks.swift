import Foundation
import JavaScriptCore

let context = JSContext()!
func run(_ source: String) {
    context.exception = nil
    context.evaluateScript(source)
    if let error = context.exception { print("FAIL: " + error.toString()); exit(1) }
}
let bundled = try String(contentsOfFile: "dist/phone-wloc-settings.js", encoding: .utf8)
let bootstrap = try String(contentsOfFile: "dist/phone-wloc-bootstrap.js", encoding: .utf8)
let loader = try String(contentsOfFile: "Shadowrocket/phone-wloc-amap.js", encoding: .utf8)
run("var store={},response; var $request={url:'https://gs-loc.apple.com/wloc-settings/save?action=panel'}; var $persistentStore={read:k=>store[k]||null,write:(v,k)=>{store[k]=v;return true}}; var $done=r=>response=r; function check(x,m){if(!x)throw Error(m)}")
run(loader)
run("check(response.response.status===500,'empty loader cache is an explicit failure')")
run(bootstrap)
run("check(response.response.status===200,'bootstrap reports persisted cache')")
guard context.objectForKeyedSubscript("store")!.objectForKeyedSubscript("phone_wloc_control_amap_v1")!.toString() == bundled else {
    print("FAIL: bootstrap cache differs from standalone source"); exit(1)
}
run(loader)
run("check(response.response.status===200&&response.response.body.includes('手机定位'),'bootstrapped loader renders actual control page')")
run("store.phone_wloc_control_amap_v1='throw Error(123)'")
run(loader)
run("check(response.response.status===500,'corrupt cache fails explicitly')")
run("$persistentStore.write=()=>false")
run(bootstrap)
run("check(response.response.status===500,'failed cache write is reported')")
print("Bootstrap checks passed: empty cache, exact source, rendered page, corrupt cache, write failure")
