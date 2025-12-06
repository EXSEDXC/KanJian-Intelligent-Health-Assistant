const path = require('path');
const express = require('express');
const cors = require('cors');

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

