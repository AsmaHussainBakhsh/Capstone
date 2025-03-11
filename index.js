const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/hls', express.static(path.join(__dirname, '..', 'hls')));
app.use('/recordings', express.static(path.join(__dirname, '..', 'recordings')));

// ------------------
// Authentication Routes
const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);
// ------------------

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://60105868:12class34@cluster0.t2myy.mongodb.net/cameraDB?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  setTimeout(connectDB, 5000);
});

const Recording = require('./models/Recording');

// API to get recordings list
app.get('/api/recordings', async (req, res) => {
  try {
    const recordings = await Recording.find().sort({ date: -1 }).limit(50);
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API to serve recordings (without decryption)
app.get('/api/recordings/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'recordings', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send('Error processing file');
  }
});

// Replace these paths with the location of your certificate and key files.
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'ssl', 'private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'ssl', 'certificate.pem'))
};

const PORT = process.env.PORT || 3000;
const server = https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS Server running on port ${PORT}`);
});

// WebSocket setup (now using secure WebSocket - wss)
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Watch for new recordings and broadcast via WebSocket
Recording.watch().on('change', (change) => {
  if (change.operationType === 'insert') {
    broadcast(change.fullDocument);
  }
});
