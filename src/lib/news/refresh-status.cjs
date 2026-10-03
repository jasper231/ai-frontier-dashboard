function refreshStatus(selection,report){return {
 lastUpdated:selection.mode==='generated'?selection.batch.asOf:null,
 lastAttempt:report.asOf,
 lastRefreshStatus:report.publication.written?'success':selection.mode==='generated'?'failed-using-last-good':'failed-using-local',
 activeSnapshot:selection.mode
};}
module.exports={refreshStatus};
