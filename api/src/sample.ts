// import {getLogger, Logger} from "log4js";
// import { initLogger } from "./logger";
// import cluster from "cluster";
// import { cpus } from "os"
// import express from "express"
// import { exit } from "process";

// const HOST = process.env.HOST || "127.0.0.1"
// const PORT = process.env.PORT || 4050;

// const masterProcess = () => {
//   const logger = getLogger();
//   const numCpus = cpus().length;
//   logger.addContext("cluster", "Master");
//   logger.info(`Master ${process.pid} is running`);
  
//   const workerFork = () => {
//     const worker = cluster.fork();
//     worker.on("message", (msg) => {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//       console.log(msg)
//       logger.info(`${worker.id} メッセージを受け取った`)
//     })
//     worker.on("exit", (code, signal) => {
//       logger.error(`[${worker.id}] Worker died : [PID ${worker.process.pid!}] [Signal ${signal}] [Code ${code}]`);
//       workerFork();
//     })
//   }

//   for (let i = 0; i < numCpus; i++) {
//     workerFork()
//   }

//   // for (const id in cluster.workers) {
//   //   cluster.workers[id]?.on("message", (msg)=>{
//   //     cluster.workers![id]!.send('hi there');
//   //   })
//   // }
// }


// const workerProces = () => {
//   const logger = getLogger();
//   logger.addContext("logType", "ワーカーログ");
//   logger.info(`Worker ${process.pid} start`)
//   const app = express();
//   app.get('/', (req, res) => {
//     logger.info(`リクエストを受け取った ${cluster.worker!.id} Worker ${process.pid}`)
//     res.send(`${cluster.worker!.id} Worker ${process.pid}`);
//     process.send!({ cmd: 'notifyRequest' });
//   })
//   const server = app.listen(PORT)
//   server.on('error', (error) => {
//     logger.fatal("サーバが終了しました")
//     exit(1)
//     // logger.fatal(error);
//   })
//   server.on('listening', () => {
//     logger.info("Server running on http://" + HOST + ":" + PORT.toString() + ` Worker ${process.pid} started`)
//   })
//   process.on('message', (msg) => {
//     // process.send!(msg);
//     logger.info(msg)
//     logger.info("ok?")
//   });

//   // await new Promise(resolve => setTimeout(resolve, 3000))
//   // exit(1)
// }

// void (() => {
//   initLogger();
//   if (cluster.isPrimary) {
//     masterProcess()
//   } else {
//    workerProces()
//   }
// })()


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
      logger.info(`[${worker.id}] Worker died : [PID ${worker.process.pid!}] [Signal ${signal}] [Code ${code}]`);
      forkWoker();
    })
  }

  //ワーカーを起動し、notifyRequestを含むメッセージをリッスンします
  const numCPUs = cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    forkWoker()
  }

  process.on('SIGTERM', () => {
    logger.info("SIGTERMを受け取りました");
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        logger.info(`ワーカーに送信しました ${id}`)
        worker.send({cmd: "SIGTERM"});
      }
    }
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
        logger.info(`${thisWorker.id} ワーカーがメッセージを受け取りました`)
      }
    }
  })
}

if (cluster.isPrimary) {
  masterProcess()
} else {
  workerProcess()
}