const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server: WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve project static files
app.use(express.static(path.join(__dirname)));

// Serve libs from node_modules
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

let server;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  server = https.createServer(options, app).listen(PORT, () => {
    console.log(`Server running at https://localhost:${PORT}/`);
  });
} else {
  server = http.createServer(app).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
}

const rooms = new Map();
let nextId = 1;

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.id = String(nextId++);
  ws.roomId = null;
  ws.role = null;

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg.toString()); } catch { return; }
    const t = data.type;
    if (t === 'join') {
      const r = String(data.roomId || '');
      const role = String(data.userRole || '');
      ws.roomId = r;
      ws.role = role;
      if (!rooms.has(r)) rooms.set(r, new Map());
      const room = rooms.get(r);
      room.set(ws.id, ws);
      const peers = Array.from(room.keys()).filter((id) => id !== ws.id);
      ws.send(JSON.stringify({ type: 'joined', clientId: ws.id, roomId: r, peers }));
      for (const [pid, client] of room.entries()) {
        if (pid !== ws.id) {
          client.send(JSON.stringify({ type: 'peer-joined', roomId: r, peerId: ws.id }));
        }
      }
    } else if (t === 'chat') {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      for (const [pid, client] of room.entries()) {
        if (pid !== ws.id) {
          client.send(JSON.stringify({ type: 'chat', roomId: ws.roomId, text: String(data.text || ''), from: ws.id }));
        }
      }
    } else if (t === 'hangup') {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      for (const [pid, client] of room.entries()) {
        if (pid !== ws.id) {
          client.send(JSON.stringify({ type: 'hangup', roomId: ws.roomId, from: ws.id }));
        }
      }
    } else if (t === 'offer' || t === 'answer' || t === 'ice-candidate') {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const to = String(data.roomId ? '' : '');
      for (const [pid, client] of room.entries()) {
        if (pid !== ws.id) {
          const payload = { type: t, roomId: ws.roomId, from: ws.id };
          if (t === 'offer') payload.offer = data.offer;
          else if (t === 'answer') payload.answer = data.answer;
          else if (t === 'ice-candidate') payload.candidate = data.candidate;
          client.send(JSON.stringify(payload));
        }
      }
    }
  });

  ws.on('close', () => {
    const r = ws.roomId;
    if (!r || !rooms.has(r)) return;
    const room = rooms.get(r);
    room.delete(ws.id);
    for (const [, client] of room.entries()) {
      client.send(JSON.stringify({ type: 'peer-left', roomId: r, peerId: ws.id }));
    }
    if (room.size === 0) rooms.delete(r);
  });
});
