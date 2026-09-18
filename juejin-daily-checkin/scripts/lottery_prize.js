(()=>{
// 抓取免费抽奖结果弹窗文案（奖品名）。2026-09-17 实测命中：
// 「恭喜抽中90矿石 本次抽中的矿石已累加到你的当前矿石数中 收下奖励」
// 返回对象（非裸字符串），避免 agent-browser 对字符串再做一层 JSON 序列化导致双重引号。
const el=document.querySelector('.lottery-modal,.lottery-result,.result-modal,.dialog-content,.modal-body');
return {prize: el ? el.innerText.replace(/\s+/g,' ').trim() : ''};
})()
