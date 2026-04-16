/**
 * @param code 响应码
 * @param msg 响应消息
 * @param data 响应数据
 */
const reply = (code: number, msg: string, data?: unknown) => {
  return {
    code,
    msg,
    data,
  };
};

// 成功的响应
export const success = (data: unknown, msg = '操作成功') => reply(0, msg, data);

// 失败的响应
export const fail = (msg = '操作失败', data: unknown = null) =>
  reply(500, msg, data);

// 参数错误
export const badRequest = (msg = '请求参数错误', data: unknown = null) =>
  reply(400, msg, data);

// 未授权
export const unauthorized = (msg = '未授权', data: unknown = null) =>
  reply(401, msg, data);

// 禁止访问
export const forbidden = (msg = '禁止访问', data: unknown = null) =>
  reply(403, msg, data);

// 资源未找到
export const notFound = (msg = '资源未找到', data: unknown = null) =>
  reply(404, msg, data);

// 服务器内部错误
export const internalServerError = (
  msg = '服务器内部错误',
  data: unknown = null,
) => reply(500, msg, data);

export { reply };
