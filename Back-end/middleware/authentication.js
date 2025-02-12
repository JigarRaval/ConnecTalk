const jwt=require('jsonwebtoken')
const User = require("../models/User");
require("dotenv").config();

const authenticate=async (req,res,next)=>{
    const token=req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authenticate;