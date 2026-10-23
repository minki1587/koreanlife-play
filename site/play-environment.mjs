/** Check capabilities before any direct storage access. Never writes a probe or
 * substitutes unlocked saving when the browser cannot coordinate save writes. */
export function checkPlayEnvironment({getStorage=()=>globalThis.localStorage,getLocks=()=>globalThis.navigator?.locks}={}){
 const issues=[];let storage=null,locks=null;
 try{
  const candidate=getStorage();
  if(!candidate||typeof candidate.getItem!=='function'||typeof candidate.setItem!=='function'||typeof candidate.removeItem!=='function')throw new Error('Storage unavailable');
  candidate.getItem('koreanlife-save-v2');
  storage=candidate;
 }catch{issues.push({code:'storage-unavailable',message:'브라우저에서 저장 공간에 접근할 수 없습니다. 이 사이트의 저장 권한을 허용한 뒤 다시 확인해 주세요.'});}
 try{const candidate=getLocks();if(!candidate||typeof candidate.request!=='function')throw new Error('Web Locks unavailable');locks=candidate;}
 catch{issues.push({code:'locks-unavailable',message:'이 브라우저에서는 기록을 안전하게 저장할 수 없습니다. 최신 브라우저의 HTTPS 주소에서 다시 열어 주세요.'});}
 return{supported:issues.length===0,storage,locks,issues,message:issues.map(issue=>issue.message).join('\n')};
}

/** A visible startup failure, while keeping the surrounding page usable. The
 * caller owns retry/bootstrap and must keep game mutations blocked on failure. */
export function renderPlayEnvironmentNotice(host,result,{document=host?.ownerDocument??globalThis.document,onRetry}={}){
 if(!host)return;
 host.replaceChildren();host.hidden=Boolean(result?.supported);
 if(result?.supported)return;
 host.setAttribute('role','alert');
 const title=document.createElement('h2');title.textContent='게임을 시작하기 전에 확인해 주세요';host.append(title);
 const list=document.createElement('ul');for(const issue of result?.issues||[]){const item=document.createElement('li');item.textContent=issue.message;list.append(item);}host.append(list);
 if(typeof onRetry==='function'){const button=document.createElement('button');button.type='button';button.textContent='실행 환경 다시 확인';button.addEventListener('click',onRetry);host.append(button);}
}
