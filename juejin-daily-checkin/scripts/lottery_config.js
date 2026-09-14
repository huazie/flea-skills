(async()=>{
const r=await fetch('https://api.juejin.cn/growth_api/v1/lottery_config/get',{credentials:'include'});
return await r.json();
})()