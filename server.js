const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Node.js 内置模块，用于读取文件
const path = require('path'); // 处理文件路径
const app = express();

app.use(cors());
app.use(express.json());

// 接口：接收症状，读取 JSON 文档并返回对应药品
app.post('/api/getDrugsBySymptom', (req, res) => {
  const { symptom } = req.body; // 前端传的症状

  // 1. 拼接 JSON 文档路径（确保路径正确）
  const jsonPath = path.join(__dirname, 'drug-dataset.json');

  // 2. 读取 JSON 文件
  fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      // 读取失败（如文件不存在）
      return res.json({ success: false, message: '读取数据集失败' });
    }

    // 3. 解析 JSON 数据
    const dataset = JSON.parse(data);
    const symptomItem = dataset.症状列表.find(item => item.symptom === symptom);

    // 4. 返回结果
    if (symptomItem) {
      res.json({
        success: true,
        symptom: symptom,
        drugs: symptomItem.drugs // 匹配到的药品列表
      });
    } else {
      res.json({ success: true, symptom: symptom, drugs: [] }); // 无匹配结果
    }
  });
});

// 启动服务
const port = 3000;
app.listen(port, () => {
  console.log(`后端服务启动：http://localhost:${port}`);
});