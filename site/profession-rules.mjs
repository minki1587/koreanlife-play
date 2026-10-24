// Explicit gameplay prerequisites, separate from verified source/legal fields.
// Durations and a 24-month preparation course are game design, not license rules.
import {completedDegrees} from './degree-history.mjs?v=living-costs-20261024';
export const PROFESSION_RULES_VERSION='profession-paths-v1';
const entries=[
 ...Array.from({length:13},(_,index)=>[`know-3011${String(index+1).padStart(2,'0')}`,'medicine','의학',72]),
 ['know-301201','medicine','의학',72],
 ['know-301301','oriental-medicine','한의학',72],
 ['know-301401','dentistry','치의학',72],
 ['know-302001','veterinary','수의학',72],
 ['know-303001','pharmacy','약학',72],
 ['know-303002','oriental-pharmacy','한약학',48],
 ['know-304004','nursing','간호학',48],
 ['know-304003','nursing','간호학',48],
 ['know-212101','secondary-education','중등교육',48],
 ['know-212201','teaching','교육대학·초등교육',48],
 ['know-212301','special-education','특수교육',48],
 ['know-213001','early-childhood-education','유아교육',48],
 ['know-232101','early-childhood-education','유아교육',48],
 ['know-221101','law','법학 학부',48,'player'],
 ['know-221102','law','법학 학부',48,'player'],
 ['know-221201','law','법학 학부',48],
];
const rules=new Map(entries.map(([occupationId,field,fieldLabel,minimumStudyMonths])=>[occupationId,Object.freeze({occupationId,field,fieldLabel,minimumStudyMonths,preparationMonths:24,preparationCostWan:600,kind:'game_assumption',version:PROFESSION_RULES_VERSION})]));
// New player-only paths must not reshape the established parent career pool.
const playerOnly=new Set(entries.filter(entry=>entry[4]==='player').map(([occupationId])=>occupationId));
export function professionRule(row,{actor='player'}={}){const id=typeof row==='string'?row:row?.id;return actor==='parent'&&playerOnly.has(id)?null:rules.get(id)||null;}
export function completedProfessionField(state){
 const school=state?.schooling;
 return school?.status==='graduated'&&typeof school.major==='string'?{field:school.major,studyMonths:school.progressMonths,durationMonths:school.durationMonths}:null;
}
export function professionFieldMet(state,rule){
 if(!rule)return true;
 return completedDegrees(state).some(completed=>completed.field===rule.field&&completed.studyMonths>=rule.minimumStudyMonths&&completed.durationMonths>=rule.minimumStudyMonths);
}
export function professionFieldRequirement(rule){return `${rule.fieldLabel} 과정 졸업 · ${rule.minimumStudyMonths}개월 학업 이수`;}
export function professionRules(){return [...rules.values()].map(row=>({...row}));}
