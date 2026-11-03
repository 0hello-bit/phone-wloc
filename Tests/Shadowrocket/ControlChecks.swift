import Foundation
import JavaScriptCore
let script = try String(contentsOfFile: FileManager.default.currentDirectoryPath + "/dist/phone-wloc-settings.js", encoding: .utf8)
let c = JSContext()!
c.evaluateScript("var store={};var failWrite=false;var response;var $request={url:''};var $persistentStore={read:k=>store[k]||null,write:(v,k)=>{if(failWrite)return false;store[k]=v;return true}};var $done=r=>response=r;function check(ok,msg){if(!ok)throw Error(msg)};")
func run(_ query: String, _ assertion: String) {
    c.exception = nil
    c.objectForKeyedSubscript("$request")!.setObject("https://gs-loc.apple.com/wloc-settings/save" + query, forKeyedSubscript: "url" as NSString)
    c.evaluateScript(script)
    c.evaluateScript(assertion)
    if let e = c.exception { fatalError(e.toString()) }
}
run("?action=panel", "check(response.response.body.includes('手机定位'),'panel');check(response.response.headers['Content-Type'].includes('text/html'),'HTML')")
run("?lat=0&lon=0&acc=25", "check(JSON.parse(response.response.body).success,'zero save')")
run("?action=query", "check(JSON.parse(response.response.body).latitude===0,'zero query')")
run("?lat=91&lon=1", "check(!JSON.parse(response.response.body).success,'range validation');check(JSON.parse(store.wloc_settings).latitude===0,'preserve previous')")
run("?lat=23abc&lon=1", "check(!JSON.parse(response.response.body).success,'reject partial number')")
run("?lat=12.3456&lon=98.7654&ui=1", "check(response.response.body.includes('目标已保存'),'HTML feedback');check(JSON.parse(store.wloc_settings).longitude===98.7654,'persist')")
c.evaluateScript("failWrite=true")
run("?action=clear", "check(!JSON.parse(response.response.body).success,'report write failure')")
c.evaluateScript("failWrite=false")
run("?action=clear&ui=1", "check(response.response.body.includes('目标已清除'),'clear feedback');check(JSON.parse(store.wloc_settings)===null,'clear persisted')")
run("?action=query", "check(!JSON.parse(response.response.body).success,'empty query')")
print("9 control-page checks passed in Apple JavaScriptCore")
