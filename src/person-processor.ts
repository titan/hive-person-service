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

processor.callAsync("createPerson", async (ctx: ProcessorContext,
  people: Object[]) => {

});

processor.callAsync("getPerson", async (ctx: ProcessorContext,
  people: Object[]) => {

});

processor.callAsync("addDrivers", async (ctx: ProcessorContext,
  people: Object[]) => {

});

processor.callAsync("delDrivers", async (ctx: ProcessorContext,
  people: Object[]) => {

});

processor.callAsync("uploadImages", async (ctx: ProcessorContext,
  people: Object[]) => {

});

processor.callAsync("setPersonVerified", async (ctx: ProcessorContext,
  people: Object[]) => {

});