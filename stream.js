const { spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const Recording = require('./models/Recording');
const fs = require('fs');

const RECORDINGS_DIR = path.join(__dirname, '..', 'recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Connect to MongoDB
mongoose.connect('mongodb+srv://60105868:12class34@cluster0.t2myy.mongodb.net/cameraDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000
}).then(() => console.log('Stream.js: MongoDB connected'))
  .catch(err => {
    console.error('Stream.js: DB connection error:', err.message);
    process.exit(1);
  });

const RTSP_URL = 'rtsp://admin:YCIODP@192.168.0.157/H.264';
const FFMPEG_PATH = 'ffmpeg';
const HLS_OUTPUT = path.join(__dirname, '..', 'hls', 'playlist.m3u8');

function startFFmpeg() {
  // Live streaming process (HLS output)
  const ffmpeg = spawn(FFMPEG_PATH, [
    '-rtsp_transport', 'tcp',
    '-i', RTSP_URL,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-profile:v', 'baseline',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments+append_list',
    HLS_OUTPUT
  ]);

  ffmpeg.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('missed packets')) return;
    console.error(`FFmpeg (live): ${message}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`Live stream ffmpeg restarted (Code ${code})...`);
    setTimeout(startFFmpeg, 3000);
  });

  ffmpeg.on('error', (err) => {
    console.error(`Live stream ffmpeg process error: ${err.message}`);
  });
}

startFFmpeg();
