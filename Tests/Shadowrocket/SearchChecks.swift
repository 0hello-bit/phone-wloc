import Foundation
import JavaScriptCore
let c=JSContext()!
func run(_ source: String) {
 c.exception=nil
 c.evaluateScript(source)
 if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
}

run("""
var response,requestOptions,calls=0,httpError=null,httpStatus=200;
var features=[{geometry:{coordinates:[113.319,23.106]},properties:{name:'Guangzhou Tower',city:'Guangzhou'}},{geometry:{coordinates:[999,99]},properties:{name:'invalid'}}];
var payload=JSON.stringify({features:features});
var $request={url:'https://gs-loc.apple.com/wloc-settings/save?action=search&q=Guangzhou%20Tower%26x%3D1'};
var $persistentStore={read:()=>null,write:()=>true};
var $httpClient={get:(o,cb)=>{calls++;requestOptions=o;cb(httpError,{status:httpStatus},payload)}};
var $done:r=>response=r;
function check(x,m){if(!x)throw Error(m)}
""".replacingOccurrences(of:"var $done:r=>",with:"var $done=r=>"))
let source=try String(contentsOfFile:"dist/phone-wloc-settings.js",encoding:.utf8)
run(source)
run("""
var result=JSON.parse(response.response.body);
check(result.success&&result.places.length===1,'normalize real search response and filter invalid point');
check(result.places[0].lat===23.106&&result.places[0].lon===113.319,'GeoJSON longitude latitude ordering');
check(requestOptions.url.indexOf('https://photon.komoot.io/api/?')===0,'fixed trusted search host');
check(requestOptions.url.includes('Guangzhou%20Tower%26x%3D1'),'encode search input');
""")
if let e=c.exception{print("FAIL: "+e.toString());exit(1)}
run("httpStatus=503")
run(source)
run("check(!JSON.parse(response.response.body).success,'upstream failure reported')")
run("httpStatus=200;payload='not-json'")
run(source)
run("check(!JSON.parse(response.response.body).success,'malformed search response reported')")
run("$request.url='https://gs-loc.apple.com/wloc-settings/save?action=search&q=';var before=calls")
run(source)
run("check(!JSON.parse(response.response.body).success&&before===calls,'empty query does not call upstream')")
if let e=c.exception{print("FAIL: "+e.toString());exit(1)}
print("Search checks passed: coordinate normalization, fixed host, escaping, errors and empty query")
