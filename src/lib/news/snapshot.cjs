const {validateBatch}=require('./core.cjs');
function chooseSnapshot(generated,local){
 try{const batch=validateBatch(generated);if(batch.isDemo||!batch.items.length)throw new Error('No verified generated articles');return {batch,mode:'generated'};}catch(error){return {batch:validateBatch(local),mode:'local-fallback',reason:error.message};}
}
module.exports={chooseSnapshot};
