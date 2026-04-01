import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cors from "cors";
import dayjs from "dayjs";
import config from "./config/config.js";
import lanzouRouter from "./routes/lanzou.js";

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

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(
      `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] 🔥 [Unhandled Error]`,
      err,
    );
    res.status(500).json({ error: "Unexpected server error" });
  },
);

app.listen(config.PORT, () => {
  console.log(
    `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] Server running at http://127.0.0.1:${config.PORT}`,
  );
});
