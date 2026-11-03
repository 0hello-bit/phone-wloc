import Foundation
import JavaScriptCore
let source = try String(contentsOfFile:".private-build/phone-wloc-response.js",encoding:.utf8)
func verify(_ now: Int, _ saved: String, _ active: Bool, _ failWrite: Bool = false) {
 let c=JSContext()!
 c.evaluateScript("""
 var response,logs=[];
 var console={log:(...x)=>logs.push(x.join(' '))};
 var $rocket={},now=\(now);Date.now=()=>now;
 var saved=\(saved),failWrite=\(failWrite ? "true":"false");
 var $persistentStore={read:k=>saved,write:(v,k)=>{if(failWrite)return false;saved=v;return true}};
 var $request={url:'https://gs-loc.apple.com/clls/wloc'};
 function v(n){var a=[];do{var b=n%128;n=Math.floor(n/128);a.push(b+(n?128:0))}while(n);return a}
 function bytes(field,a){return v(field*8+2).concat(v(a.length),a)}
 var location=[8].concat(v(2300000000),[16],v(11300000000),[24,25]);
 var mac=Array.from('aa:bb:cc:dd:ee:ff').map(x=>x.charCodeAt(0));
 var payload=bytes(2,bytes(1,mac).concat(bytes(2,location)));
 var original=[0,0,0,0,0,0,0,0,payload.length>>8,payload.length%256].concat(payload);
 var $response={status:200,headers:{'Content-Type':'application/octet-stream'},bodyBytes:new Uint8Array(original).buffer};
 var $done=r=>response=r;
 function check(x,m){if(!x)throw Error(m)}
 """)
 c.evaluateScript("(function(){\n"+source+"\n})();")
 RunLoop.current.run(until:Date(timeIntervalSinceNow:0.02))
 if let e=c.exception { print("SCRIPT ERROR: "+e.toString());exit(1) }
 c.evaluateScript("""
 var out=response&&response.response;
 var data=out&&(out.bodyBytes||out.body||out.rawBody);
 var arr=data?(data instanceof ArrayBuffer?Array.from(new Uint8Array(data)):Array.from(data)):original;
 var changed=arr.join(',')!==original.join(',');
 check(changed===\(active ? "true":"false"),'response active=\(active) now=\(now) actual='+changed+' logs='+logs.join(' | '));
 if(changed){
  check(arr.join(',').includes([8].concat(v(1234567800),[16],v(9876543200)).join(',')),'binary contains exact selected WGS coordinates: '+arr.join(',')+' logs='+logs.join(' | '));
 }
 """)
 if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
}
let saved="'{\"latitude\":12.345678,\"longitude\":98.765432,\"accuracy\":25,\"startedAt\":1000,\"expiresAt\":601000}'"
verify(600999,saved,true)
verify(601000,saved,false,true)
verify(601001,saved,false)
verify(1000,"null",false)
verify(1000,"'{\"latitude\":12.345678,\"longitude\":98.765432}'",false)
print("Binary response expiry checks passed")
