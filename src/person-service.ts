import { Service, Server, Processor, Config } from "hive-service";
import { server } from "./person-server";
import { processor } from "./person-processor";
import * as bunyan from "bunyan";

const log = bunyan.createLogger({
  name: "person-service",
  streams: [
    {
      level: "info",
      path: "/var/log/person-service-info.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1d",   // daily rotation
      count: 7        // keep 7 back copies
    },
    {
      level: "error",
      path: "/var/log/person-service-error.log",  // log ERROR and above to a file
      type: "rotating-file",
      period: "1w",   // daily rotation
      count: 3        // keep 7 back copies
    }
  ]
});

const config: Config = {
  modname: "person",
  serveraddr: process.env["PERSON"],
  queueaddr: "ipc:///tmp/person.ipc",
  cachehost: process.env["CACHE_HOST"],
  dbhost: process.env["DB_HOST"],
  dbuser: process.env["DB_USER"],
  dbport: process.env["DB_PORT"],
  database: process.env["DB_NAME"],
  dbpasswd: process.env["DB_PASSWORD"],
  loginfo: (...x) => log.info(x),
  logerror: (...x) => log.error(x),
};

const svc: Service = new Service(config);

svc.registerServer(server);
svc.registerProcessor(processor);

svc.run();

