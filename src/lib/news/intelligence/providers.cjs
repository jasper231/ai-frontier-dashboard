/* No HTTP client or SDK in phase one. Even selecting OpenAI cannot spend money. */
function createProvider({mode='rules',mockResponse,apiKey}={}){
 if(mode==='rules')return {id:'rules',kind:'rules'};
 if(mode==='mock')return {id:'mock',kind:'mock',model:'fixture-v1',async analyze(input){
  if(mockResponse!==undefined)return structuredClone(mockResponse);
  return {schemaVersion:1,items:input.candidates.map((item,index)=>({id:item.id,title:item.title.slice(0,100),importance:Math.max(0,96-index),longTermImportance:Math.max(0,93-index),horizonYears:7,
   whatHappened:'Mock 测试：'+item.summary,whyItMatters:'Mock 测试分析：用于验证独立分析字段进入展示层，并非 GPT 结论。',longTermImpact:'Mock 测试情景：3–10 年影响尚需真实模型与证据评估。',opportunity:'Mock：验证工作流和机会字段的传递。',risk:'Mock：测试输出不代表真实研判。',
   credibility:{score:75,sourceQuality:/arxiv/i.test(item.source)?'research-preprint':'official-primary',assessment:'Mock 来源评估，不代表事实已获独立验证。'},confidence:0.9,evidenceIds:[item.id],relatedNewsIds:[],duplicateOf:null}))};
 }};
 if(mode==='openai')return {id:'openai',kind:'ai',model:null,async analyze(){
  const error=new Error('OpenAI transport intentionally disabled in phase one');error.code=apiKey?'OPENAI_NOT_IMPLEMENTED':'MISSING_API_KEY';throw error;
 }};
 return {id:'unconfigured',kind:'ai',async analyze(){throw new Error('Unknown AI provider');}};
}
module.exports={createProvider};
