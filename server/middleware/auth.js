const jwt = require('jsonwebtoken');

// Verifies if the user is logged in at all
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  try {
    // Expected format: "Bearer <token>"
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified.user;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token' });
  }
};

// Verifies if the logged-in user is a Retailer or Admin
const verifyRetailerOrAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'retailer' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access Denied. You are not authorized to manage inventory.' });
    }
  });
};

module.exports = { verifyToken, verifyRetailerOrAdmin };
