import express, { Request, Response, NextFunction } from "express";
import { reply } from "../utils/reply/reply.js";
import { parseLanzouUrl } from "../utils/lanzou/lanzouParser.js";

const router: express.Router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.json(reply(1, "缺少url参数"));
    }
    const pwd = req.query.pwd as string | undefined;
    const type = (req.query.type as string) || "json";

    const data = await parseLanzouUrl({
      url,
      pwd,
      type,
    });

    if (data.code === 0 && data.data && "redirect" in data.data) {
      return res.redirect(data.data.redirect);
    }
    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.json(reply(1, "获取信息失败", message));
  }
});

export default router;
