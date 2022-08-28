import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
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


  
}

function forkWoker(logger: Logger, serverId: number)  {
  logger.info({
    message: "ワーカーをforkする"
  })
  const worker = cluster.fork();
  // worker.on('message', messageHandler);
  worker.on("exit", (code, signal) => {
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
  })
}