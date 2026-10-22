/** Career ladders are explicit game rules, separate from source/legal fields. */
export const CAREER_PROGRESSION_VERSION='career-progression-v1';
const idOf=row=>typeof row==='string'?row:row?.id,code=id=>String(id||'').replace('know-',''),validId=id=>/^know-\d{6}$/.test(id),months=n=>Number.isInteger(n)&&n>=0;
const LABELS={total:'확인된 직업 경력',management:'관리직 경력',public:'공공행정 경력',business:'경영·사무 경력',finance:'금융·회계 경력',research:'연구·기술 경력',teaching:'학교 교육 경력',earlyTeaching:'유아 교육 경력',higherTeaching:'대학 교육 경력',safety:'경찰·소방·보안 경력',medical:'보건·의료 경력',social:'복지 경력',creative:'예술·방송·디자인 경력',digital:'정보통신 경력',travel:'여행·숙박 경력',food:'음식 서비스 경력',transport:'운송 경력',sales:'영업·판매 경력',construction:'건설·채굴 경력',production:'설비·제조 경력'};
function inField(id,field){const c=code(id);switch(field){
 case'total':return validId(id);
 case'management':return c.startsWith('01');
 case'public':return ['011102','012101','021001','025401','025402'].includes(c);
 case'business':return c.startsWith('02')||c.startsWith('0122')||c.startsWith('0123');
 case'finance':return c.startsWith('03')||c.startsWith('023')||c.startsWith('0124');
 case'research':return /^(11|12|13|14|15)/.test(c)||c==='013101';
 case'teaching':return /^(211|212|213)/.test(c)||c==='304003'||/^01320/.test(c);
 case'earlyTeaching':return c.startsWith('213')||c==='232101'||c==='013201';
 case'higherTeaching':return c.startsWith('211')||c==='013204';
 case'safety':return c.startsWith('24')||c.startsWith('54')||c==='013305';
 case'medical':return c.startsWith('30')||c==='013401';
 case'social':return c.startsWith('23')||c==='013501';
 case'creative':return c.startsWith('41')||c.startsWith('42')||c==='013601';
 case'digital':return c.startsWith('13')||c==='013701';
 case'travel':return c.startsWith('52')||c==='014103';
 case'food':return c.startsWith('53')||c==='014201';
 case'transport':return c.startsWith('62')||c==='015201';
 case'sales':return c.startsWith('61')||c==='015101';
 case'construction':return c.startsWith('70')||c==='016101';
 case'production':return c.startsWith('81')||c.startsWith('82')||c.startsWith('83')||c.startsWith('84')||/^016[23]/.test(c);
 default:return false;
}}
const managementFields={'012101':'public','012201':'business','012301':'business','012401':'finance','012402':'finance','013101':'research','013201':'earlyTeaching','013305':'safety','013401':'medical','013501':'social','013601':'creative','013701':'digital','014103':'travel','014201':'food','015101':'sales','015201':'transport','016101':'construction','016201':'production','016301':'production'};
export function careerProgressionRule(row){
 const id=idOf(row),c=code(id);if(!validId(id)||!c.startsWith('01'))return null;
 const requirement=(field,minimumMonths)=>({field,label:LABELS[field],minimumMonths});let requirements,minimumEducationLevel=0;
 if(c==='011102'){requirements=[requirement('public',120),requirement('management',60)];minimumEducationLevel=4;}
 else if(c==='011201')requirements=[requirement('total',120),requirement('management',60)];
 else if(['013202','013203'].includes(c)){requirements=[requirement('teaching',120)];minimumEducationLevel=4;}
 else if(c==='013204'){requirements=[requirement('higherTeaching',120)];minimumEducationLevel=5;}
 else requirements=[requirement(managementFields[c]||'total',60)];
 return{version:CAREER_PROGRESSION_VERSION,kind:'game_career_progression',occupationId:id,minimumEducationLevel,requirements,note:'선행 경력과 승진 경로를 위한 게임 조건이며 실제 임용·승진의 법정 요건이 아닙니다.'};
}
/** IDs and recorded months are verifiable; an unclassified legacy total is not. */
export function recordedCareerMonths(person){
 const result={},history=person?.employment?.jobHistory||person?.experienceByOccupation||{};
 for(const [id,value]of Object.entries(history)){const n=typeof value==='number'?value:value?.months;if(validId(id)&&months(n))result[id]=n;}
 const active=person?.job||person?.occupation,id=active?.occupationId||active?.id,n=active?.experienceMonths;
 if(validId(id)&&months(n))result[id]=Math.max(result[id]||0,n);
 return result;
}
export function careerProgressionAssessment(person,row,{educationLevel=person?.employment?.educationLevel??person?.schoolJourney?.highestLevel??(person?.schooling?.status==='graduated'?4:person?.age>=19?3:0)}={}){
 const rule=careerProgressionRule(row);if(!rule)return{eligible:true,rule:null,reasons:[],requirements:[]};
 const history=recordedCareerMonths(person),requirements=rule.requirements.map(req=>{const currentMonths=Object.entries(history).reduce((sum,[id,n])=>sum+(inField(id,req.field)?n:0),0);return{...req,currentMonths,label:req.label,value:`기록 ${currentMonths}개월 / 필요 ${req.minimumMonths}개월`,met:currentMonths>=req.minimumMonths,kind:'game_career_progression'};});
 if(rule.minimumEducationLevel){const labels=['학업 준비','초등 과정','중등 과정','고교 과정','대학 과정','대학원 과정','박사 과정'];requirements.push({label:'승진 경로 학력',value:`현재 ${labels[educationLevel]||'미기록'} / 필요 ${labels[rule.minimumEducationLevel]}`,met:educationLevel>=rule.minimumEducationLevel,kind:'game_career_progression'});}
 return{eligible:requirements.every(r=>r.met),rule,requirements,reasons:requirements.filter(r=>!r.met).map(r=>`${r.label}: ${r.value}`)};
}
/** New generated partners cannot be granted an invented ten-year career ladder. */
export const entryCareerAllowed=row=>careerProgressionRule(row)===null;
