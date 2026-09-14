(async()=>{
const st=await fetch('https://api.juejin.cn/growth_api/v1/get_today_status',{credentials:'include'});
const sj=await st.json();
if(sj.data===true){return {checkin:'already',err_no:sj.err_no};}
const ci=await fetch('https://api.juejin.cn/growth_api/v1/check_in',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});
const cj=await ci.json();
return {checkin:'done',err_no:cj.err_no,msg:cj.err_msg};
})()