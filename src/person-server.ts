import { Server, ServerContext, ServerFunction, CmdPacket, Permission, msgpack_decode_async, msgpack_encode_async, rpcAsync, waitingAsync } from "hive-service";
import * as bunyan from "bunyan";
import * as uuid from "uuid";
import * as bluebird from "bluebird";
import { RedisClient, Multi } from "redis";
import { verify, uuidVerifier, stringVerifier, numberVerifier, arrayVerifier } from "hive-verify";
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


server.callAsync("createPerson", allowAll, "创建人员信息", "创建人员信息", async (ctx: ServerContext,
  people: Person[]) => {
  log.info(`createPerson, sn: ${ctx.sn}, uid: ${ctx.uid}, people: ${JSON.stringify(people)}`);
  try {
    await verify([
      arrayVerifier("people", people)
    ]);
  } catch (err) {
    ctx.report(3, err);
    return {
      code: 400,
      msg: err
    };
  }
  try {

  } catch (err) {

  }
});

server.callAsync("getPerson", allowAll, "获取人员信息", "获取人员信息", async (ctx: ServerContext,
  pid: string) => {
  log.info(`getPerson, sn: ${ctx.sn}, uid: ${ctx.uid}, pid: ${pid}`);
  try {
    await verify([
      uuidVerifier("pid", pid)
    ]);
  } catch (err) {
    ctx.report(3, err);
    return {
      code: 400,
      msg: err
    };

  }
  try {

  } catch (err) {

  }
});

// server.callAsync("addDrivers", allowAll, "添加驾驶人信息", "添加驾驶人信息, 注意，一辆车只能拥有 3 位驾驶人", async (ctx: ServerContext,
//   oid: string,
//   drivers: Person[]) => {
// 
// });
// 
// server.callAsync("delDrivers", allowAll, "删除驾驶人信息", "删除驾驶人信息，注意，一辆车只能拥有 3 位驾驶人", async (ctx: ServerContext,
//   oid: string,
//   driver_ids: string[]) => {
// 
// });

// server.callAsync("uploadImages", allowAll, "上传证件照", "上传证件照", async (ctx: ServerContext,
//   vid: string,
//   driving_frontal_view: string,
//   driving_rear_view: string,
//   identity_frontal_view: string,
//   identity_rear_view: string,
//   license_frontal_view: Object) => {
// 
// });

server.callAsync("updatePerson", allowAll, "上传证件照", "上传证件照", async (ctx: ServerContext,
  pid: string,
  identity_frontal_view: string,
  identity_rear_view: string,
  license_frontal_view: string) => {
  log.info(`updatePerson, sn: ${ctx.sn}, uid: ${ctx.uid}, pid: ${pid}, identity_frontal_view: ${identity_frontal_view}, identity_rear_view: ${identity_rear_view}`);
  try {
    await verify([
      uuidVerifier("pid", pid)
    ]);
  } catch (err) {
    ctx.report(3, err);
    return {
      code: 400,
      msg: err
    };
  }
  try {

  } catch (err) {

  }
});
server.callAsync("setPersonVerified", allowAll, "设置人员认证标志", "设置人员认证标志", async (ctx: ServerContext,
  identity_no: string,
  flag: boolean) => {
  try {
    await verify([

    ]);
  } catch (err) {
    ctx.report(3, err);
    return {
      code: 400,
      msg: err
    };
  }
  try {

  } catch (err) {

  }
});
