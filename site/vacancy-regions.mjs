// Representative game vacancies, separate from an occupation's legal limits.
// Existing jobs and family snapshots never consume these rules.
const mines={id:'mining-sites',regions:['경기','강원','충북','충남','경북'],label:'광산·채석 현장',sources:[
 {title:'산업통상부 동부광산안전사무소 관내광산현황',url:'https://www.motie.go.kr/mine/emine/mineIntroduction/coalMine/coalMineStatus.jsp'},
 {title:'산업통상부 서부광산안전사무소 일반광산현황',url:'https://www.motir.go.kr/mine/wmine/mineIntroduction/generalMine/generalMineStatus/generalMineStatus.jsp'}
]};
const ports={id:'port-sites',regions:['부산','인천','울산','전남','경남'],label:'항만·선박 현장',sources:[
 {title:'부산항만공사 부산항 시설현황',url:'https://www.busanpa.com/drh/index.bpa?menuCd=DOM_000000103000000000'},
 {title:'인천지방해양수산청 인천항',url:'https://incheon.mof.go.kr/ko/page.do?menuIdx=1778'},
 {title:'울산항만공사 울산항',url:'https://www.upa.or.kr/portal/contents.do?mid=0102000000'},
 {title:'여수광양항만공사',url:'https://www.ygpa.or.kr/?pageIdx=167'}
]};
const fishing={id:'coastal-fishing',regions:['부산','인천','울산','경기','강원','충남','전북','전남','경북','경남','제주'],label:'해안 어업 현장',sources:[
 {title:'국가데이터처 2025 농림어업총조사 시도별 어가',url:'https://mods.go.kr/boardDownload.es?bid=222&list_no=444750&seq=5'}
]};
const rules=new Map([
 ['know-705101',mines],['know-904201',fishing],
 ...['know-621201','know-621203','know-624301','know-812201','know-817301'].map(id=>[id,ports])
]);
export const VACANCY_REGION_VERSION='representative-vacancies-v1';
export function gameVacancyRegions(row){
 const rule=rules.get(row?.id);if(!rule)return null;
 return{version:VACANCY_REGION_VERSION,kind:'game_vacancy',...structuredClone(rule),note:'공식 산업·사업장 소재지를 참고해 선택한 대표 공고 지역입니다. 이 직업 전체의 지역 제한이나 실제 채용공고가 아닙니다.'};
}
