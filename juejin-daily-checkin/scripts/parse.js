// agent-browser eval 输出双重 JSON 序列化兜底：外层是字符串则再解一层
let s = require('fs').readFileSync(0, 'utf8').trim();
try {
  let a = JSON.parse(s);
  try { console.log(JSON.stringify(JSON.parse(a))); }
  catch (e) { console.log(JSON.stringify(a)); }
} catch (e) { console.log(s); }
