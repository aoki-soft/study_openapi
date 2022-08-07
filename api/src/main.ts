import {getLogger} from "log4js";

let logger = getLogger();
logger.level = process.env.LOG_LEVEL || 'debug';
logger.info("Hello World!!");