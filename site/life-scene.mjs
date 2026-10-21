import {deriveLifeScene} from './life-scene-model.mjs';

const AGE_FRAMES = Object.freeze({baby:0,toddler:1,child:2,teen:3,young:4,adult:5,senior:6});
const ROLE_FRAMES = Object.freeze({school:7,office:8,field:9,shop:10,military:11});
const SENIOR_FRAMES = Object.freeze({office:12,field:13,shop:14});
const BACKGROUNDS = Object.freeze({metropolitan:0,coastal:1,regional:2,rural:3});
const SVG_NS = 'http://www.w3.org/2000/svg';
const instances = new WeakMap();

export function spriteIndexFor(scene) {
  if (!Object.hasOwn(AGE_FRAMES, scene?.ageStage)) throw new TypeError('알 수 없는 나이 단계입니다.');
  if (['baby','toddler','child','teen'].includes(scene.ageStage)) return AGE_FRAMES[scene.ageStage];
  if (scene.ageStage === 'senior') {
    if (Object.hasOwn(SENIOR_FRAMES, scene.role)) return SENIOR_FRAMES[scene.role];
    if (scene.role === 'rest' && scene.retired) return 15;
  }
  return Object.hasOwn(ROLE_FRAMES, scene.role) ? ROLE_FRAMES[scene.role] : AGE_FRAMES[scene.ageStage];
}

export function atlasPosition(index, columns, rows) {
  if (![index,columns,rows].every(Number.isInteger) || columns < 1 || rows < 1 || index < 0 || index >= columns * rows) {
    throw new RangeError('그림의 칸 번호가 범위를 벗어났습니다.');
  }
  const x = columns === 1 ? 0 : index % columns * 100 / (columns - 1);
  const y = rows === 1 ? 0 : Math.floor(index / columns) * 100 / (rows - 1);
  return `${x}% ${y}%`;
}

function svgElement(document, tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key,value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}
function rect(document,x,y,width,height,fill) {
  return svgElement(document,'rect',{x,y,width,height,fill});
}
function pixelSvg(document,width,height) {
  return svgElement(document,'svg',{viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true','shape-rendering':'crispEdges'});
}

function housingArt(document, kind) {
  const svg = pixelSvg(document,112,90);
  const wall = 'var(--scene-wall)', roof = 'var(--scene-roof)', glass = '#dce8c8';
  svg.append(rect(document,12,82,88,4,'#687654'));
  if (kind === 'family') {
    svg.append(rect(document,22,40,68,42,wall), svgElement(document,'path',{d:'M16 42V36H22V30H28V24H84V30H90V36H96V42Z',fill:roof}));
    svg.append(rect(document,30,49,16,16,glass),rect(document,66,49,16,16,glass),rect(document,50,61,12,21,'#7b6752'));
  } else if (kind === 'dorm' || kind === 'rent') {
    const floors = kind === 'dorm' ? 4 : 3;
    const top = kind === 'dorm' ? 10 : 22;
    svg.append(rect(document,26,top,62,82-top,wall),rect(document,22,top-6,70,6,roof));
    for (let row=0;row<floors;row++) for (let column=0;column<3;column++) {
      svg.append(rect(document,33+column*17,top+7+row*15,10,9,glass));
    }
    svg.append(rect(document,50,70,14,12,'#7b6752'));
    if (kind === 'rent') svg.append(rect(document,23,56,68,4,roof));
  } else {
    svg.append(rect(document,23,45,66,37,wall),rect(document,18,38,76,8,roof),rect(document,32,54,17,14,glass),rect(document,61,59,13,23,'#7b6752'));
  }
  svg.append(rect(document,8,68,8,14,'#947852'),rect(document,4,57,16,13,'#71945d'),rect(document,96,72,8,10,'#947852'),rect(document,92,63,16,11,'#86a968'));
  return svg;
}

function activityArt(document, role) {
  const svg = pixelSvg(document,96,72), dark = '#56614e', wood = '#a4865c';
  if (role === 'school') {
    svg.append(rect(document,12,43,72,7,wood),rect(document,19,50,6,20,dark),rect(document,72,50,6,20,dark),rect(document,22,35,25,7,'#b87661'),rect(document,25,28,25,7,'#6e8a9a'),rect(document,55,26,19,17,'#e8d8a4'));
  } else if (role === 'office') {
    svg.append(rect(document,8,43,80,7,wood),rect(document,15,50,6,20,dark),rect(document,76,50,6,20,dark),rect(document,27,11,43,27,dark),rect(document,31,15,35,19,'#b8d5cc'),rect(document,45,38,8,5,dark),rect(document,29,53,38,4,'#d9d2bc'));
  } else if (role === 'field') {
    svg.append(rect(document,12,38,70,30,'#b77c50'),rect(document,35,30,24,8,dark),rect(document,9,47,76,5,dark),rect(document,43,44,9,14,'#e0c787'),rect(document,65,12,7,21,'#c5c7b7'),rect(document,59,8,19,8,'#c5c7b7'));
  } else if (role === 'shop') {
    svg.append(rect(document,16,35,64,34,wood),rect(document,12,30,72,7,dark),rect(document,19,17,58,13,'#bd8567'),rect(document,22,17,9,13,'#f0dfbd'),rect(document,42,17,9,13,'#f0dfbd'),rect(document,62,17,9,13,'#f0dfbd'),rect(document,29,44,18,13,'#dbd5ac'),rect(document,56,43,13,11,'#65845e'));
  } else if (role === 'military') {
    svg.append(rect(document,25,19,48,49,'#778458'),rect(document,32,12,33,8,dark),rect(document,21,26,7,29,dark),rect(document,73,26,7,29,dark),rect(document,36,42,26,18,'#a4aa78'),rect(document,42,30,14,8,dark));
  } else {
    svg.append(rect(document,9,36,61,7,wood),rect(document,13,23,53,8,wood),rect(document,17,43,6,25,dark),rect(document,57,43,6,25,dark),rect(document,78,48,12,21,'#ab835a'),rect(document,72,32,24,18,'#71945d'),rect(document,79,23,11,14,'#8ba96c'));
  }
  return svg;
}

export function createLifeScene(host) {
  if (!host?.ownerDocument) throw new TypeError('삶의 장면을 표시할 요소가 필요합니다.');
  if (instances.has(host)) return instances.get(host);
  const document = host.ownerDocument;
  const make = (tag,className,text) => {const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
  const heading = make('div','life-scene-heading');
  const title = make('h3','life-scene-title','지금의 일상');
  const stage = make('span','life-scene-stage');
  heading.append(title,stage);
  const visual = make('div','life-scene-visual');
  visual.setAttribute('role','img');
  const background = make('div','life-scene-background');
  const ground = make('div','life-scene-ground');
  const home = make('div','life-scene-home');
  const activity = make('div','life-scene-activity');
  const character = make('div','life-scene-character');
  const sprite = make('div','life-scene-character-sprite');
  character.append(sprite);
  const placard = make('span','life-scene-placard');
  const inset = make('div','life-scene-map');
  const map = svgElement(document,'svg',{viewBox:'0 0 320 240','aria-hidden':'true'});
  const mapUse = svgElement(document,'use');
  map.append(mapUse);inset.append(map);
  const insetLabel = make('span','life-scene-map-label','현재 거주지역');
  inset.append(insetLabel);
  for (const decoration of [background,ground,home,activity,character,placard,inset]) decoration.setAttribute('aria-hidden','true');
  visual.append(background,ground,home,activity,character,placard,inset);
  const caption = make('div','life-scene-caption');
  const current = make('p','life-scene-current');
  const address = make('p','life-scene-address');
  const note = make('p','life-scene-note','배경과 소품은 가상의 대표 풍경이며 실제 동네 모습과 다를 수 있습니다.');
  caption.append(current,address,note);
  host.classList.add('life-scene');
  host.replaceChildren(heading,visual,caption);
  let previousKey = null;
  const api = Object.freeze({
    update(state,data,{running=false}={}) {
      const scene = deriveLifeScene(state,data);
      if (scene.sceneKey !== previousKey) {
        const frame = spriteIndexFor(scene);
        sprite.style.backgroundPosition = atlasPosition(frame,4,4);
        background.style.backgroundPosition = atlasPosition(BACKGROUNDS[scene.biome] ?? 2,2,2);
        host.dataset.ageStage=scene.ageStage;host.dataset.role=scene.role;host.dataset.biome=scene.biome;
        host.dataset.sceneKey=scene.sceneKey;host.dataset.spriteIndex=String(frame);
        host.style.setProperty('--scene-character-scale',scene.ageStage==='adult'?'1.04':'1');
        host.style.setProperty('--scene-character-gray',scene.ageStage==='adult'?'0.08':scene.ageStage==='senior'?'0.12':'0');
        const variant=scene.cityVariant >>> 0;
        host.style.setProperty('--scene-wall',`rgb(${172+(variant&31)},${165+((variant>>>5)&31)},${135+((variant>>>10)&31)})`);
        host.style.setProperty('--scene-roof',`hsl(${12+(variant%39)} 24% ${39+((variant>>>16)%12)}%)`);
        host.style.setProperty('--scene-neighborhood-hue',`${(variant%21)-10}deg`);
        home.replaceChildren(housingArt(document,scene.housing));
        activity.replaceChildren(activityArt(document,scene.role));
        if (scene.cityId && /^kr-city-[a-z0-9-]+$/.test(scene.cityId)) {
          inset.hidden=false;mapUse.setAttribute('href',`#${scene.cityId}`);
        } else {inset.hidden=true;mapUse.removeAttribute('href');}
        previousKey=scene.sceneKey;
      }
      const month=Number.isInteger(state.month)&&state.month>=0&&state.month<12?state.month:0;
      stage.textContent=scene.ageLabel;
      placard.textContent=scene.jobLabel;placard.title=scene.jobLabel;
      current.textContent=`${scene.age}세 ${month}개월 · ${scene.jobLabel} · ${scene.employmentLabel}`;
      address.textContent=`${scene.residenceLabel} · ${scene.housingLabel}`;
      visual.setAttribute('aria-label',`${scene.age}세 ${month}개월 ${scene.ageLabel}, ${scene.jobLabel}, ${scene.residenceLabel}, ${scene.housingLabel}. 가상 대표 풍경.`);
      host.classList.toggle('is-running',Boolean(running));
      return scene;
    },
  });
  instances.set(host,api);
  return api;
}
