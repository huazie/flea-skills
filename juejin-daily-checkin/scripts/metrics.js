(async()=>{
const p=await fetch('https://api.juejin.cn/growth_api/v1/get_cur_point',{credentials:'include'});
const pj=await p.json();
const c=await fetch('https://api.juejin.cn/growth_api/v1/get_counts',{credentials:'include'});
const cj=await c.json();
return {point:pj.data,cont:cj.data.cont_count,sum:cj.data.sum_count};
})()