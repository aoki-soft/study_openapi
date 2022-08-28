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
import http from 'http';
import { cpus } from 'os';
import process from 'process';

const masterProcess = () => {
  // httpリクエストを追跡します
  console.log(process.pid);
  let numReqs = 0;
  setInterval(() => {
    console.log(`numReqs = ${numReqs}`);
  }, 1000);

  //リクエストをカウントします
  const messageHandler = (msg: { cmd: string; }) => {
    console.log(msg);
    if (msg.cmd && msg.cmd === 'notifyRequest') {
      numReqs += 1;
    }
  }

  const forkWoker = () => {
    const worker = cluster.fork();
    worker.on('message', messageHandler);
    worker.on("exit", (code, signal) => {
      console.log(`[${worker.id}] Worker died : [PID ${worker.process.pid!}] [Signal ${signal}] [Code ${code}]`);
      forkWoker();
    })
  }

  //ワーカーを起動し、notifyRequestを含むメッセージをリッスンします
  const numCPUs = cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    forkWoker()
  }

  process.on('SIGTERM', () => {
    console.log("SIGTERMを受け取りました");
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        console.log(`ワーカーに送信しました ${id}`)
        worker.send({cmd: "SIGTERM"})
      }
    }
  })
}

const workerProcess = () => {
  //ワーカープロセスにはhttpサーバーがあります。
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  new
    //ワーカープロセスにはhttpサーバーがあります。
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    http.Server((_req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      res.writeHead(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      res.end('hello world\n');

      //リクエストについてプライマリに通知します
      process.send!({ cmd: 'notifyRequest' });
    }).listen(4050);

  process.on("message", (msg) => {
    console.log(msg);
    const thisWorker = cluster.worker
    if (thisWorker) {
      console.log(`${thisWorker.id} ワーカーがメッセージを受け取りました`)
    }
  })
  
}

if (cluster.isPrimary) {
  masterProcess()
} else {
  workerProcess()
}