const express = require("express");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cors = require("cors");
const config = require("./config/config");
const lanzouRouter = require("./routes/lanzou");

const app = express();

app.set("trust proxy", "loopback");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("tiny"));
app.use(
  cors({
    allowedHeaders: "*",
    origin: "*",
  })
);
app.use(rateLimit(config.rateLimit));

// routes
app.use("/lanzou", lanzouRouter);

app.use((err, req, res, next) => {
  console.error("🔥 [Unhandled Error]", err);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(config.PORT, () => {
  console.log(`Server running at http://127.0.0.1:${config.PORT}`);
});

module.exports = app;
