/** Read-only presentation of the same blockers used by the game clock. */
export function clockPresentation(flags={}){
 const inGame=flags.inGame===true,phase=flags.phase;
 const waiting=phase==='decision',care=!!flags.carePending;
 const saving=!!(flags.saveConflict||flags.recoveryRequired||flags.quotaBlocked);
 const blocked=saving||care||!!flags.militaryDuty||!!flags.lifestylePending||!!flags.homePending||waiting||!!(flags.paused||flags.documentHidden||flags.toolOpen||flags.assetBusy||flags.decisionOpen);
 const canRun=inGame&&phase==='running'&&!blocked;
 let reason='running',label='삶이 흐르는 중',helpAction=null,helpLabel='';
 if(!inGame){reason='inactive';label='삶을 시작해 주세요';}
 else if(phase==='ended'){reason='ended';label='이 삶의 기록을 마쳤어요';}
 else if(flags.saveConflict){reason='save-conflict';label='저장 충돌 · 최신 기록 확인 필요';helpAction='notices';helpLabel='저장 충돌 해결';}
 else if(flags.recoveryRequired){reason='save-recovery';label='저장 복구 확인 · 시간 정지';helpAction='notices';helpLabel='복구 안내 보기';}
 else if(flags.quotaBlocked){reason='storage-quota';label='저장 공간 부족 · 시간 정지';helpAction='storage';helpLabel='백업·공간 관리';}
 else if(care){reason='injury-care';label='부상 대응 선택 대기 · 시간 정지';if(!flags.toolOpen){helpAction='injury';helpLabel='대응 방법 선택';}}
 else if(flags.militaryDuty){reason=flags.militaryDuty==='service'?'service-duty':'reserve-duty';label=flags.militaryDuty==='service'?'복무할 군 선택 대기 · 시간 정지':'예비군 훈련 선택 대기 · 시간 정지';if(!flags.toolOpen){helpAction='military';helpLabel=flags.militaryDuty==='service'?'복무 선택':'예비군 훈련 선택';}}
 else if(flags.lifestylePending){reason='lifestyle';label='생활 수준 선택 대기 · 시간 정지';if(!flags.toolOpen){helpAction='lifestyle';helpLabel='생활 수준 선택';}}
 else if(flags.homePending){reason='home';label='내 집 마련 제안 대기 · 시간 정지';if(!flags.toolOpen){helpAction='home';helpLabel='내 집 마련 제안 보기';}}
 else if(waiting){reason='decision';label='갈림길 선택 대기 · 시간 정지';if(!flags.toolOpen){helpAction='decision';helpLabel='갈림길 선택';}}
 else if(flags.assetBusy){reason='assets';label='자료 준비 중 · 시간 정지';helpAction='assets';helpLabel='자료 준비 확인';}
 else if(flags.toolOpen||flags.decisionOpen){reason='dialog';label='선택 창을 보는 동안 시간 정지';}
 else if(flags.paused){reason='paused';label='내가 일시정지한 상태';helpAction='resume';helpLabel='계속 흐르기';}
 else if(flags.documentHidden){reason='hidden';label='다른 탭을 보는 동안 시간 정지';}
 else if(phase!=='running'){reason='inactive';label='진행 상태 확인 중';}
 const controlsBlocked=!inGame||phase!=='running'||saving||care||!!flags.militaryDuty||!!flags.lifestylePending||!!flags.homePending||!!(flags.toolOpen||flags.assetBusy||flags.decisionOpen);
 return{reason,label,canRun,still:!canRun,helpAction,helpLabel,
  pauseLabel:flags.paused?'▶ 계속 흐르기':'Ⅱ 일시정지',pauseDisabled:controlsBlocked,nextDisabled:controlsBlocked,
  nextLabel:flags.fastForward?'빠른 월 진행 멈추기 ■':'다음 갈림길까지 ›',fastForward:!!flags.fastForward};
}

/** Keyboard playback uses the same blockers as the visible pause control. */
export function playbackShortcutAllowed(event,flags={},activeElement=null){
 if(event?.code!=='Space'||event.repeat||event.isComposing||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||clockPresentation(flags).pauseDisabled)return false;
 const interactive='input,button,textarea,select,summary,a,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="textbox"],[role="slider"],[role="checkbox"],[role="switch"],#timeline-panel';
 return![event.target,activeElement].some(node=>node&&(node.isContentEditable||['INPUT','BUTTON','TEXTAREA','SELECT','SUMMARY','A'].includes(node.tagName)||node.closest?.(interactive)));
}
