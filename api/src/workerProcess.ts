import {getLogger, Logger} from "log4js";
import cluster from 'cluster';
import express, { ErrorRequestHandler, Request, Response, Express } from "express";
import { initialize } from "express-openapi";
import { exit } from "process";
import { Pool } from "pg";
import dayjs from "dayjs";
import { initExpress } from "./initExpress";

const PORT = process.env.PORT || 4050;

export const workerProcess = async () => {
	const logger = getLogger();
  logger.addContext("processType", "worker");
  logger.addContext("pid", process.pid);

  const pool = await getDbPool(logger);
  const app = await initExpress(pool);

	const httpServer = app.listen(PORT, () => {
		logger.debug({
			message: "HTTPサーバ起動中",
			port: PORT
		});
	});

	httpServer.addListener("error", (error)=>{
		logger.error({
			message: "HTTPサーバ起動失敗",
			error: error
		})
		exit(1)
	})

	function okListeng() {
		logger.info({
			message: "HTTPサーバ起動成功",
			port: PORT
		})
	}
	httpServer.addListener("listening", okListeng)

	function closeHttpServer() {
		logger.error({
			message: "HTTPサーバ終了しました",
			port: PORT
		})
		exit(1)
	}
	httpServer.addListener("close", closeHttpServer)

  process.on("message", (msg: { cmd: string; }) => {
    logger.debug({
			message: "マスタープロセスからメッセージを取得した",
			msg,
		});
    if (msg.cmd && msg.cmd == "SIGTERM") {
      const thisWorker = cluster.worker
      if (thisWorker) {
        logger.info({
					message: `${thisWorker.id} SIGTERMを受け取りました`
				})
        httpServer.close((error) => {
					if (error) {
						logger.error({
							message: "httpサーバの正常終了に失敗した"
						})
					} else {
						logger.info({
							message: "httpサーバーを正常終了した",
						})
					}
          exit(0);
        })
      }
    }
  })
}


async function getDbPool(logger: Logger): Promise<Pool> {
  const pool = new Pool({
		host: 'db',
		database: 'api_db',
		user: 'admin',
		password: 'admin',
		port: 5432,
		max: 10
	})
	
	try {
		await pool.connect();
	} catch(error) {
		logger.error({
			message: "起動時DBコネクション失敗",
			error: error
		})
		exit(1);
	}
  return pool
}