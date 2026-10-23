/** The review is historical; present-day service and settlement are authoritative. */
export function serviceReviewMessage(s){
 const review=s?.serviceReview;if(!review)return'';
 if(review.status==='recovering')return'회복을 마친 뒤 복무를 다시 검토할 수 있습니다.';
 if(review.status==='ready')return'현재 일상을 유지하거나, 복무 경로를 직접 선택할 수 있습니다.';
 if(review.status==='declined')return'현재 학업과 일을 이어가기로 했습니다.';
 if(review.status!=='enlisted')return'복무 선택 이력을 확인할 수 있습니다.';
 if(s.service?.active)return'회복 후 선택한 복무를 이어갑니다.';
 const settled=s.service?.savings?.settlement;
 if(settled?.reason==='maturity'||s.service?.savings?.status==='matured')return'복무를 마쳤습니다. 전역 급여와 적금 정산 기록을 확인할 수 있습니다.';
 if(settled)return'복무를 마치기 전에 급여와 적금을 정산했습니다. 정산 기록을 확인할 수 있습니다.';
 return'복무를 마쳤습니다. 지난 복무 이력을 확인할 수 있습니다.';
}
