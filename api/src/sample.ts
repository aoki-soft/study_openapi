import {getLogger, Logger} from "log4js";
import { initLogger } from "./logger";
import cluster from "cluster";
import { cpus } from "os"
import express from "express"
import { exit } from "process";

void (() => {
  const HOST = process.env.HOST || "127.0.0.1"
  const PORT = process.env.PORT || 4050;

  initLogger();
  const logger = getLogger();
  const numCpus = cpus().length;

  if (cluster.isPrimary) {
    logger.addContext("logType", "マスターログ");
    logger.info(`Master ${process.pid} is running`);
    
    for (let i = 0; i < numCpus; i++) {
      cluster.fork();
    }
  
    cluster.on('exit', (worker, code, signal) => {
      logger.error(`[${worker.id}] Worker died : [PID ${worker.process.pid!}] [Signal ${signal}] [Code ${code}]`);
      cluster.fork();
    });

    for (const id in cluster.workers) {
      cluster.workers[id]?.on("message", (msg)=>{
        logger.info(`${id} メッセージを受け取った`)
        cluster.workers![id]!.send('hi there');
      })
    }


  
  
  } else {
    logger.addContext("logType", "ワーカーログ");
    logger.info(`Worker ${process.pid} start`)
    const app = express();
    app.get('/', (req, res) => {
      res.send(`${cluster.worker!.id} Worker ${process.pid}`);
      // process.send({
      //   cmd: "notifyRequest"
      // })
      process.send!({ cmd: 'notifyRequest' });
    })
    const server = app.listen(PORT)
    server.on('error', (error) => {
      logger.fatal("サーバが終了しました")
      exit(1)
      // logger.fatal(error);
    })
    server.on('listening', () => {
      logger.info("Server running on http://" + HOST + ":" + PORT.toString() + ` Worker ${process.pid} started`)
    })

    process.on('message', (msg) => {
      // process.send!(msg);
      logger.info("ok?")
    });
  
    // await new Promise(resolve => setTimeout(resolve, 3000))
    // exit(1)
  }
})()
