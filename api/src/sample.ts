import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
import { initLogger } from "./logger";
import { getLogger } from "log4js";
import express from "express"
import {exit} from "process"
const HOST = process.env.HOST || "127.0.0.1"
const PORT = process.env.PORT || 4050;

initLogger();

const masterProcess = () => {
  const logger = getLogger();
  // httpリクエストを追跡します
  logger.info(process.pid);
  let numReqs = 0;
  setInterval(() => {
    logger.info(`numReqs = ${numReqs}`);
  }, 1000);

  //リクエストをカウントします
  const messageHandler = (msg: { cmd: string; }) => {
    if (msg.cmd && msg.cmd === 'notifyRequest') {
      logger.info(msg);
      numReqs += 1;
    }
  }

  const forkWoker = () => {
    const worker = cluster.fork();
    worker.on('message', messageHandler);
    worker.on("exit", (code, signal) => {
      if (code == 0) {
        logger.info("finish_server");
      } else {
        logger.info(`[${worker.id}] Worker died : [PID ${worker.process.pid!}] [Signal ${signal}] [Code ${code}]`);
        forkWoker();
      }
    })
  }

  //ワーカーを起動し、notifyRequestを含むメッセージをリッスンします
  const numCPUs = cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    forkWoker()
  }

  process.on('SIGTERM', () => {
    void (async ()=>{
      logger.info("SIGTERMを受け取りました");
      for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (worker) {
          logger.info(`ワーカーに送信しました ${id}`)
          worker.send({cmd: "SIGTERM"});
        }
      }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const numWorker = Object.keys(cluster.workers!).length;
        logger.info(numWorker)
        if (numWorker == 0) {
          logger.info("すべてのワーカーが正常終了しました")
          exit(0)
        }
      }
    })()
  })
}

const workerProcess = () => {
  const logger = getLogger();
  const app = express();
  app.get('/', (req, res) => {
    logger.info(`リクエストを受け取った ${cluster.worker!.id} Worker ${process.pid}`)
    res.send(`${cluster.worker!.id} Worker ${process.pid}`);
    process.send!({ cmd: 'notifyRequest' });
  })
  const server = app.listen(PORT)
  server.on('error', (error) => {
    logger.fatal("サーバが終了しました")
    exit(1)
  })
  server.on('listening', () => {
    logger.info("Server running on http://" + HOST + ":" + PORT.toString() + ` Worker ${process.pid} started`)
  })

  process.on("message", (msg: { cmd: string; }) => {
    logger.info(msg);
    if (msg.cmd && msg.cmd == "SIGTERM") {
      const thisWorker = cluster.worker
      if (thisWorker) {
        logger.info(`${thisWorker.id} SIGTERMを受け取りました`)
        server.close((error) => {
          logger.info("サーバーを終了しました")
          exit(0);
        })
      }
    }
  })
}

if (cluster.isPrimary) {
  masterProcess()
} else {
  workerProcess()
}