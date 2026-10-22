import {pendingInjuryCare} from './injury-care.mjs?v=injury-copy-1';

/** A care interruption is independent of the existence of another life fork. */
export function storyView(state,next,latest=state?.timeline?.at(-1)){
 const decisionWaiting=state?.phase==='decision'&&!!next;
 return{
  decisionWaiting,
  waiting:state?.phase==='decision'||pendingInjuryCare(state),
  title:decisionWaiting?next.title:latest?.title||'새로운 삶이 시작되었습니다',
  text:decisionWaiting?next.text:latest?.text||'다음 계절을 맞이하며 조금씩 자랍니다.',
 };
}
