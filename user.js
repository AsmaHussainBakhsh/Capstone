const express = require('express');
const User = require('../server/models/User');
const router = express.Router();

// Simple registration endpoint (if needed)
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Allowed roles: admin, user' });
  }
  try {
    const user = new User({ username, password, role });
    await user.save();
    res.status(201).send({ user });
  } catch (err) {
    res.status(400).send(err);
  }
});

// Simple login endpoint (without JWT)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send({ error: 'Invalid login credentials' });
    }
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).send({ error: 'Invalid login credentials' });
    }
    res.send({ user });
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router;
