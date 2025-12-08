const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http'); // 引入 http 模块
const WebSocket = require('ws'); // 引入 WebSocket 模块

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

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

// --- 2. 创建 HTTP 服务器并挂载 WebSocket ---
const server = http.createServer(app); // 将 express 包裹在 http server 中
const wss = new WebSocket.Server({ server }); // 在同一个端口上启动 WebSocket

console.log('信令 WebSocket 服务已就绪');

// WebSocket 广播逻辑 (用于视频通话)
wss.on('connection', function connection(ws) {
  console.log('新用户连接到信令服务器');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
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
  console.log(`项目运行中: http://localhost:${PORT}/`);
});