import {getLogger, Logger} from "log4js";
import express, { ErrorRequestHandler, Request, Response, Express } from "express";
import { initialize } from "express-openapi";
import { exit } from "process";
import { Pool } from "pg";
import dayjs from "dayjs";

export async function initExpress(pool: Pool): Promise<Express> {
  const app = express();
	app.use((req, res, next) => {
		const logger = getLogger();
		const accessId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
		logger.addContext("accessId", accessId);
		logger.addContext("method", req.method);
		logger.addContext("url", req.url);
		logger.addContext("accessTime", dayjs().format())
		logger.trace({
			message: "アクセスログ",
		})
		res.locals.logger = logger;
		next();
	})

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));


	const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
		const logger = res.locals.logger as Logger;
		logger.trace({message: "エラールート"})
		if (err instanceof SyntaxError && 'status' in err && err["status"] == 400 &&'body' in err) {
			logger.trace({
				message: "JSONパース失敗",
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				error: err
			})
			return res.status(400).send({
				result: "Failed",
				message: "JSON Parse Error",
				requestBody: err["body"]
			});
		}
		next();
	};
	
	app.use(errorHandler);

  await initOpenApi(app, pool);

	app.use((req, res) => {
		const logger = res.locals.logger as Logger;
		logger.trace({
			message: "指定外のパスのリクエストを受け取った"
		})
		res.status(404);
		const resBody = {
			result: "Failed",
			message: "Not Found"
		};
		res.send(resBody)
		logger.trace({
			message: "レスポンスしました"
		})
	})
  return app;
}

async function initOpenApi(app: Express, pool: Pool) {
  await initialize({
		app: app,
		apiDoc: "/openapi/openapi.yml",
		validateApiDoc: true,
		operations: {
			getArticles: [
				async function (req: Request, res: Response) {
					const logger = res.locals.logger as Logger;
					logger.trace({
						message: "リクエストを受け取った",
						...req.body});
					const resBody = JSON.stringify({
						result: "Ok",
						articles: [{
							id: 1,
							content: "sample content",
							createdAt: "2022-08-21T06:55:27.738Z"
						}]
					});
					// DBコネクション取得
					let dbConnection;
					try {
						dbConnection = await pool.connect();
					} catch(error) {
						logger.error({
							message: "DBコネクション失敗",
							error: error
						})
						const resCode = 500;
						const resBody = {
							result: "Failed",
							message: "DB Connection Error",
						};
						res.send(resBody);
						logger.trace({
							message: "レスポンスしました",
							resBody: resBody,
							resCode: resCode
						});
						return;
					}

					let result;
					try {
						result = await dbConnection.query("SELECT * FROM article");
					} catch(error) {
						logger.error({
							message: "データ取得失敗",
							error: error
						})
						const resCode = 500;
						const resBody = {
							result: "Failed",
							message: "DB Query Error",
						};
						res.send(resBody);
						logger.trace({
							message: "レスポンスしました",
							resBody: resBody,
							resCode: resCode
						});
						return;
					}
					logger.debug({
						message: "データを取得した",
						row: result.rows,
						count: result.rowCount
					})

					try {
						// コネクション返却
						dbConnection.release();	
					} catch(error) {
						logger.warn({
							message: "コネクション返却失敗",
							error: error
						})
					}
					const resCode = 200;
					logger.trace({resBody: resBody});
					res.status(resCode);
					res.send(resBody);
					logger.trace({message: "レスポンスしました"});
				}
			],
			postArticles: function (req: Request, res: Response) {
				const logger = res.locals.logger as Logger;
				logger.trace({
					message: "トレース",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					reqBody: req.body
				})
				res.send({
					result: "Ok"
				})
			},
		},
		errorMiddleware: errorMiddleware
	});
}

function errorMiddleware(err: any, req: Request, res: Response) {
  const logger = res.locals.logger as Logger;
  logger.trace({
    message: "バリデーション失敗",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    error: err
  })
  if ("errors" in err) {
    res.status(400);
    res.send({
      result: "Failed",
      message: "Validation Error",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      errors: err["errors"]
    })
  }
}