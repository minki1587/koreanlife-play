import {displayCopy} from './ui-copy.mjs?v=economic-life-1';
import {deriveLifeScene} from './life-scene-model.mjs?v=economic-life-1';

const AGE_FRAMES = Object.freeze({baby:0,toddler:1,child:2,teen:3,young:4,adult:5,senior:6});
const ROLE_FRAMES = Object.freeze({school:7,office:8,field:9,shop:10,military:11});
const SENIOR_FRAMES = Object.freeze({office:12,field:13,shop:14});
const BACKGROUNDS = Object.freeze({metropolitan:0,coastal:1,regional:2,rural:3});
const SVG_NS = 'http://www.w3.org/2000/svg';
const instances = new WeakMap();

export function characterAtlasFor(scene){return scene?.characterGender==='female'?'./assets/life-characters-female-v1.png':'./assets/life-characters-v1.png';}

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
  const ink='#30382f',wall='var(--scene-wall)',roof='var(--scene-roof)',wood='#865c3e',lightWood='#bd9060';
  const add=(...tiles)=>svg.append(...tiles.map(([x,y,w,h,c])=>rect(document,x,y,w,h,c)));
  // Integer-pixel layers keep the props sharp at every responsive scale.
  add([10,82,94,4,'#526846'],[17,86,80,2,'#6d7f52']);
  if (kind === 'family') {
    // A compact tiled-roof home: deep eaves, timber frame, paper windows and stone steps.
    add([20,43,73,39,ink],[24,47,65,32,wall],[24,71,65,8,'#ae9c79'],[24,47,65,3,'#897852'],
      [23,46,5,35,wood],[52,46,5,35,wood],[85,46,5,35,wood],[25,48,2,29,lightWood],
      [30,52,20,21,ink],[32,54,16,16,'#eee4b9'],[34,55,5,6,'#fff4ce'],[42,55,4,6,'#e3ddb6'],
      [39,54,2,16,wood],[32,61,16,2,wood],[32,69,16,3,lightWood],
      [61,52,20,21,ink],[63,54,16,16,'#dce6bd'],[65,55,5,6,'#f7edc6'],[70,54,2,16,wood],
      [63,61,16,2,wood],[63,69,16,3,lightWood],[53,55,9,24,ink],[55,57,5,21,wood],
      [55,58,2,16,lightWood],[59,67,1,2,'#e9d59a']);
    svg.append(svgElement(document,'path',{d:'M9 44V39H15V35H21V30H28V25H32V22H80V25H85V30H92V35H98V39H104V44Z',fill:ink}));
    add([15,39,83,3,'#51564a'],[20,35,73,4,roof],[27,30,59,5,'#566154'],[32,26,48,4,'#7a8065'],
      [33,23,46,3,'#a6a789'],[13,42,87,3,'#202d29'],[18,39,4,2,'#a3a58b'],[29,36,3,2,'#a3a58b'],
      [41,36,3,2,'#a3a58b'],[53,36,3,2,'#a3a58b'],[65,36,3,2,'#a3a58b'],[77,36,3,2,'#a3a58b'],
      [89,39,4,2,'#a3a58b'],[36,29,3,4,'#333d36'],[49,29,3,4,'#333d36'],[62,29,3,4,'#333d36'],
      [75,29,3,4,'#333d36'],[26,41,2,3,'#a89367'],[81,41,2,3,'#a89367'],
      [18,79,77,4,ink],[21,79,71,2,'#b8b29a'],[46,82,24,3,'#6d7161'],[49,82,18,1,'#ddd0a6']);
  } else if (kind === 'dorm' || kind === 'rent') {
    const floors = kind === 'dorm' ? 4 : 3;
    const top = kind === 'dorm' ? 10 : 22;
    const brick=kind==='rent';
    add([25,top,64,72+(10-top),ink],[28,top+2,53,79-top,brick?'#b77958':wall],
      [81,top+2,6,79-top,brick?'#81533f':'#8b907c'],[28,top+2,3,78-top,brick?'#d49d74':'#ded9b1'],
      [22,top-5,70,7,ink],[24,top-4,66,3,'#aab09b'],[27,top-1,60,2,roof],
      [29,top-10,14,5,ink],[31,top-9,10,3,'#8f9a88']);
    if (brick) {
      // Alternating mortar joints distinguish the rental building from a dormitory.
      for(let y=top+4;y<77;y+=8) {
        add([31,y,49,1,'#e0b88d']);
        for(let x=34+((y-top)%16?0:5);x<79;x+=11)add([x,y+1,1,7,'#995f48']);
      }
    } else {
      for(let y=top+16;y<76;y+=15)add([28,y,53,2,'#a6aa92'],[28,y+2,53,1,'#e1dbb7']);
    }
    for (let row=0;row<floors;row++) for (let column=0;column<3;column++) {
      const x=33+column*16,y=top+6+row*15;
      add([x,y,11,11,ink],[x+2,y+2,7,6,'#9dbbb1'],[x+2,y+2,3,4,'#dfedcf'],
        [x+5,y+2,1,7,'#6e7a68'],[x-1,y+10,13,2,'#d2c3a1']);
      if(brick&&row===1)add([x-1,y+12,13,1,ink],[x,y+9,1,4,ink],[x+11,y+9,1,4,ink]);
    }
    add([47,68,20,14,ink],[50,70,14,10,'#566f66'],[51,71,5,7,'#b4c5af'],[57,70,2,10,'#313e37'],
      [43,66,28,3,ink],[45,65,24,2,roof],[23,81,68,3,ink],[26,81,62,1,'#c7c3a9'],
      [45,84,25,2,'#8a8e77'],[48,84,19,1,'#dbd1b3']);
    if(!brick)add([75,2,9,3,ink],[78,0,2,5,ink]);
  } else {
    // A modest modern home with a stepped parapet, siding and a shaded porch.
    add([23,42,67,40,ink],[26,45,54,34,wall],[80,45,7,34,'#95967b'],[26,45,3,32,'#e4d6ab'],
      [20,36,72,10,ink],[23,38,66,4,roof],[26,42,61,2,'#aca182']);
    for(let y=51;y<78;y+=8)add([29,y,50,1,'#b6ae8b']);
    add([32,51,21,20,ink],[34,53,17,15,'#a8c7b5'],[35,54,6,6,'#e4edcb'],[42,53,2,15,'#657c68'],
      [34,61,17,2,'#657c68'],[30,70,25,3,'#e3d0a5'],[62,54,14,27,ink],[64,56,10,23,wood],
      [65,57,2,20,lightWood],[71,65,2,2,'#e7cd8c'],[58,49,23,4,ink],[59,49,20,2,roof],
      [23,80,68,4,ink],[26,80,61,2,'#b5b09a'],[59,83,21,3,'#7f836f'],[62,83,15,1,'#dbccaa']);
  }
  // Small clipped shrubs anchor each building without covering doors or windows.
  add([7,76,11,8,ink],[9,77,7,6,'#a16d48'],[8,79,9,1,'#d6a36d'],[3,67,20,9,'#344d32'],
    [6,63,14,12,'#4f713c'],[8,62,8,7,'#91a555'],[5,68,7,4,'#6f8e45'],
    [95,78,10,6,ink],[97,78,6,5,'#aa7951'],[91,71,19,8,'#344d32'],[94,66,13,10,'#67874a'],
    [97,65,7,5,'#a6b668'],[94,72,5,3,'#839b50']);
  return svg;
}

function activityArt(document, role) {
  const svg=pixelSvg(document,96,72),ink='#30382f',iron='#4d5c51',wood='#a67243',woodLight='#dbab6d',woodShade='#704b34';
  const add=(...tiles)=>svg.append(...tiles.map(([x,y,w,h,c])=>rect(document,x,y,w,h,c)));
  add([10,68,77,3,'#546b48'],[15,71,65,1,'#7f8b59']);
  if (role === 'school') {
    // School desk with metal frame, open book, notebook stack and pencil cup.
    add([10,41,76,8,ink],[12,42,72,3,woodLight],[12,45,72,3,wood],[16,49,6,20,ink],
      [18,50,2,16,'#89958c'],[72,49,6,20,ink],[74,50,2,16,'#89958c'],[20,62,54,3,iron],
      [15,68,10,2,ink],[69,68,11,2,ink],[28,51,36,7,ink],[30,52,32,4,'#90724c'],
      [18,35,23,6,ink],[20,36,20,3,'#b8544d'],[21,30,23,6,ink],[23,31,20,3,'#548598'],
      [22,34,19,1,'#e1d9b3'],[43,29,3,12,ink],[46,31,14,10,'#f6e7bc'],[60,31,14,10,'#e7d5a7'],
      [48,33,10,1,'#b1a584'],[48,36,9,1,'#b1a584'],[62,33,9,1,'#b1a584'],[62,36,8,1,'#b1a584'],
      [59,31,2,10,'#a58e68'],[76,28,7,13,ink],[77,30,5,10,'#b57f50'],[77,22,2,9,'#d4b75b'],
      [80,24,2,7,'#607d6c'],[77,21,2,2,ink]);
  } else if (role === 'office') {
    // Workstation with a shaded monitor, readable pixel UI and drawer pedestal.
    add([7,43,82,7,ink],[9,44,78,2,woodLight],[9,46,78,3,wood],[13,50,6,19,ink],
      [15,50,2,17,'#b78d5b'],[68,50,17,19,ink],[70,51,13,16,'#8c6648'],[71,53,11,4,'#b68a5b'],
      [71,60,11,5,'#a47a51'],[75,54,4,1,ink],[75,61,4,1,ink],[25,10,45,27,ink],
      [27,12,41,23,'#526760'],[29,14,37,19,'#b7d3c1'],[29,14,37,3,'#789d90'],
      [32,20,8,10,'#e7e8c8'],[43,20,20,2,'#648d83'],[43,24,17,1,'#87aa94'],[43,27,18,1,'#87aa94'],
      [44,37,7,5,ink],[36,41,23,2,iron],[24,39,40,3,ink],[26,39,36,2,'#e7dabb'],
      [28,39,1,2,'#8b947f'],[33,39,1,2,'#8b947f'],[38,39,1,2,'#8b947f'],[43,39,1,2,'#8b947f'],
      [48,39,1,2,'#8b947f'],[53,39,1,2,'#8b947f'],[73,33,9,10,ink],[74,34,6,8,'#e9dab6'],
      [82,35,3,5,ink],[83,36,1,3,'#c0b18e'],[22,53,35,4,ink],[24,53,31,2,'#52675c'],
      [36,57,5,10,ink],[29,67,20,2,ink],[29,68,3,2,iron],[47,68,3,2,iron]);
  } else if (role === 'field') {
    // Metal-bound toolbox, latched lid, shovel and a ribbed safety helmet.
    add([9,41,66,27,ink],[12,44,60,21,'#ae6c3b'],[12,44,60,5,'#ce9054'],[12,50,60,3,woodShade],
      [14,55,56,8,'#a35d34'],[9,42,4,23,'#596456'],[70,42,5,23,'#596456'],[14,62,55,2,'#ce935d'],
      [29,32,27,10,ink],[32,35,21,6,'#687467'],[35,36,15,5,'#b1ad81'],[38,49,8,12,ink],
      [40,50,4,8,'#d5b766'],[41,53,2,2,'#71623e'],[79,17,4,42,ink],[80,18,2,39,'#b68d59'],
      [73,8,16,10,ink],[76,10,10,5,'#c6c7ab'],[79,18,4,2,'#e2d5b2'],[74,55,14,8,ink],
      [77,63,8,5,ink],[76,56,10,7,'#8a9a89'],[79,58,5,5,'#bdc5a8'],[16,28,23,3,ink],
      [19,22,18,6,ink],[22,18,12,5,ink],[23,20,10,5,'#e1b652'],[20,24,16,4,'#edc465'],
      [27,20,3,8,'#fff0a0'],[17,29,23,2,'#bd8c3d']);
  } else if (role === 'shop') {
    // A small market stall: striped canvas, wooden counter, produce crates and till.
    add([17,19,4,48,ink],[75,19,4,48,ink],[18,20,1,43,woodLight],[76,20,1,43,woodLight],
      [18,13,60,4,ink],[13,17,70,9,ink],[10,26,76,7,ink],[16,18,64,7,'#c97050'],
      [13,27,70,4,'#ad563e']);
    for(let x=20;x<80;x+=16)add([x,18,8,7,'#f4dfad'],[x-2,26,9,4,'#e5c98f']);
    add([14,40,68,28,ink],[17,43,62,22,wood],[17,43,62,3,woodLight],
      [17,48,62,2,woodShade],[17,57,62,2,woodShade],[28,46,2,18,woodShade],[50,46,2,18,woodShade],
      [71,46,2,18,woodShade],[11,37,74,6,ink],[14,38,68,2,'#e1b67a'],[14,40,68,2,'#9c683f'],
      [21,29,20,8,ink],[23,31,16,5,'#b18750'],[25,29,5,4,'#729147'],[31,28,6,5,'#90a24c'],
      [27,33,5,3,'#d58e48'],[34,32,4,3,'#d3a359'],[46,27,14,10,ink],[48,29,10,6,'#e5bd79'],
      [51,26,4,3,'#925f3d'],[64,28,13,9,ink],[66,29,9,4,'#9fbca9'],[65,34,11,2,'#6c8070'],
      [20,68,6,3,ink],[71,68,6,3,ink]);
  } else if (role === 'military') {
    // Field pack with canvas folds, camouflage patches, webbing and buckles.
    add([29,18,38,49,ink],[25,25,5,29,ink],[67,25,6,29,ink],[32,20,32,44,'#788254'],
      [34,20,28,4,'#a2aa71'],[29,27,4,24,'#596644'],[66,27,4,24,'#596644'],
      [37,11,22,9,ink],[40,13,16,6,'#5e704c'],[33,23,30,12,'#9ba16a'],[37,25,8,5,'#626e45'],
      [51,27,9,4,'#4c6041'],[43,31,7,4,'#b0ad75'],[34,36,7,24,'#4f5d3e'],[55,36,7,24,'#4f5d3e'],
      [36,37,2,22,'#c1b680'],[57,37,2,22,'#c1b680'],[33,44,30,18,ink],[35,46,26,13,'#8c9560'],
      [37,47,22,2,'#b4b17b'],[42,50,9,5,'#62764c'],[52,55,8,4,'#566442'],[36,60,24,2,'#47543a'],
      [36,40,5,6,ink],[37,41,3,3,'#c0bd91'],[55,40,5,6,ink],[56,41,3,3,'#c0bd91'],
      [22,37,7,19,ink],[23,38,5,16,'#8b9263'],[22,38,6,3,'#b4b17b'],[69,38,8,17,ink],
      [70,39,6,14,'#707e55'],[71,37,4,3,'#b8b58a'],[31,66,34,3,'#394c36']);
  } else {
    // A slatted park bench with cast-iron arms and splayed feet, beside a potted shrub.
    add([12,25,5,37,ink],[56,25,5,37,ink],[13,26,2,28,iron],[57,26,2,28,iron],
      [8,24,58,8,ink],[10,25,54,3,woodLight],[10,28,54,3,wood],
      [8,33,58,8,ink],[10,34,54,3,'#c28c51'],[10,37,54,3,woodShade],
      [7,43,62,9,ink],[9,44,58,3,woodLight],[9,47,58,3,wood],
      [11,45,13,1,'#efc88c'],[28,45,18,1,'#efc88c'],[51,45,12,1,'#efc88c'],
      [13,52,5,14,ink],[56,52,5,14,ink],[11,65,9,3,ink],[54,65,9,3,ink],
      [14,53,2,11,'#687566'],[57,53,2,11,'#687566'],[3,37,4,13,ink],[4,35,10,4,ink],
      [61,35,10,4,ink],[68,37,4,13,ink],[5,36,7,1,'#98a18a'],[63,36,6,1,'#98a18a'],
      [14,27,2,2,woodShade],[58,27,2,2,woodShade],[14,36,2,2,ink],[58,36,2,2,ink],
      [78,53,14,3,ink],[79,56,12,11,ink],[81,57,8,8,'#a36b43'],[81,58,8,2,'#d09a63'],
      [82,65,6,3,'#754e36'],[82,37,5,16,woodShade],[75,38,20,13,ink],[78,32,14,7,ink],
      [77,39,16,10,'#557641'],[79,34,11,7,'#78934e'],[81,33,5,4,'#b0bb68'],
      [77,42,6,4,'#8da357'],[86,40,6,4,'#6c8b48']);
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
  const current = make('ul','life-scene-current');
  const address = make('ul','life-scene-address');
  caption.append(current,address);
  host.classList.add('life-scene');
  host.replaceChildren(heading,visual,caption);
  let previousKey = null;
  const api = Object.freeze({
    update(state,data,{running=false}={}) {
      const scene = deriveLifeScene(state,data);
      if (scene.sceneKey !== previousKey) {
        const frame = spriteIndexFor(scene);
        sprite.style.backgroundImage = `url("${characterAtlasFor(scene)}")`;
        sprite.style.backgroundPosition = atlasPosition(frame,4,4);
        background.style.backgroundPosition = atlasPosition(BACKGROUNDS[scene.biome] ?? 2,2,2);
        host.dataset.ageStage=scene.ageStage;host.dataset.role=scene.role;host.dataset.biome=scene.biome;host.dataset.characterGender=scene.characterGender;
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
      current.replaceChildren(...[`${scene.age}세 ${month}개월`,scene.jobLabel,scene.employmentLabel].map(text=>make('li','',displayCopy(text))));
      address.replaceChildren(...[scene.residenceLabel.replaceAll(' · ',' '),scene.housingLabel].map(text=>make('li','',displayCopy(text))));
      visual.setAttribute('aria-label',`${scene.age}세 ${month}개월 ${scene.characterGender==='female'?'여성':'남성'} ${scene.ageLabel}, ${scene.jobLabel}, ${scene.residenceLabel}, ${scene.housingLabel}.`);
      host.classList.toggle('is-running',Boolean(running));
      return scene;
    },
  });
  instances.set(host,api);
  return api;
}
