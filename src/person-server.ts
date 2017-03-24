import { Server, ServerContext, ServerFunction, CmdPacket, Permission, msgpack_decode_async, msgpack_encode_async, rpcAsync, waitingAsync } from "hive-service";
import * as bunyan from "bunyan";
import * as uuid from "uuid";
import * as bluebird from "bluebird";
import { RedisClient, Multi } from "redis";
import { verify, uuidVerifier, stringVerifier, numberVerifier, arrayVerifier, booleanVerifier } from "hive-verify";
import { Person } from "person-library";

const log = bunyan.createLogger({
  name: "person-server",
  streams: [
    {
      level: "info",
      path: "/var/log/person-server-info.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1d",   // daily rotation
      count: 7        // keep 7 back copies
    },
    {
      level: "error",
      path: "/var/log/person-server-error.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1w",   // daily rotation
      count: 3        // keep 7 back copies
    }
  ]
});

const allowAll: Permission[] = [["mobile", true], ["admin", true]];
const mobileOnly: Permission[] = [["mobile", true], ["admin", false]];
const adminOnly: Permission[] = [["mobile", false], ["admin", true]];

export const server = new Server();


server.callAsync("createPerson", allowAll, "创建人员信息", "创建人员信息", async (ctx: ServerContext, people: Person[]): Promise<any> => {
  log.info(`createPerson, sn: ${ctx.sn}, uid: ${ctx.uid}, people: ${JSON.stringify(people)}`);
  try {
    await verify([arrayVerifier("people", people)]);
  } catch (e) {
    log.info(e);
    ctx.report(3, e);
    return { code: 400, msg: e.message };
  }
  try {
    const pkt: CmdPacket = { cmd: "createPerson", args: [people] };
    ctx.publish(pkt);
    return await waitingAsync(ctx);
  } catch (e) {
    log.info(e);
    throw e;
  }
});

server.callAsync("getPerson", allowAll, "获取人员信息", "获取人员信息", async (ctx: ServerContext, pid: string): Promise<any> => {
  log.info(`getPerson, sn: ${ctx.sn}, uid: ${ctx.uid}, pid: ${pid}`);
  try {
    await verify([uuidVerifier("pid", pid)]);
  } catch (e) {
    log.info(e);
    ctx.report(3, e);
    return { code: 400, msg: e.message };
  }
  try {
    const prep = await ctx.cache.hgetAsync("person-entities", pid);
    if (prep !== null && prep !== "") {
      const person = await msgpack_decode_async(prep);
      return { code: 200, data: person };
    } else {
      return { code: 404, msg: "未找到对应人员信息" };
    }
  } catch (e) {
    log.info(e);
    throw e;
  }
});


server.callAsync("updateViews", allowAll, "上传证件照", "上传证件照", async (ctx: ServerContext, images): Promise<any> => {
  log.info(`updateViews, sn: ${ctx.sn}, uid: ${ctx.uid}, images: ${JSON.stringify(images)}`);
  try {
    await verify([arrayVerifier("images", images)]);
  } catch (e) {
    log.info(e);
    ctx.report(3, e);
    return { code: 400, msg: e };
  }
  try {
    if (images.length === 0) {
      return { code: 200, data: "success" };
    } else {
      const args = [images];
      const pkt: CmdPacket = { cmd: "updateViews", args: args };
      ctx.publish(pkt);
      return await waitingAsync(ctx);
    }
  } catch (e) {
    log.info(e);
    throw e;
  }
});
server.callAsync("setPersonVerified", allowAll, "设置人员认证标志", "设置人员认证标志", async (ctx: ServerContext, identity_no: string, flag: boolean) => {
  log.info(`setPersonVerified, uid: ${ctx.uid}, identity_no: ${identity_no},flag: ${false}`);
  try {
    await verify([stringVerifier("identity_no", identity_no), booleanVerifier("flag", flag)]);
  } catch (e) {
    log.info(e);
    ctx.report(3, e);
    return { code: 400, msg: e };
  }
  try {
    const args = [identity_no, flag];
    const pkt: CmdPacket = { cmd: "setPersonVerified", args: args };
    ctx.publish(pkt);
    return await waitingAsync(ctx);
  } catch (e) {
    log.info(e);
    throw e;
  }
});

server.callAsync("refresh", adminOnly, "刷新person缓存", "支持单个刷新", async (ctx: ServerContext, id?: string) => {
  log.info(`refresh, id: ${id ? id : ""}`);
  const args = id ? [id] : [];
  const pkt: CmdPacket = { cmd: "refresh", args: args };
  ctx.publish(pkt);
  return await waitingAsync(ctx);
});