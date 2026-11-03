import Foundation
import JavaScriptCore
let c=JSContext()!
func run(_ source: String) {
 c.exception=nil
 c.evaluateScript(source)
 if let e=c.exception { print("FAIL: "+e.toString());exit(1) }
}

run("""
var nodes={},values={},saveCalls=0,geoSuccess,failQuery=false,nav=[],listeners={};
function node(id){return nodes[id]||(nodes[id]={value:'',dataset:{},textContent:'',children:[],hidden:false,appendChild:function(n){this.children.push(n);n.parentNode=this},setAttribute:function(){},blur:function(){},focus:function(){},scrollIntoView:function(){},remove:function(){}})}
var document={visibilityState:'visible',getElementById:node,querySelector:node,createElement:()=>node('new'+Math.random()),addEventListener:(k,fn)=>listeners[k]=fn};
var state={lat:31,lon:121,selected:true};
var window={location:{assign:url=>nav.push(url)},addEventListener:(k,fn)=>listeners[k]=fn,localStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v},wlocMap:{state:()=>state,center:function(){}}};
var navigator={geolocation:{getCurrentPosition:ok=>geoSuccess=ok}};
function setInterval(){}function clearInterval(){}function setTimeout(){}function clearTimeout(){}
function AbortController(){this.signal={};this.abort=function(){}}
function URLSearchParams(fields){this.data=fields||{};this.set=(k,v)=>this.data[k]=v;this.toString=()=>Object.keys(this.data).map(k=>k+'='+this.data[k]).join('&')}
function fetch(url){
 var r={success:false};
 if(url.includes('action=save')){saveCalls++;r={success:true,latitude:31,longitude:121,expiresAt:Date.now()+600000}}
 if(url.includes('action=clear'))r={success:true};
 return Promise.resolve({ok:true,json:()=>Promise.resolve(r)});
}
function check(x,m){if(!x)throw Error(m)}
node('session-countdown').dataset.expires='0';
node('[name="lat"]').value='31';node('[name="lon"]').value='121';node('[name="acc"]').value='25';
""")
run(try String(contentsOfFile:"Shadowrocket/Control/places.js",encoding:.utf8))
run(try String(contentsOfFile:"Shadowrocket/Control/experience.js",encoding:.utf8))
run("""
check(typeof geoSuccess==='function','inactive entry requests browser geolocation');
node('target-form').onsubmit({preventDefault:function(){}});
node('target-form').onsubmit({preventDefault:function(){}});
check(saveCalls===1,'duplicate save suppressed');
geoSuccess({coords:{latitude:23,longitude:113,accuracy:10},timestamp:1000});
""")
run("""
check(window.createWlocPlaces(window.localStorage).origin()===null,'late position cannot become origin after save');
check(window.createWlocPlaces(window.localStorage).recents().length===1,'successful save adds one recent');
check(nav.length===1&&nav[0].indexOf('shortcuts://run-shortcut?name=')===0,'successful save launches installed location shortcut');
node('clear-target').onclick();
""")
run("check(node('session-countdown').dataset.expires==='0','manual clear updates countdown without reload')")
run("""
check(nav.length===2,'successful clear launches shortcut');
node('[name="lat"]').value='';node('[name="lon"]').value='';
var beforeFavoriteCount=window.createWlocPlaces(window.localStorage).favorites().length;
node('favorite-name').value='Empty';
node('favorite-confirm').onclick();
check(window.createWlocPlaces(window.localStorage).favorites().length===beforeFavoriteCount,'blank coordinates must not be favorited as zero zero');
node('[name="lat"]').value='31';node('[name="lon"]').value='121';
node('auto-refresh').checked=false;node('auto-refresh').onchange();
var navBefore=nav.length;
""")
run("""
var resolveQuery;
fetch=function(url){
 if(url.includes('action=query'))return new Promise(resolve=>resolveQuery=resolve);
 if(url.includes('action=save'))saveCalls++;
 return Promise.resolve({ok:true,json:()=>Promise.resolve({success:true,latitude:31,longitude:121,expiresAt:Date.now()+600000})});
};
node('refresh-session').onclick();
var beforeRefreshSaveCalls=saveCalls;
node('target-form').onsubmit({preventDefault:function(){}});
check(saveCalls===beforeRefreshSaveCalls,'refresh query is serialized with save');
resolveQuery({ok:true,json:()=>Promise.resolve({success:false})});
""")
run("node('target-form').onsubmit({preventDefault:function(){}})")
run("check(Number(node('session-countdown').dataset.expires)>Date.now(),'save after refresh keeps new deadline')")
run("check(nav.length===navBefore,'disabled automatic shortcut does not navigate')")
run("""
var queryCalls=0;
fetch=function(url){if(url.includes('action=query'))queryCalls++;return Promise.resolve({ok:true,json:()=>Promise.resolve({success:false})});};
check(typeof listeners.visibilitychange==='function','foreground lifecycle refresh is installed');
listeners.visibilitychange();
""")
run("check(queryCalls===1&&node('session-countdown').dataset.expires==='0','returning foreground checks current target without resaving')")
run("""
node('auto-refresh').checked=true;node('auto-refresh').onchange();
fetch=function(){return Promise.resolve({ok:true,json:()=>Promise.resolve({success:false,error:'write failed'})});};
navBefore=nav.length;
node('target-form').onsubmit({preventDefault:function(){}});
""")
run("check(nav.length===navBefore,'failed save must never launch shortcut')")
run("node('clear-target').onclick()")
run("check(nav.length===navBefore,'failed clear must never launch shortcut')")
run("""
var resolveSearch;
window.wlocMap.search=function(){return new Promise(resolve=>resolveSearch=resolve)};
node('place-query').value='Old place';
node('place-search').onsubmit({preventDefault:function(){}});
var resultChildrenBefore=node('search-results').children.length;
node('place-query').value='0, 0';
node('place-search').onsubmit({preventDefault:function(){}});
resolveSearch([{lat:30,lon:120,label:'Late old result'}]);
""")
run("check(node('search-results').children.length===resultChildrenBefore&&node('search-results').hidden,'late search response cannot reopen results after coordinate selection');check(node('search-submit').disabled===false,'selecting coordinates releases search control')")
if let e=c.exception{print("FAIL: "+e.toString());exit(1)}
print("Experience checks passed: entry geolocation guard, duplicate save prevention, late callback, recent storage and clear")
