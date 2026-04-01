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

    if (data.code === 0 && "data" in data && data.data?.redirect) {
      return res.redirect(data.data.redirect);
    }
    res.json(data);
  } catch (error: any) {
    res.json(reply(1, "获取信息失败", error.message));
  }
});

export default router;
