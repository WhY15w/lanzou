const axios = require("axios");
const { JSDOM } = require("jsdom");
const {
  isAcwChallenge,
  calcAcwScV2FromHtml,
  upsertAcwScCookie,
} = require("./anti_acw_sc__v2");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36";

/** 蓝奏云备用域名列表，按优先级依次尝试 */
const BASE_URLS = [
  "https://www.lanzoux.com",
  "https://www.lanzouf.com",
  "https://www.lanzouj.com",
  "https://www.lanzouu.com",
  "https://www.lanzouw.com",
];

/** 用于生成随机 IP 的首段地址池 */
const IP_FIRST_SEGMENTS = [
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

/** 蓝奏云链接格式校验 */
const LANZOU_URL_REGEX = /lanzou[\w]*\.com\/[a-zA-Z0-9]/;

let globalCookies = "";

const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 10000,
});

/** 请求拦截：自动携带全局 Cookie */
axiosInstance.interceptors.request.use((config) => {
  if (globalCookies) {
    config.headers.Cookie = globalCookies;
  }
  return config;
});

/** 响应拦截：自动收集 Set-Cookie */
axiosInstance.interceptors.response.use((response) => {
  const setCookie = response.headers["set-cookie"];
  if (setCookie && setCookie.length) {
    globalCookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  return response;
});

/**
 * 重置全局 Cookie（每次新解析前调用）
 */
function resetCookies() {
  globalCookies = "";
}

/**
 * 从包含 arg1 的 HTML 里计算 acw_sc__v2 并写入全局 Cookie
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

/**
 * 构造伪装请求头
 * @param {string} referer
 * @param {string} [host=""]
 * @returns {object}
 */
function buildHeaders(referer, host = "") {
  return {
    "User-Agent": USER_AGENT,
    "X-FORWARDED-FOR": randIP(),
    "CLIENT-IP": randIP(),
    Referer: referer,
    Connection: "Keep-Alive",
    Accept: "*/*",
    "Accept-Language": "zh-cn",
    Host: host,
  };
}

/**
 * 生成随机 IP 地址
 * @returns {string}
 */
function randIP() {
  const seg =
    IP_FIRST_SEGMENTS[Math.floor(Math.random() * IP_FIRST_SEGMENTS.length)];
  return `${seg}.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255,
  )}.${Math.floor(Math.random() * 255)}`;
}

/**
 * 访问主页获取初始 Cookie
 * @param {string} baseUrl
 */
async function fetchInitialCookies(baseUrl) {
  try {
    await axiosInstance.get(baseUrl, {
      headers: buildHeaders(baseUrl),
    });
  } catch (err) {
    console.warn("获取初始cookie失败:", err.message);
  }
}

/**
 * 发起 GET 请求，自动处理 acw_sc__v2 质询
 * @param {string} url      请求地址
 * @param {string} referer  Referer 头
 * @returns {Promise<import("axios").AxiosResponse>}
 */
async function getWithAcwRetry(url, referer) {
  let response = await axiosInstance.get(url, {
    headers: buildHeaders(referer),
  });
  if (typeof response.data === "string" && isAcwChallenge(response.data)) {
    console.log(`${url} 需要处理 acw_sc__v2 验证`);
    applyAcwCookieFromHtml(response.data);
    response = await axiosInstance.get(url, {
      headers: buildHeaders(referer),
    });
  }
  return response;
}

/**
 * 请求 ajaxm.php 获取下载信息
 * @param {string} baseUrl
 * @param {string} fileId
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function postAjaxm(baseUrl, fileId, payload) {
  const postUrl = `${baseUrl}/ajaxm.php?file=${fileId}`;
  const res = await axiosInstance.post(postUrl, new URLSearchParams(payload), {
    headers: buildHeaders(baseUrl),
  });
  return res.data;
}

/**
 * 通过 HEAD 请求解析 302 跳转后的最终直链
 * @param {string} url
 * @returns {Promise<string>}
 */
async function resolveFinalUrl(url) {
  try {
    const res = await axiosInstance.head(url, {
      headers: buildHeaders(url, new URL(url).hostname),
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

/**
 * 正则匹配并返回第一个捕获组
 * @param {string} text
 * @param {RegExp} regex
 * @returns {string|null}
 */
function matchOne(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : null;
}

/**
 * 从 DOM 中提取文件名
 * @param {Document} document
 * @returns {string}
 */
function extractFileName(document) {
  return (
    document.querySelector(".n_box_3fn")?.textContent?.trim() ||
    document.querySelector(".b span")?.textContent?.trim() ||
    document.querySelector("title")?.textContent?.replace(" 蓝奏云", "") ||
    ""
  );
}

/**
 * 从 DOM 中提取文件大小
 * @param {Document} document
 * @returns {string}
 */
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

/**
 * 构造最终返回结果
 * @param {object} ajaxData  ajaxm 接口返回数据
 * @param {object} meta      { fileName, fileSize, rename, type }
 * @returns {Promise<object>}
 */
async function buildResult(ajaxData, { fileName, fileSize, rename, type }) {
  const downUrl1 = `${ajaxData.dom}/file/${ajaxData.url}`;
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
 * 有密码的文件解析流程
 * @param {string} html      页面 HTML
 * @param {string} baseUrl   当前使用的域名
 * @param {string} pwd       分享密码
 * @param {string} fileName  已提取的文件名
 * @param {string} fileSize  已提取的文件大小
 * @param {string} rename    用户指定的重命名
 * @param {string} type      返回类型
 * @returns {Promise<object>}
 */
async function parseWithPassword(
  html,
  baseUrl,
  pwd,
  fileName,
  fileSize,
  rename,
  type,
) {
  if (!pwd) return { code: 1, msg: "请输入分享密码" };

  const cleanCode = html.replace(/\/\*[\s\S]*?\*\//g, "");
  const sign = matchOne(cleanCode, /'sign':'(.*?)',/);
  const fileId = matchOne(
    cleanCode,
    /url\s*:\s*'\/ajaxm\.php\?file=(\d+)(?=[^\/]*')/,
  );
  if (!sign || !fileId) {
    return { code: 1, msg: "获取文件标识失败" };
  }

  const postResult = await postAjaxm(baseUrl, fileId, {
    action: "downprocess",
    sign,
    p: pwd,
    kd: 1,
  });
  if (postResult.zt !== 1) {
    return { code: 1, msg: postResult.inf || "解析失败" };
  }

  fileName = postResult.inf || fileName;
  return await buildResult(postResult, { fileName, fileSize, rename, type });
}

/**
 * 无密码的文件解析流程
 * @param {Document} document  页面 DOM
 * @param {string}   baseUrl   当前使用的域名
 * @param {string}   inputUrl  原始请求 URL（用作 Referer）
 * @param {string}   fileName  已提取的文件名
 * @param {string}   fileSize  已提取的文件大小
 * @param {string}   rename    用户指定的重命名
 * @param {string}   type      返回类型
 * @returns {Promise<object>}
 */
async function parseWithoutPassword(
  document,
  baseUrl,
  inputUrl,
  fileName,
  fileSize,
  rename,
  type,
) {
  const iframeSrc = document.querySelector("iframe")?.src;
  if (!iframeSrc) {
    return { code: 1, msg: "无法解析下载页面" };
  }

  const iframeResponse = await getWithAcwRetry(
    `${baseUrl}${iframeSrc}`,
    inputUrl,
  );

  const sign = matchOne(iframeResponse.data, /wp_sign = '(.*?)'/);
  const fileId = matchOne(
    iframeResponse.data.replace(`//url : '/ajaxm.php?file=1',//`, ""),
    /url\s*:\s*'\/ajaxm\.php\?file=(\d+)(?=[^\/]*')/,
  );
  if (!sign || !fileId) {
    return { code: 1, msg: "获取文件标识失败" };
  }

  const postResult = await postAjaxm(baseUrl, fileId, {
    action: "downprocess",
    signs: "?ctdf",
    sign,
    kd: 1,
  });
  if (postResult.zt !== 1) {
    return { code: 1, msg: postResult.inf || "解析失败" };
  }

  return await buildResult(postResult, { fileName, fileSize, rename, type });
}

/**
 * 使用指定域名尝试解析
 * @param {string} baseUrl  域名
 * @param {object} params   { url, pwd, type, rename }
 * @returns {Promise<object>}
 */
async function tryParseWithDomain(baseUrl, { url, pwd, type, rename }) {
  const inputUrl = baseUrl + url.split(".com")[1];

  // 1. 访问主页获取初始 Cookie
  await fetchInitialCookies(baseUrl);

  // 2. 请求分享页面（自动处理 acw 质询）
  const firstResponse = await getWithAcwRetry(inputUrl, inputUrl);

  if (!firstResponse.data) {
    return { code: 1, msg: "页面无内容" };
  }
  if (firstResponse.data.includes("文件取消分享了")) {
    return { code: 1, msg: "文件取消分享了" };
  }

  // 3. 解析 DOM 提取文件信息
  const dom = new JSDOM(firstResponse.data);
  const document = dom.window.document;
  const fileName = extractFileName(document);
  const fileSize = extractFileSize(document);

  // 4. 根据是否需要密码走不同分支
  if (firstResponse.data.includes("function down_p()")) {
    return await parseWithPassword(
      firstResponse.data,
      baseUrl,
      pwd,
      fileName,
      fileSize,
      rename,
      type,
    );
  }

  return await parseWithoutPassword(
    document,
    baseUrl,
    inputUrl,
    fileName,
    fileSize,
    rename,
    type,
  );
}

/**
 * 解析蓝奏云分享链接（主入口）
 * @param {object} params - { url, pwd, type, n }
 * @returns {Promise<object>}
 */
async function parseLanzouUrl(params) {
  const { url, pwd, type, n: rename } = params;

  // 参数校验
  if (!url) return { code: 1, msg: "请输入URL" };
  if (!LANZOU_URL_REGEX.test(url))
    return { code: 1, msg: "请输入正确的蓝奏云分享链接" };

  // 重置 Cookie
  resetCookies();

  // 依次尝试各备用域名
  let lastError = null;
  for (const baseUrl of BASE_URLS) {
    try {
      return await tryParseWithDomain(baseUrl, { url, pwd, type, rename });
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

module.exports = { parseLanzouUrl };
