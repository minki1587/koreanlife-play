// Original 24 × 24 pixel drawings. Integer rectangles remain crisp at every size.
const PALETTE=['#293b34','#fbf6df','#81a477','#e3b761','#a3c8d5','#b97164','#7a6d99'];
const DRAWINGS={
 heart:[[0,4,5,6,8],[0,14,5,6,8],[0,8,9,8,11],[0,4,9,16,6],[5,6,7,4,7],[5,14,7,4,7],[5,8,11,8,5],[5,10,15,4,3],[1,7,8,2,3]],
 ball:[[0,7,3,10,2],[0,4,5,16,14],[0,7,19,10,2],[3,7,5,10,14],[3,5,8,14,8],[0,10,5,3,14],[0,5,10,14,3],[1,7,6,2,2]],
 meal:[[0,3,8,18,12],[5,5,10,14,8],[3,7,12,10,4],[0,6,4,2,4],[0,11,3,2,5],[0,16,4,2,4],[1,8,12,3,2]],
 book:[[0,3,5,18,15],[3,5,7,6,11],[4,13,7,6,11],[0,11,5,2,15],[1,6,9,4,1],[1,6,12,4,1],[1,14,9,4,1],[1,14,12,4,1]],
 tools:[[0,4,3,7,4],[0,6,7,3,13],[3,7,7,1,11],[0,15,3,5,8],[0,14,9,3,11],[4,16,5,2,4],[3,15,12,1,6]],
 palette:[[0,6,4,13,2],[0,3,6,18,11],[0,7,17,10,3],[3,5,6,14,10],[3,8,16,7,2],[5,7,8,3,3],[4,14,7,3,3],[2,12,13,3,3],[1,6,13,3,3]],
 people:[[0,4,3,6,7],[0,14,3,6,7],[0,2,11,10,9],[0,12,11,10,9],[3,5,5,4,4],[3,15,5,4,4],[4,4,13,6,5],[2,14,13,6,5]],
 suitcase:[[0,8,3,8,4],[0,3,7,18,14],[3,5,9,14,10],[0,7,9,2,10],[0,15,9,2,10],[1,10,4,4,2],[1,11,12,2,3]],
 stage:[[0,3,3,18,18],[5,5,5,5,12],[5,14,5,5,12],[3,10,5,4,3],[0,8,17,8,2],[1,10,10,4,6]],
 house:[[0,10,2,4,3],[0,7,5,10,3],[0,4,8,16,3],[0,5,11,14,10],[5,7,11,10,8],[3,4,8,16,2],[0,10,14,4,7],[1,7,12,2,3],[1,15,12,2,3]],
 phone:[[0,7,2,10,20],[4,9,4,6,14],[1,10,5,4,9],[0,11,19,2,1],[2,10,14,4,2],[4,11,6,2,2]],
 shirt:[[0,7,3,10,3],[0,3,6,18,6],[0,6,10,12,11],[4,5,7,4,3],[4,15,7,4,3],[4,8,6,8,13],[1,10,3,4,4],[0,10,4,4,1]],
 car:[[0,7,5,10,2],[0,5,7,14,5],[0,2,12,20,7],[3,4,13,16,4],[4,8,7,8,4],[0,5,17,4,4],[0,15,17,4,4],[1,4,13,3,2],[5,18,13,2,2]],
 paw:[[0,3,5,4,6],[0,9,3,4,6],[0,15,5,4,6],[0,6,12,13,8],[3,5,7,1,2],[3,11,5,1,2],[3,17,7,1,2],[3,8,14,9,4],[3,11,12,3,7]],
 tree:[[0,9,2,6,3],[0,6,5,12,3],[0,4,8,16,4],[0,6,12,12,4],[0,10,15,4,7],[2,9,4,6,3],[2,6,7,12,4],[2,8,11,8,3],[3,11,16,2,5]],
 bed:[[0,2,6,3,15],[0,5,11,17,8],[0,19,8,3,13],[4,5,12,14,4],[1,6,8,5,3],[3,12,9,7,3],[0,5,18,14,1]],
 cup:[[0,5,8,13,12],[0,18,10,4,7],[3,7,10,9,8],[1,7,10,9,2],[3,19,12,1,3],[0,5,20,15,1],[4,8,3,2,4],[4,13,2,2,4]],
 sun:[[3,10,1,4,4],[3,10,19,4,4],[3,1,10,4,4],[3,19,10,4,4],[0,7,6,10,12],[0,5,8,14,8],[3,8,8,8,8],[3,6,10,12,4],[1,9,9,2,3]],
 bicycle:[[0,2,12,7,8],[0,15,12,7,8],[4,4,14,3,4],[4,17,14,3,4],[0,7,7,3,2],[0,15,5,4,2],[5,9,8,2,8],[5,10,13,7,2],[5,15,7,2,8]],
 gift:[[0,3,8,18,5],[0,5,13,14,8],[5,5,10,14,2],[5,7,14,10,5],[3,10,9,4,11],[0,6,3,6,5],[0,12,3,6,5],[3,8,5,2,3],[3,14,5,2,3]]
};
const SPENDING={wellness:'heart',exercise:'ball',food:'meal',reading:'book',technology:'tools',arts:'palette',relationships:'people',travel:'suitcase',culture:'stage',home:'house',digital:'phone',clothing:'shirt',mobility:'bicycle',pet:'paw',community:'tree',rest:'bed',convenience:'cup','housing-asset':'house','vehicle-asset':'car',seasons:'gift'};
const HOBBIES={'감상':'stage','교류':'people','야외':'tree','운동':'ball','지능':'book','창작':'palette'};

export function pixelIconKey(row,kind='spending'){return (kind==='hobby'?HOBBIES[row?.type]:SPENDING[row?.category])||'sun';}
export function pixelIconSpec(row,kind='spending'){const key=pixelIconKey(row,kind);return{key,palette:PALETTE,rects:DRAWINGS[key]};}
/** Decorative SVG; the adjacent text remains the accessible name. */
export function createPixelIcon(row,kind='spending'){
 const {key,palette,rects}=pixelIconSpec(row,kind),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','40');svg.setAttribute('height','40');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('class','life-pixel-icon');svg.setAttribute('data-pixel-icon',key);svg.setAttribute('shape-rendering','crispEdges');
 for(const [color,x,y,width,height]of rects){const rect=document.createElementNS(ns,'rect');for(const [name,value]of Object.entries({x,y,width,height,fill:palette[color]}))rect.setAttribute(name,String(value));svg.append(rect);}
 return svg;
}
