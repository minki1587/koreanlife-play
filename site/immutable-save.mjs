// Identity memoization is safe only for recursively frozen plain data. A frozen
// root containing a mutable child, an accessor, Date, Map or Set is not trusted.
const immutable=new WeakSet(),MAX_NODES=1000000,MAX_DEPTH=96;
const object=value=>value!==null&&typeof value==='object';
function descriptors(value){
 const proto=Object.getPrototypeOf(value);
 if(proto!==Object.prototype&&proto!==null&&!(Array.isArray(value)&&proto===Array.prototype))return null;
 const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))return null;
 const rows=keys.map(key=>Object.getOwnPropertyDescriptor(value,key));
 return rows.every(row=>row&&Object.hasOwn(row,'value'))?rows:null;
}
export function isImmutableSaveSnapshot(value){
 if(!object(value))return false;if(immutable.has(value))return true;
 const visiting=new WeakSet(),finished=[];let nodes=0;
 function visit(node,depth){
  if(!object(node))return node===null||['string','boolean','undefined'].includes(typeof node)||typeof node==='number'&&Number.isFinite(node);
  if(immutable.has(node))return true;if(depth>MAX_DEPTH||++nodes>MAX_NODES||!Object.isFrozen(node)||visiting.has(node))return false;
  const rows=descriptors(node);if(!rows)return false;visiting.add(node);
  for(const row of rows)if(!visit(row.value,depth+1))return false;
  visiting.delete(node);finished.push(node);return true;
 }
 if(!visit(value,0))return false;for(const node of finished)immutable.add(node);return true;
}
/** Freeze a new owned candidate before validation; it never marks data valid. */
export function freezeSaveSnapshot(value){
 if(!object(value))throw new TypeError('진행 기록은 일반 JSON 객체여야 합니다.');
 const visiting=new WeakSet(),finished=[];let nodes=0;
 function visit(node,depth){
  if(!object(node)){if(node!==null&&!['string','boolean','undefined'].includes(typeof node)&&!(typeof node==='number'&&Number.isFinite(node)))throw new TypeError('진행 기록에 일반 JSON 값이 아닌 항목이 있습니다.');return;}
  if(immutable.has(node))return;if(depth>MAX_DEPTH||++nodes>MAX_NODES||visiting.has(node))throw new TypeError('진행 기록의 중첩 구조를 확인해 주세요.');
  const rows=descriptors(node);if(!rows)throw new TypeError('진행 기록에 변경 가능한 특수 객체나 접근자가 있습니다.');
  visiting.add(node);for(const row of rows)visit(row.value,depth+1);visiting.delete(node);Object.freeze(node);finished.push(node);
 }
 visit(value,0);for(const node of finished)immutable.add(node);return value;
}
/** Mutable input always takes the original complete validation path. */
export function createFrozenValidationCache(validate){
 if(typeof validate!=='function')throw new TypeError('검증 함수를 확인해 주세요.');const results=new WeakMap();
 return function(value){
  if(!isImmutableSaveSnapshot(value))return validate(value);
  if(results.has(value))return results.get(value);
  const result=validate(value);results.set(value,result);return result;
 };
}
