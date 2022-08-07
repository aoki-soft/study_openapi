import {getLogger} from "log4js";
import express, { Request, Response } from "express";

let logger = getLogger();
logger.level = process.env.LOG_LEVEL || 'debug';
logger.info("Hello World!!");


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3000;
app.listen(port, () => {
	logger.info(`Start on port ${port}`);
});
app.get("/user", (req: Request, res: Response) => {
	res.send({
		name: "hatano"
	});
});