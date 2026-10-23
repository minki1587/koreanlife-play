// Synchronous, lossless JSON storage encoding. It is compression, not a
// signature: decoded records still require the ordinary complete save checks.
export const SAVE_CODEC='koreanlife-keytable-v1';
export const SAVE_CODEC_THRESHOLD_BYTES=64*1024;
export const MAX_EXPANDED_SAVE_BYTES=8*1024*1024;
const MAX_NODES=1000000,MAX_DEPTH=64,unsafe=new Set(['__proto__','prototype','constructor']);
const utf8=new TextEncoder(),bytes=text=>utf8.encode(text).length;
function fail(code,message){const error=new TypeError(message);error.code=code;throw error;}
const sizeError=()=>fail('FILE_TOO_LARGE','저장 기록은 펼친 JSON 기준 8 MiB 이하만 보관하거나 불러올 수 있습니다.');
function parse(raw){if(typeof raw!=='string')fail('FILE_READ','저장 JSON 문자열을 확인해 주세요.');if(raw.length>MAX_EXPANDED_SAVE_BYTES||bytes(raw)>MAX_EXPANDED_SAVE_BYTES)sizeError();try{return JSON.parse(raw);}catch{fail('JSON_INVALID','저장 JSON 파일을 읽을 수 없습니다.');}}

export function encodeSaveRecord(value,{minimumBytes=SAVE_CODEC_THRESHOLD_BYTES}={}){
 let ordinary;try{ordinary=JSON.stringify(value);}catch{fail('JSON_INVALID','저장할 JSON 기록을 확인해 주세요.');}
 if(typeof ordinary!=='string')fail('JSON_INVALID','저장할 JSON 기록을 확인해 주세요.');const originalBytes=bytes(ordinary);if(originalBytes>MAX_EXPANDED_SAVE_BYTES)sizeError();if(originalBytes<minimumBytes)return ordinary;
 const source=JSON.parse(ordinary),keys=[],keyIndices=new Map(),counts=new Map();let nodes=0;
 function scan(node,depth){if(depth>MAX_DEPTH||++nodes>MAX_NODES)fail('JSON_COMPLEXITY','저장 기록의 중첩 구조나 항목 수를 확인해 주세요.');if(typeof node==='string'){if(node.length>=8)counts.set(node,(counts.get(node)||0)+1);return;}if(node===null||typeof node!=='object')return;if(Array.isArray(node)){for(const child of node)scan(child,depth+1);return;}for(const [key,child]of Object.entries(node)){if(unsafe.has(key))fail('JSON_UNSAFE_KEY','저장 기록에 허용되지 않는 키가 있습니다.');if(!keyIndices.has(key)){keyIndices.set(key,keys.length);keys.push(key);}scan(child,depth+1);}}
 scan(source,0);if(keys.length>10000)return ordinary;
 const strings=[...counts].filter(([text,count])=>count>=2&&JSON.stringify(text).length*(count-1)>count*7).slice(0,100000).map(([text])=>text),stringIndices=new Map(strings.map((text,index)=>[text,index]));
 function pack(node){if(typeof node==='string'&&stringIndices.has(node))return[2,stringIndices.get(node)];if(node===null||typeof node!=='object')return node;if(Array.isArray(node))return[1,...node.map(pack)];const tuple=[0];for(const [key,child]of Object.entries(node))tuple.push(keyIndices.get(key),pack(child));return tuple;}
 const packed=JSON.stringify({codec:SAVE_CODEC,keys,strings,data:pack(source)});return bytes(packed)<originalBytes?packed:ordinary;
}

function checkPackedEnvelope(parsed){
 if(Object.keys(parsed).length!==4||!['codec','keys','strings','data'].every(key=>Object.hasOwn(parsed,key))||!Array.isArray(parsed.keys)||!Array.isArray(parsed.strings)||parsed.keys.length>10000||parsed.strings.length>100000||parsed.keys.some(key=>typeof key!=='string'||unsafe.has(key))||new Set(parsed.keys).size!==parsed.keys.length||parsed.strings.some(text=>typeof text!=='string'))fail('CODEC_INVALID','저장 압축 사전의 구조를 확인해 주세요.');
}
/** Use after an existing parser's raw-size/depth checks, before validSave. */
export function unpackParsedSaveRecord(parsed){
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.hasOwn(parsed,'codec'))return parsed;
 if(parsed.codec!==SAVE_CODEC){if(typeof parsed.codec==='string'&&parsed.codec.startsWith('koreanlife-'))fail('CODEC_VERSION','지원하지 않는 저장 압축 형식입니다.');return parsed;}
 checkPackedEnvelope(parsed);
 let nodes=0,characters=0;const consume=n=>{characters+=n;if(characters>MAX_EXPANDED_SAVE_BYTES)sizeError();},quoted=text=>JSON.stringify(text).length;
 function unpack(node,depth){
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)fail('JSON_COMPLEXITY','저장 기록의 중첩 구조나 항목 수를 확인해 주세요.');
  if(node===null||typeof node==='boolean'||typeof node==='string'||typeof node==='number'&&Number.isFinite(node)){consume(JSON.stringify(node).length);return node;}
  if(!Array.isArray(node))fail('CODEC_INVALID','저장 압축 값의 구조를 확인해 주세요.');
  if(node[0]===2){if(node.length!==2||!Number.isSafeInteger(node[1])||node[1]<0||node[1]>=parsed.strings.length)fail('CODEC_INVALID','저장 문자열 사전의 번호가 올바르지 않습니다.');const text=parsed.strings[node[1]];consume(quoted(text));return text;}
  if(node[0]===1){consume(2+Math.max(0,node.length-2));return node.slice(1).map(child=>unpack(child,depth+1));}
  if(node[0]!==0||node.length%2!==1)fail('CODEC_INVALID','저장 객체의 구조를 확인해 주세요.');
  const result={},seen=new Set();consume(2+Math.max(0,(node.length-1)/2-1));
  for(let index=1;index<node.length;index+=2){const id=node[index];if(!Number.isSafeInteger(id)||id<0||id>=parsed.keys.length||seen.has(id))fail('CODEC_INVALID','저장 키 사전의 번호 또는 중복 키를 확인해 주세요.');seen.add(id);const key=parsed.keys[id];consume(quoted(key)+1);Object.defineProperty(result,key,{value:unpack(node[index+1],depth+1),enumerable:true,writable:true,configurable:true});}
  return result;
 }
 const result=unpack(parsed.data,0);if(bytes(JSON.stringify(result))>MAX_EXPANDED_SAVE_BYTES)sizeError();return result;
}
export function decodeSaveRecord(raw){return unpackParsedSaveRecord(parse(raw));}

function boundedMetadata(value,{strings=null}={}){
 const stack=[{value,depth:0}];let nodes=0,characters=0;
 while(stack.length){const item=stack.pop(),node=item.value;if(++nodes>64||item.depth>8)return false;
  if(typeof node==='string'){characters+=node.length;if(characters>4096)return false;}
  else if(node&&typeof node==='object'){
   if(strings&&Array.isArray(node)&&node[0]===2){if(node.length!==2||!Number.isSafeInteger(node[1])||node[1]<0||node[1]>=strings.length)return false;characters+=strings[node[1]].length;if(characters>4096)return false;}
   for(const [key,child]of Object.entries(node)){if(unsafe.has(key))return false;stack.push({value:child,depth:item.depth+1});}
  }
 }
 return true;
}
/** Read only the small save revision header. This is NOT life validation:
 * imports/resumes still decode and validate the entire life through their
 * existing paths. The coordinator separately compares the exact stored bytes.
 */
export function peekSaveMetadata(raw){try{
 const parsed=parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;let metadata;
 if(parsed.codec===SAVE_CODEC){
  checkPackedEnvelope(parsed);const root=parsed.data;if(!Array.isArray(root)||root[0]!==0||root.length%2!==1)return null;
  const seen=new Set();let found=false,tuple;
  for(let index=1;index<root.length;index+=2){const id=root[index],node=root[index+1];if(!Number.isSafeInteger(id)||id<0||id>=parsed.keys.length||seen.has(id))return null;seen.add(id);
   if(node!==null&&typeof node==='object'&&(!Array.isArray(node)||![0,1,2].includes(node[0])||node[0]===0&&node.length%2!==1||node[0]===2&&(node.length!==2||!Number.isSafeInteger(node[1])||node[1]<0||node[1]>=parsed.strings.length)))return null;
   if(parsed.keys[id]==='saveMetadata'){found=true;tuple=node;}
  }
  if(!found||!boundedMetadata(tuple,{strings:parsed.strings}))return null;metadata=unpackParsedSaveRecord({...parsed,data:tuple});
 }else{if(typeof parsed.codec==='string'&&parsed.codec.startsWith('koreanlife-'))return null;metadata=parsed.saveMetadata;if(!boundedMetadata(metadata))return null;}
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||bytes(JSON.stringify(metadata))>4096)return null;return metadata;
}catch{return null;}}
