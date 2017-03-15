import { Processor, ProcessorFunction, ProcessorContext, rpcAsync, msgpack_encode_async, msgpack_decode_async, set_for_response } from "hive-service";
import { Client as PGClient, QueryResult } from "pg";
import { createClient, RedisClient, Multi } from "redis";
import * as bluebird from "bluebird";
import * as bunyan from "bunyan";
import * as nanomsg from "nanomsg";
import * as uuid from "uuid";

const log = bunyan.createLogger({
  name: "person-processor",
  streams: [
    {
      level: "info",
      path: "/var/log/person-processor-info.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1d",   // daily rotation
      count: 7        // keep 7 back copies
    },
    {
      level: "error",
      path: "/var/log/person-processor-error.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1w",   // daily rotation
      count: 3        // keep 7 back copies
    }
  ]
});


export const processor = new Processor();

processor.callAsync("createPerson", async (ctx: ProcessorContext, people: Object[]) => {
  log.info(`createPerson, people:${people}`);
  const db: PGClient = ctx.db;
  const cache: RedisClient = ctx.cache;
  try {
    await db.query("BEGIN");
    const pids = [];
    const cpids = [];
    for (const p of people) {
      const prep = db.query("SELECT id, identiy_no, phone, verified FROM person WHERE identiy_no = $1", [p["identiy_no"]]);
      if (prep["rowCount"] === 0) {
        const id = uuid.v1();
        pids.push(id);
        cpids.push(id);
        await db.query("INSERT INTO person(id, name, identiy_no, phone) VALUES($1,$2,$3,$4)", [id, p["name"], p["identiy_no"], p["phone"] ? p["phone"] : ""]);
      } else {
        const old_p = prep["rows"][0];
        if (old_p["verified"] === false) {
          const phone = old_p["phone"];
          await db.query("UPDATE person SET name = $1, phone = $2 WHERE identiy_no = $3", [p["name"], p["phone"] ? p["phone"] : old_p["phone"], p["identiy_no"]]);
          pids.push(old_p["id"]);
          cpids.push(old_p["id"]);
        } else {
          cpids.push(old_p["id"]);
        }
      }
    }
    for (const pid of pids) {
      await async_person(db, cache, pid);
    }
    await db.query("COMMIT");
    return { code: 200, data: cpids };
  } catch (e) {
    log.info(e);
    await db.query("ROLLBACK");
    throw e;
  }
});



processor.callAsync("updateViews", async (ctx: ProcessorContext, pid: string, identity_frontal_view?: string, identity_rear_view?: string, license_frontal_view?: string) => {
  log.info(`updateViews, pid:${pid},identity_frontal_view: ${identity_frontal_view}, identity_rear_view: ${identity_rear_view},license_frontal_view: ${license_frontal_view}`);
  const db: PGClient = ctx.db;
  const cache: RedisClient = ctx.cache;
  try {
    const old_p = await db.query("SELECT id,identity_frontal_view,identity_rear_view,license_frontal_view FROM person WHERE id = $1", [pid]);
    if (old_p.rowCount === 0) {
      return { code: 404, msg: "未找到对应人员信息" };
    } else {
      await db.query("BEGIN");
      const new_identity_frontal_view = identity_frontal_view ? identity_frontal_view : old_p["rows"][0]["identity_frontal_view"];
      const new_identity_rear_view = identity_rear_view ? identity_rear_view : old_p["rows"][0]["identity_rear_view"];
      const new_license_frontal_view = license_frontal_view ? license_frontal_view : old_p["rows"][0]["license_frontal_view"];
      await db.query("UPDATE person SET identity_frontal_view = $1,identity_rear_view = $2, license_frontal_view = $3 WHERE id = $4", [new_identity_frontal_view, new_identity_rear_view, new_license_frontal_view, pid]);
      async_person(db, cache, pid);
      await db.query("COMMIT");
      return { code: 200, data: pid };
    }
  } catch (e) {
    log.info(e);
    await db.query("ROLLBACK");
    throw e;
  }
});



processor.callAsync("setPersonVerified", async (ctx: ProcessorContext, identiy_no: string, flag: boolean) => {
  log.info(`setPersonVerified, identiy_no: ${identiy_no},flag: ${flag}`);
  const db: PGClient = ctx.db;
  const cache: RedisClient = ctx.cache;
  try {
    const prep = await db.query("SELECT id FROM person WHERE identiy_no = $1", [identiy_no]);
    if (prep.rowCount === 0) {
      return { code: 404, msg: "未找到对应人员信息" };
    } else {
      const id = prep["rows"][0]["id"];
      await db.query("BEGIN");
      await db.query("UPDATE person SET verified = $1 WHERE identity_no = $2", [flag, identiy_no]);
      async_person(db, cache, id);
      await db.query("COMMIT");
      return { code: 200, data: "Success" };
    }
  } catch (e) {
    log.info(e);
    await db.query("ROLLBACK");
    throw e;
  }
});


async function async_person(db: PGClient, cache: RedisClient, id?: string): Promise<any> {
  try {
    const prep = await db.query("SELECT id, name, identity_no, phone, email, address, identity_frontal_view, identity_rear_view, license_frontal_view, verified FROM person WHERE deleted = false" + (id ? "AND id = $1" : ""), id ? [id] : []);
    const person = [];
    for (const row of prep["rows"]) {
      const p = {
        id: row.id,
        name: row.name,
        identity_no: row.identity_no,
        phone: row.phone,
        email: row.email,
        address: row.address,
        identity_frontal_view: row.identity_frontal_view,
        identity_rear_view: row.identity_rear_view,
        license_frontal_view: row.license_frontal_view,
        verified: row.verified
      };
      person.push(p);
    }
    const multi = bluebird.promisifyAll(cache.multi()) as Multi;
    for (const p of person) {
      const buffer_p = await msgpack_encode_async(p);
      multi.hset("person-entities", p["id"], buffer_p);
    }
    return multi.execAsync();
  } catch (e) {
    log.info(e);
    throw e;
  }
}


processor.callAsync("refresh", async (ctx: ProcessorContext, pid: string) => {
  log.info(`refresh,pid:${pid ? pid : ""} `);
  const db: PGClient = ctx.db;
  const cache: RedisClient = ctx.cache;
  try {
    if (pid) {
      await async_person(db, cache, pid);
      return { code: 200, data: "Success" };
    } else {
      await async_person(db, cache);
      return { code: 200, data: "Success" };
    }
  } catch (e) {
    log.info(e);
    return { code: 500, msg: e.message };
  }
});
