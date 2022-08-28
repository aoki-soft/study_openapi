import { getLogger, configure, addLayout, LoggingEvent } from "log4js";
import { install } from "source-map-support";

export function initLogger() {

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  install({
    environment: 'node'
  });


  const logLevel: string = process.env.LOG_LEVEL ||'all';

  addLayout("json", function() {
    return function(logEvent: LoggingEvent) {
      let source = undefined;
      if (logEvent.fileName && logEvent.lineNumber) {
        source = `${logEvent.fileName}:${logEvent.lineNumber}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = logEvent.data[0];
      const logEventJson = {
        time: logEvent.startTime,
        level: logEvent.level.levelStr,
        category: logEvent.categoryName,
        source: source,
        function: logEvent.functionName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        context: logEvent.context,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: data
      }
      return JSON.stringify(logEventJson);
    };
  });

  const config = {
    appenders: {
      out: { type: "stdout", layout: { type: "pattern", pattern: "%d %[%p%] %f:%l %m" } },
      // out: { type: "stdout", layout: { type: "json" } },
    },
    categories: {
      default: { appenders: ["out"], level: logLevel, enableCallStack: true },
    },
  };
  configure(config);

  const logger = getLogger();

  process.on('uncaughtException', function(error) {
    logger.fatal({
      message: "uncaughtException",
      error: error
    });
    process.exit(1);
  }); 

  // logger.info({
  //   message: "ロガーセットアップ完了",
  //   loggerConfig: config
  // })
}