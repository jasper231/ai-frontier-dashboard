const {execFile}=require('node:child_process');
function fetchFeed(url){return new Promise((resolve,reject)=>{
 execFile('curl',['--silent','--show-error','--fail','--location','--max-redirs','3','--proto','=https','--proto-redir','=https','--connect-timeout','5','--max-time','12','--max-filesize','3000000','--retry','0',url],{encoding:'utf8',timeout:14000,maxBuffer:3100000},(error,stdout,stderr)=>{
  if(error){const failure=new Error((stderr||error.message).trim());failure.code=error.code;failure.httpStatus=Number(/returned error:\s*(\d{3})/.exec(stderr)?.[1])||null;reject(failure);}else resolve(stdout);
 });
});}
module.exports={fetchFeed};
