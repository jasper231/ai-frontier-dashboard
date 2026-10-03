/* Small namespace-aware XML tree parser, no npm, DTD or external entities. */
function decode(value){return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,key)=>{
 const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(key[0]!=='#')return named[key.toLowerCase()];const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);if(code<0||code>0x10ffff)throw new Error('Invalid entity');return String.fromCodePoint(code);
});}
function tree(xml){
 if(Buffer.byteLength(xml)>3000000)throw new Error('Feed too large');
 if(/<!\s*(DOCTYPE|ENTITY)/i.test(xml))throw new Error('DTD/entities not allowed');
 const document={name:'document',attrs:{},children:[]};const stack=[document];let at=0;
 while(at<xml.length){
  if(xml.startsWith('<!--',at)){const end=xml.indexOf('-->',at+4);if(end<0)throw new Error('Unclosed comment');at=end+3;continue;}
  if(xml.startsWith('<![CDATA[',at)){const end=xml.indexOf(']]>',at+9);if(end<0)throw new Error('Unclosed CDATA');stack.at(-1).children.push(xml.slice(at+9,end));at=end+3;continue;}
  if(xml.startsWith('<?',at)){const end=xml.indexOf('?>',at+2);if(end<0)throw new Error('Unclosed declaration');at=end+2;continue;}
  if(xml[at]!=='<'){const end=xml.indexOf('<',at);const stop=end<0?xml.length:end;stack.at(-1).children.push(decode(xml.slice(at,stop)));at=stop;continue;}
  let end=at+1,quote=null;for(;end<xml.length;end++){const ch=xml[end];if(quote){if(ch===quote)quote=null;}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
  if(end===xml.length)throw new Error('Unclosed XML tag');
  const tag=xml.slice(at+1,end).trim();at=end+1;
  if(tag.startsWith('/')){if(stack.length===1||stack.at(-1).name!==tag.slice(1).trim())throw new Error('Mismatched XML tag');stack.pop();continue;}
  const match=/^([A-Za-z_][\w:.-]*)([\s\S]*?)(\/?)$/.exec(tag);if(!match)throw new Error('Invalid XML tag');
  const node={name:match[1],attrs:{},children:[]};let attrs=match[2].trim();
  while(attrs){const a=/^([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*/.exec(attrs);if(!a)throw new Error('Invalid XML attributes');if(Object.hasOwn(node.attrs,a[1]))throw new Error('Duplicate XML attribute');node.attrs[a[1]]=decode(a[2]??a[3]);attrs=attrs.slice(a[0].length);}
  stack.at(-1).children.push(node);if(!match[3]){stack.push(node);if(stack.length>100)throw new Error('XML nesting limit');}
 }
 if(stack.length!==1)throw new Error('Unclosed XML elements');
 const roots=document.children.filter(c=>typeof c!=='string');if(roots.length!==1)throw new Error('Expected one XML root');return roots[0];
}
const local=node=>node.name.split(':').at(-1).toLowerCase();
const children=node=>node.children.filter(c=>typeof c!=='string');
const find=(node,name)=>children(node).find(c=>local(c)===name);
function rawText(node){return node.children.map(c=>typeof c==='string'?c:['script','style'].includes(local(c))?'':' '+rawText(c)+' ').join('');}
function plain(value){return decode(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();}
function text(node,name){const c=find(node,name);return c?plain(rawText(c)):'';}
function parseFeed(xml,baseUrl){
 const root=tree(xml);if(!['rss','rdf','feed'].includes(local(root)))throw new Error('Not an RSS/Atom feed');
 const atom=local(root)==='feed';const entries=[];
 function walk(node,base){const nextBase=new URL(node.attrs['xml:base']||'',base).href;if(local(node)===(atom?'entry':'item'))entries.push({node,base:nextBase});else for(const c of children(node))walk(c,nextBase);}
 walk(root,baseUrl);const records=[],errors=[];
 entries.slice(0,100).forEach(({node,base},index)=>{
  try{
   const title=text(node,'title'),publishedAt=atom?text(node,'published'):text(node,'pubdate')||text(node,'date');let link='';
   if(atom){const e=children(node).find(c=>local(c)==='link'&&(c.attrs.rel||'alternate')==='alternate'&&c.attrs.href);if(e)link=new URL(e.attrs.href,new URL(e.attrs['xml:base']||'',base)).href;}
   else{link=text(node,'link');const guid=find(node,'guid');if(!link&&guid&&(guid.attrs.isPermaLink||'true').toLowerCase()!=='false')link=text(node,'guid');if(link)link=new URL(link,base).href;}
   if(!title||!link||!publishedAt)throw new Error('Missing title, URL or original publication date');
   records.push({title,sourceUrl:link,publishedAt,content:atom?text(node,'summary')||text(node,'content'):text(node,'description')||text(node,'encoded')});
  }catch(error){errors.push({index,reason:error.message});}
 });
 return {format:atom?'atom':'rss',rawCount:entries.length,parsedCount:records.length,records,errors};
}
module.exports={parseFeed};
