module.exports = {
  PORT: process.env.PORT || 1103,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  },
};
