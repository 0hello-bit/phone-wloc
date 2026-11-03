(function(){
var source=$persistentStore.read('phone_wloc_control_amap_v1');
if(source){try{eval(source);return;}catch(_){}}
$done({response:{status:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({success:false,error:'Local control page unavailable; restore previous local script.'})}});
})();