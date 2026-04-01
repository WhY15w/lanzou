export const PORT = process.env.PORT || 1103;
export const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
};

const config = {
  PORT,
  rateLimit,
};

export default config;
