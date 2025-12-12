const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. 原有的静态资源服务 ---
app.use(express.static(path.join(__dirname)));

// Serve libs from node_modules (保持你们团队原有的医学影像库路由)
app.get('/lib/vtk.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'vtk.js', 'dist', 'vtk.js'));
});
app.get('/lib/dicomParser.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'dicom-parser', 'dist', 'dicomParser.min.js'));
});
app.get('/lib/cornerstone.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'cornerstone-core', 'dist', 'cornerstone.min.js'));
});
app.get('/lib/cornerstoneWADOImageLoader.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'cornerstone-wado-image-loader', 'dist', 'cornerstoneWADOImageLoader.min.js'));
});

// 简易症状找药接口（支持前端 yiliao.html 的 POST 请求）
let drugDataset = null;
function loadDrugDataset(){
  if (drugDataset) return drugDataset;
  const p = path.join(__dirname, 'drug-dataset.json');
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(raw);
    const list = Array.isArray(obj['症状列表']) ? obj['症状列表'] : [];
    drugDataset = list.map((item)=>({
      symptom: String(item.symptom || '').toLowerCase(),
      description: String(item.description || ''),
      drugs: Array.isArray(item.drugs) ? item.drugs.map(d=>({
        id: d.id,
        name: d.name,
        desc: d.desc,
        usage: d.usage,
        price: d.price,
        taboo: d.taboo,
        attention: d.attention
      })) : []
    }));
  } catch(e) {
    drugDataset = [];
  }
  return drugDataset;
}

app.all('/api/getDrugsBySymptom', (req, res) => {
  const symptom = String(((req.body && req.body.symptom) || (req.query && req.query.symptom) || '')).trim();
  const s = symptom.toLowerCase();
  const data = loadDrugDataset();
  const synonyms = {
    '发热': '发烧',
    '感冒咳嗽': '咳嗽',
    '偏头痛': '头痛',
    '胃疼': '胃痛',
    '鼻炎': '鼻塞'
  };
  const mapped = synonyms[s] || s;
  const result = [];
  for (const item of data){
    const target = item.symptom;
    if (!target) continue;
    if (mapped === target || mapped.includes(target) || target.includes(mapped)){
      for (const d of item.drugs){
        if (!d || !d.name) continue;
        if (result.find(x=>x.name===d.name)) continue;
        result.push({ name: d.name, desc: d.desc, usage: d.usage, price: d.price });
      }
    }
  }
  if (!result.length){
    for (const item of data){
      if (item.description && item.description.toLowerCase().includes(mapped)){
        for (const d of item.drugs){
          if (!d || !d.name) continue;
          if (result.find(x=>x.name===d.name)) continue;
          result.push({ name: d.name, desc: d.desc, usage: d.usage, price: d.price });
        }
      }
    }
  }
  res.json({ drugs: result });
});

// --- 2. 创建服务器并挂载 WebSocket（支持 HTTPS 自动切换） ---
let server;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  server = https.createServer(options, app);
  console.log('HTTPS 已启用');
} else {
  server = http.createServer(app);
}
const wss = new WebSocket.Server({ server });

console.log('信令 WebSocket 服务已就绪');

// WebSocket 广播逻辑 (用于视频通话)
wss.on('connection', function connection(ws) {
  console.log('新用户连接到信令服务器');

  ws.on('message', function incoming(message) {
    try {
      const str = (typeof message === 'string') ? message : message.toString();
      const data = JSON.parse(str);
      // 简单的广播机制：转发给除了自己以外的所有人
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (e) {
      console.error('信令解析错误:', e);
    }
  });
});

// --- 3. 启动服务器 ---
server.listen(PORT, () => {
  const proto = server instanceof https.Server ? 'https' : 'http';
  console.log(`项目运行中: ${proto}://localhost:${PORT}/`);
});
