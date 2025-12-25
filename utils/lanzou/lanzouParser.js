const axios = require("axios");
const { JSDOM } = require("jsdom");
const {
  isAcwChallenge,
  calcAcwScV2FromHtml,
  upsertAcwScCookie,
} = require("./anti_acw_sc__v2");

const UserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36";

const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 10000,
});

let globalCookies = "";

axiosInstance.interceptors.request.use((config) => {
  if (globalCookies) {
    config.headers.Cookie = globalCookies;
  }
  return config;
});

axiosInstance.interceptors.response.use((response) => {
  const setCookie = response.headers["set-cookie"];
  if (setCookie && setCookie.length) {
    globalCookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  return response;
});

/**
 * 解析蓝奏云分享链接
 */
async function parseLanzouUrl(params) {
  const { url, pwd, type, n: rename } = params;
  if (!url) return { code: 1, msg: "请输入URL" };
  if (!/lanzou[\w]*\.com\/[a-zA-Z0-9]/.test(url))
    return { code: 1, msg: "请输入正确的蓝奏云分享链接" };

  // 重置 Cookie
  globalCookies = "";

  const baseUrls = [
    "https://www.lanzoux.com",
    "https://www.lanzouf.com",
    "https://www.lanzouj.com",
    "https://www.lanzouu.com",
    "https://www.lanzouw.com",
  ];
  let lastError = null;

  for (const baseUrl of baseUrls) {
    try {
      const inputUrl = baseUrl + url.split(".com")[1];

      // Step 0: 访问主页获取初始 Cookie
      await getInitialCookies(baseUrl);

      // Step 1: 初次请求
      let firstResponse = await axiosInstance.get(inputUrl, {
        headers: getHeaders(inputUrl),
      });
      if (!firstResponse.data) {
        lastError = { code: 1, msg: "页面无内容" };
        continue;
      }
      if (firstResponse.data.includes("文件取消分享了")) {
        lastError = { code: 1, msg: "文件取消分享了" };
        continue;
      }

      // 处理 acw_sc__v2 验证
      if (isAcwChallenge(firstResponse.data)) {
        console.log("inputUrl 需要处理 acw_sc__v2 验证");
        applyAcwCookieFromHtml(firstResponse.data);
        // 携带新 cookie 重试请求
        firstResponse = await axiosInstance.get(inputUrl, {
          headers: getHeaders(inputUrl),
        });
      }

      const dom = new JSDOM(firstResponse.data);
      const document = dom.window.document;

      let fileName = extractFileName(document);
      const fileSize = extractFileSize(document);

      // Step 2: 需要密码
      if (firstResponse.data.includes("function down_p()")) {
        if (!pwd) return { code: 1, msg: "请输入分享密码" };

        const cleanCode = firstResponse.data.replace(/\/\*[\s\S]*?\*\//g, "");
        const sign = matchOne(cleanCode, /'sign':'(.*?)',/);
        const fileId = matchOne(
          cleanCode,
          /url\s*:\s*'\/ajaxm\.php\?file=(\d+)(?=[^\/]*')/
        );
        if (!sign || !fileId) {
          lastError = { code: 1, msg: "获取文件标识失败" };
          continue;
        }

        const postResult = await getAjaxmResult(baseUrl, fileId, {
          action: "downprocess",
          sign,
          p: pwd,
          kd: 1,
        });
        if (postResult.zt !== 1) {
          lastError = { code: 1, msg: postResult.inf || "解析失败" };
          continue;
        }

        fileName = postResult.inf || fileName;
        return await handleFinalUrl(postResult, {
          fileName,
          fileSize,
          rename,
          type,
        });
      }

      // Step 3: 无密码
      const iframeSrc = document.querySelector("iframe")?.src;
      if (!iframeSrc) {
        lastError = { code: 1, msg: "无法解析下载页面" };
        continue;
      }

      let iframeResponse = await axiosInstance.get(`${baseUrl}${iframeSrc}`, {
        headers: getHeaders(inputUrl),
      });

      // iframe  acw_sc__v2 验证
      if (
        typeof iframeResponse.data === "string" &&
        isAcwChallenge(iframeResponse.data)
      ) {
        console.log("iframe 需要处理 acw_sc__v2 验证");
        applyAcwCookieFromHtml(iframeResponse.data);
        // 重试 iframe 请求
        iframeResponse = await axiosInstance.get(`${baseUrl}${iframeSrc}`, {
          headers: getHeaders(inputUrl),
        });
      }

      const sign = matchOne(iframeResponse.data, /wp_sign = '(.*?)'/);
      const fileId = matchOne(
        iframeResponse.data.replace(`//url : '/ajaxm.php?file=1',//`, ""),
        /url\s*:\s*'\/ajaxm\.php\?file=(\d+)(?=[^\/]*')/
      );
      if (!sign || !fileId) {
        lastError = { code: 1, msg: "获取文件标识失败" };
        continue;
      }

      const postResult = await getAjaxmResult(baseUrl, fileId, {
        action: "downprocess",
        signs: "?ctdf",
        sign,
        kd: 1,
      });
      if (postResult.zt !== 1) {
        lastError = { code: 1, msg: postResult.inf || "解析失败" };
        continue;
      }

      return await handleFinalUrl(postResult, {
        fileName,
        fileSize,
        rename,
        type,
      });
    } catch (err) {
      console.log("解析失败:", err.message);
      lastError = {
        code: 1,
        msg: "解析异常",
        error: err?.message || err?.toString(),
      };
      continue;
    }
  }
  return lastError || { code: 1, msg: "解析失败" };
}

/**
 * 获取初始 Cookie
 */
async function getInitialCookies(baseUrl) {
  try {
    await axiosInstance.get(baseUrl, {
      headers: getHeaders(baseUrl),
    });
  } catch (err) {
    console.warn("获取初始cookie失败:", err.message);
  }
}

/**
 * 从包含 arg1 的 HTML 里计算 acw_sc__v2 并写入全局 cookie
 * @param {string} html
 */
function applyAcwCookieFromHtml(html) {
  try {
    const v = calcAcwScV2FromHtml(html);
    if (!v) return;
    globalCookies = upsertAcwScCookie(globalCookies, v);
  } catch (err) {
    console.error("处理 acw_sc__v2 失败:", err.message);
  }
}

async function getAjaxmResult(baseUrl, fileId, payload) {
  const postUrl = `${baseUrl}/ajaxm.php?file=${fileId}`;
  const res = await axiosInstance.post(postUrl, new URLSearchParams(payload), {
    headers: getHeaders(baseUrl),
  });
  return res.data;
}

/**
 * 处理最终直链
 */
async function handleFinalUrl(data, { fileName, fileSize, rename, type }) {
  const downUrl1 = `${data.dom}/file/${data.url}`;
  const finalUrl = await resolveFinalUrl(downUrl1);
  if (type === "down") {
    return { code: 0, msg: "跳转下载", data: { redirect: finalUrl } };
  }
  return {
    code: 0,
    msg: "解析成功",
    data: { name: rename || fileName, filesize: fileSize, downUrl: finalUrl },
  };
}

/**
 * 通过 HEAD 请求解析跳转后的直链
 */
async function resolveFinalUrl(url) {
  try {
    const res = await axiosInstance.head(url, {
      headers: getHeaders(url, new URL(url).hostname),
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return res.headers.location || url;
  } catch (err) {
    if (err.response && err.response.status >= 300 && err.response.status < 400)
      return err.response.headers.location || url;
    console.error("解析最终URL失败:", err.message);
    return url;
  }
}

function extractFileName(document) {
  return (
    document.querySelector(".n_box_3fn")?.textContent?.trim() ||
    document.querySelector(".b span")?.textContent?.trim() ||
    document.querySelector("title")?.textContent?.replace(" 蓝奏云", "") ||
    ""
  );
}

function extractFileSize(document) {
  return (
    document
      .querySelector(".n_filesize")
      ?.textContent.replace("大小：", "")
      .trim() ||
    document.querySelector("span.p7")?.nextSibling?.textContent?.trim() ||
    ""
  );
}

function matchOne(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : null;
}

function getHeaders(referer, host = "") {
  return {
    "User-Agent": UserAgent,
    "X-FORWARDED-FOR": randIP(),
    "CLIENT-IP": randIP(),
    Referer: referer,
    Connection: "Keep-Alive",
    Accept: "*/*",
    "Accept-Language": "zh-cn",
    Host: host,
  };
}

function randIP() {
  const arr = [
    "218",
    "218",
    "66",
    "66",
    "218",
    "218",
    "60",
    "60",
    "202",
    "204",
    "66",
    "66",
    "66",
    "59",
    "61",
    "60",
    "222",
    "221",
    "66",
    "59",
    "60",
    "60",
    "66",
    "218",
    "218",
    "62",
    "63",
    "64",
    "66",
    "66",
    "122",
    "211",
  ];
  return `${arr[Math.floor(Math.random() * arr.length)]}.${Math.floor(
    Math.random() * 255
  )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

module.exports = { parseLanzouUrl };
