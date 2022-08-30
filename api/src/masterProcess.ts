import cluster from 'cluster';
import { cpus } from 'os';
import process, { exit } from 'process';
import { getLogger, Logger } from "log4js";

export function masterProcess() {
  const logger = getLogger();
  logger.addContext("processType", "master");
  logger.addContext("pid", process.pid);
  logger.info({
    message: "APIサーバ起動開始"
  })
  const cpusData = cpus()
  logger.trace({
    message: "cpu情報",
    numCpus: cpusData.length,
    cpus: cpusData
  })
  // ワーカープロセス起動
  for (let serverId = 0; serverId < cpusData.length; serverId++) {
    forkWoker(logger, serverId)
  }
  logger.trace({
    message: "初回ワーカーのforkを行った"
  })
}

function forkWoker(logger: Logger, serverId: number)  {
  logger.info({
    message: "ワーカーをforkする"
  })
  const worker = cluster.fork();
  // worker.on('message', messageHandler);
  const workerExit = (code: number, signal: string) => {
    if (code == 0) {
      logger.info({
        message: "ワーカーが正常終了した",
        workerId: worker.id,
        workerPid: worker.process.pid,
        signal,
        serverId
      });
    } else {
      logger.error({
        message: "ワーカーが異常終了した",
        workerId: worker.id,
        workerPid: worker.process.pid,
        signal,
        serverId
      });
      forkWoker(logger, serverId);
    }
  };
  worker.on("exit", workerExit);
  let isTerminating = false;
  const sigtermProcess = () => {
    logger.trace({
      message: "SIGTERMを受け取った"
    });
    if (isTerminating) {return}
    isTerminating = true;
    void (async ()=>{
      logger.info({
        message: "アプリケーションの終了を行います"
      })
      for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (worker) {
          worker.send({cmd: "SIGTERM"});
          logger.info({
            message: `ワーカーにSIGTERM通知を送信した`,
            worker: id,
          })
        }
      }
      logger.trace({
        message: "全ワーカーにSIGTERM通知を送信した"
      })
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (cluster.workers) {
          const numWorker = Object.keys(cluster.workers).length;
          logger.info(numWorker)
          if (numWorker == 0) {
            logger.info({
              message: "すべてのワーカーが終了した"
            })
            exit(0)
          }
        }
      }
    })()
  };
  process.on('SIGTERM', sigtermProcess)
}