import cluster from 'cluster';
import { initLogger } from "./logger";
import { workerProcess } from './workerProcess';
import { masterProcess } from './masterProcess';

(() => {
	initLogger();
	if (cluster.isPrimary) {
		masterProcess()
	} else {
		void workerProcess()
	}
})();
