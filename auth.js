const express = require('express');
const router = express.Router();
const User = require('../server/models/User');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qr = require('qr-image');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Allowed roles: admin, user' });
  }
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({ username, password, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Generate a secret for Google Authenticator
    const secret = speakeasy.generateSecret({ length: 10 }); // shorter secret
    user.secret = secret.base32; // store the secret with the user document
    await user.save();

    // Generate an OTPAuth URL for Google Authenticator
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `CameraApp:${user.username}`,
      issuer: 'CameraApp',
      encoding: 'base32'
    });

    // Generate a QR code image from the OTPAuth URL
    const qrCode = qr.imageSync(otpauthUrl, { type: 'png' });

    res.json({
      message: 'Please scan the QR code with Google Authenticator and then verify the token',
      qrCode: qrCode.toString('base64'), // base64 encoded QR code image
      secret: secret.base32, // for manual entry (optional)
      user: { username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
  const { username, token } = req.body;
  if (!username || !token)
    return res.status(400).json({ message: 'Username and token are required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Verify the TOTP token using the stored secret
    const verified = speakeasy.totp.verify({
      secret: user.secret,
      encoding: 'base32',
      token: token,
      window: 2 // allows a 60-second window (adjust as needed)
    });

    if (verified) {
      res.json({ message: 'Token verified successfully', user: { username: user.username, role: user.role } });
    } else {
      res.status(400).json({ message: 'Invalid token' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
