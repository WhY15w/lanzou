const express = require("express");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cors = require("cors");
const dayjs = require("dayjs");
const config = require("./config/config");
const lanzouRouter = require("./routes/lanzou");

const app = express();

app.set("trust proxy", "loopback");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

morgan.token("time", () => dayjs().format("YYYY-MM-DD HH:mm:ss"));
app.use(
  morgan(
    "[:time] :method :url :status :res[content-length] - :response-time ms",
  ),
);

app.use(
  cors({
    allowedHeaders: "*",
    origin: "*",
  }),
);
app.use(rateLimit(config.rateLimit));

// routes
app.use("/lanzou", lanzouRouter);

app.use((err, req, res, next) => {
  console.error(
    `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] 🔥 [Unhandled Error]`,
    err,
  );
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(config.PORT, () => {
  console.log(
    `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] Server running at http://127.0.0.1:${config.PORT}`,
  );
});

module.exports = app;
