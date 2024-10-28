const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const moment = require('moment');
const path = require('path');


const app = express();
app.use(express.json());
app.use(cors());

// JWT secret key
const JWT_SECRET = 'your_jwt_secret_key';

// // MongoDB connection
// mongoose.connect('mongodb://localhost:27017/user_db', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('MongoDB connection error:', err));


// Connect to MongoDB Atlas
// const mongoURI = 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/user_db?retryWrites=true&w=majority';
const mongoURI = 'mongodb+srv://harshchan02:rlFWyv0f22LD5rHJ@cluster0.irubh1u.mongodb.net/smart_locker?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => {
  console.error('MongoDB Atlas connection error:', err);
});


// MongoDB Schemas and Models
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const fileSchema = new mongoose.Schema({
  filename: String,
  file_path: String,
  sender: String,
  satisfied_receivers: [String],
  pending_receivers: [String],
  expiry_date: Date,
});

const sessionSchema = new mongoose.Schema({
  username: String,
  last_keepalive: Date,
  login_time: Date,
  is_online: Boolean,
});

const chatHistory = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  from: String,
  to: String,
  content: String
})

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);
const Session = mongoose.model('Session', sessionSchema);
const chat = mongoose.model('chatHistory', chatHistory);

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// File upload setup using Multer
const uploadFolder = 'uploads';
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

// User Signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(409).json({ msg: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();

  res.status(201).json({ msg: 'User created successfully' });
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ msg: 'Invalid credentials' });
  }

  const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '15m' });
  await new Session({
    username,
    last_keepalive: new Date(),
    login_time: new Date(),
    is_online: true
  }).save();

  res.status(200).json({ accessToken });
});

// File Upload
app.post('/upload', authenticateJWT, upload.array('files'), async (req, res) => {
  const { receivers } = req.body;
  if (!receivers) return res.status(400).json({ msg: 'Receivers are required' });

  const pendingReceivers = JSON.parse(receivers);
  const fileEntries = req.files.map(file => ({
    filename: file.originalname,
    file_path: path.join(uploadFolder, file.originalname),
    sender: req.user.username,
    satisfied_receivers: [],
    pending_receivers: pendingReceivers,
    expiry_date: moment().add(24, 'hours').toDate(),
  }));

  await File.insertMany(fileEntries);
  res.status(201).json({ msg: 'Files uploaded successfully' });
});

// Receive Files
app.post('/receive', authenticateJWT, async (req, res) => {
  const receiver = req.user.username;
  const files = await File.find({
    pending_receivers: receiver,
    expiry_date: { $gte: new Date() }
  });

  const responseFiles = files.map(file => ({
    filename: file.filename,
    file_path: file.file_path
  }));

  res.status(200).json({ files: responseFiles });
});

// Download File
app.get('/download/:filename', authenticateJWT, async (req, res) => {
  const { filename } = req.params;
  const receiver = req.user.username;
  const file = await File.findOne({ filename });

  if (!file) return res.status(404).json({ msg: 'File not found or expired' });
  if (!file.pending_receivers.includes(receiver)) {
    return res.status(403).json({ msg: 'You do not have permission to download this file' });
  }

  // Mark receiver as having downloaded the file
  await File.updateOne({ filename }, {
    $addToSet: { satisfied_receivers: receiver },
    $pull: { pending_receivers: receiver }
  });

  // Delete the file if all receivers have downloaded
  // const updatedFile = await File.findOne({ filename });
  // if (updatedFile.pending_receivers.length === 0) {
  //   fs.unlinkSync(file.file_path);
  //   await File.deleteOne({ filename });
  // }
  console.log(`User ${receiver} downloaded the file ${filename}.`);

  res.download(file.file_path);
});

// Logout
app.post('/logout', authenticateJWT, async (req, res) => {
  const username = req.user.username;
  await Session.updateOne({ username }, { is_online: false });
  res.status(200).json({ msg: 'Logout successful' });
});

// Periodic Cleanup Tasks
const checkKeepalive = async () => {
  const now = new Date();
  const expiredSessions = await Session.find({
    is_online: true,
    last_keepalive: { $lt: new Date(now - 3 * 60 * 1000) }
  });

  for (const session of expiredSessions) {
    await Session.updateOne({ username: session.username }, { is_online: false });
    console.log(`User ${session.username} logged out due to inactivity.`);
  }
};

const deleteExpiredFiles = async () => {
  const now = new Date();
  const expiredFiles = await File.find({ expiry_date: { $lt: now } });

  for (const file of expiredFiles) {
    if (fs.existsSync(file.file_path)) fs.unlinkSync(file.file_path);
    await File.deleteOne({ _id: file._id });
    console.log(`File ${file.filename} deleted due to expiration.`);
  }
};

// Start periodic tasks
// setInterval(checkKeepalive, 60 * 1000);  // Check every 1 minute
setInterval(deleteExpiredFiles, 60 * 60 * 1000);  // Check every 1 hour

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});