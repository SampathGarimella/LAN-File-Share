const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create data directories if they don't exist
const dataDir = path.join(__dirname, 'data');
const filesDir = path.join(dataDir, 'files');
const textsDir = path.join(dataDir, 'texts');

[dataDir, filesDir, textsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Text page
app.get('/text/:id?', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'text.html'));
});

// File page
app.get('/file/:id?', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'file.html'));
});

// API: Create new text note
app.post('/api/text', (req, res) => {
  const id = uuidv4();
  const textData = {
    id: id,
    content: req.body.content || '',
    createdAt: new Date().toISOString()
  };
  
  const filePath = path.join(textsDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(textData, null, 2));
  
  res.json({ id: id, url: `/text/${id}` });
});

// API: Get text note
app.get('/api/text/:id', (req, res) => {
  const filePath = path.join(textsDir, `${req.params.id}.json`);
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'Text note not found' });
  }
});

// API: Update text note (creates if doesn't exist)
app.put('/api/text/:id', (req, res) => {
  const filePath = path.join(textsDir, `${req.params.id}.json`);
  
  if (fs.existsSync(filePath)) {
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const updatedData = {
      ...existingData,
      content: req.body.content || existingData.content,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    res.json(updatedData);
  } else {
    // Create new note with the provided ID
    const newData = {
      id: req.params.id,
      content: req.body.content || '',
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
    res.json(newData);
  }
});

// API: Create new file collection
app.post('/api/file/collection', (req, res) => {
  const id = uuidv4();
  const collectionData = {
    id: id,
    files: [],
    createdAt: new Date().toISOString()
  };
  
  const filePath = path.join(filesDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(collectionData, null, 2));
  
  res.json({ id: id, url: `/file/${id}` });
});

// API: Upload file to collection (creates collection if doesn't exist)
app.post('/api/file/collection/:collectionId', upload.single('file'), (req, res) => {
  try {
    console.log('File upload request received');
    console.log('Collection ID:', req.params.collectionId);
    console.log('File:', req.file);
    console.log('Request body:', req.body);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const collectionId = req.params.collectionId;
    const collectionPath = path.join(filesDir, `${collectionId}.json`);
    
    let collectionData;
    if (fs.existsSync(collectionPath)) {
      collectionData = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    } else {
      // Create collection if it doesn't exist
      collectionData = {
        id: collectionId,
        files: [],
        createdAt: new Date().toISOString()
      };
    }
    
    const fileData = {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };
    
    collectionData.files.push(fileData);
    collectionData.updatedAt = new Date().toISOString();
    
    fs.writeFileSync(collectionPath, JSON.stringify(collectionData, null, 2));
    
    console.log('File uploaded successfully:', fileData);
    res.json({ file: fileData, collection: collectionData });
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// API: Get file collection
app.get('/api/file/collection/:id', (req, res) => {
  const collectionPath = path.join(filesDir, `${req.params.id}.json`);
  
  if (fs.existsSync(collectionPath)) {
    const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'File collection not found' });
  }
});

// API: Download file
app.get('/api/file/:collectionId/download/:fileId', (req, res) => {
  const collectionId = req.params.collectionId;
  const fileId = req.params.fileId;
  const collectionPath = path.join(filesDir, `${collectionId}.json`);
  
  if (fs.existsSync(collectionPath)) {
    const collectionData = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    const fileData = collectionData.files.find(f => f.id === fileId);
    
    if (fileData) {
      const filePath = path.join(filesDir, fileData.filename);
      if (fs.existsSync(filePath)) {
        res.download(filePath, fileData.originalName);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } else {
      res.status(404).json({ error: 'File not found in collection' });
    }
  } else {
    res.status(404).json({ error: 'File collection not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

