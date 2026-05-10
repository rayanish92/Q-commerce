const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access Denied.' });
  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified.user;
    next();
  } catch (err) { res.status(400).json({ message: 'Invalid Token' }); }
};

const verifyRetailerOrAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'retailer' || req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Access Denied.' });
  });
};

// NEW: STRICTLY ADMIN ONLY
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Master Admin Access Required.' });
  });
};

module.exports = { verifyToken, verifyRetailerOrAdmin, verifyAdmin };
