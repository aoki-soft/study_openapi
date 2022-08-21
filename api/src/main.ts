import {getLogger, Logger} from "log4js";
import express, { Request, Response } from "express";
import { initialize } from "express-openapi";
import { initLogger } from "./logger";
import { exit } from "process";
import { Pool } from "pg";

void (async ()=>{
	initLogger();

	
	const pool = new Pool({
		host: 'db',
		database: 'api_db',
		user: 'admin',
		password: 'admin',
		port: 5432,
		max: 10
	})


	const logger = getLogger();
	logger.info({
		message: "apiサーバ起動開始"
	});

	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use((req, res, next) => {
		const logger = getLogger();
		const accessId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
		logger.addContext("accessId", accessId);
		logger.trace({
			message: "アクセスログ",
			path: req.url
		})
		res.locals.logger = logger;
		next();
	})
	
	await initialize({
		app: app,
		apiDoc: "/openapi/openapi.yml",
		validateApiDoc: true,
		operations: {
			getUser: [
				async function (req: Request, res: Response) {
					const logger = res.locals.logger as Logger;
					logger.trace({
						message: "get /users",
						...req.body});
					const resBody = JSON.stringify({
						id: 1,
						name: "hatano"
					});
					logger.trace({
						message: "DBコネクション取得前",
						totalCount: pool.totalCount,
						idleCount: pool.idleCount,
						waitingCount: pool.waitingCount
					})
					 // DBコネクション取得
					const dbConnection = await pool.connect();
					logger.trace({
						message: "DBコネクション取得後",
						totalCount: pool.totalCount,
						idleCount: pool.idleCount,
						waitingCount: pool.waitingCount
					})

					const result = await dbConnection.query("SELECT * FROM article");
					
					// コネクション返却
    			dbConnection.release();
					logger.trace({
						message: "DBコネクション返却後",
						totalCount: pool.totalCount,
						idleCount: pool.idleCount,
						waitingCount: pool.waitingCount
					})

					logger.debug({
						message: "データを取得しました",
						row: result.rows,
						count: result.rowCount
					})

					logger.trace({resBody: resBody});
					res.send(resBody);
					logger.trace({message: "レスポンス成功"});
				}
			]
		}
	});

	const port = process.env.PORT || 4050;
	const httpServer = app.listen(port, () => {
		logger.debug({
			message: "HTTPサーバ起動中",
			port: port
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
			port: port
		})
	}
	httpServer.addListener("listening", okListeng)

	function closeHttpServer() {
		logger.fatal({
			message: "HTTPサーバ終了しました",
			port: port
		})
		exit(1)
	}
	httpServer.addListener("close", closeHttpServer)

	process.on('SIGTERM', () => {
		logger.info({
			message: "SIGTERMを受け取りました"
		})
		httpServer.removeListener("close", closeHttpServer);
		function okCloseHttpServer() {
			logger.info({
				message: "HTTPサーバを正常に終了しました"
			});
			exit(0);
		}
		httpServer.addListener("close", okCloseHttpServer);
		httpServer.close(() => {
			logger.info({
				message: "HTTPサーバを終了します"
			})
		})
	});
	
})();
