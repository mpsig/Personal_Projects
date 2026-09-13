import { FileReportRepository } from '../lib/repository';
const repository = new FileReportRepository();
repository.withLock(()=>repository.rebuildIndex()).then(()=>console.log('Report index rebuilt.')).catch(error=>{console.error(error.message);process.exitCode=1;});
