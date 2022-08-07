import {getLogger} from "log4js";
import express, { Request, Response, NextFunction } from "express";
import { initialize } from "express-openapi";
import path from "path";

let logger = getLogger();
logger.level = process.env.LOG_LEVEL || 'debug';
logger.info("Hello World!!");


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initialize({
	app: app,
	apiDoc: "/openapi/openapi.yml",
	validateApiDoc: true,
	operations: {
		getUser: [
			function (req: Request, res: Response) {
				res.send({
          id: 1,
					name: "hatano"
				});
			}
		]
	}
});

const port = process.env.PORT || 4050;
app.listen(port, () => {
	logger.info(`Start on port ${port}`);
});