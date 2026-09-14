(()=>{
const items=[...document.querySelectorAll('.turntable-item.lottery')];
const free=items.find(e=>/免费/.test(e.textContent)&&!/十连抽/.test(e.textContent));
if(!free){return {clicked:false,reason:'no_free_button'};}
free.click(); // 免费按钮；"十连抽"会消耗 2000 矿石，严禁点错
return {clicked:true,text:free.textContent.trim()};
})()