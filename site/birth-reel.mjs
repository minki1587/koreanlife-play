// Animate only decoded maps; network latency never adds to each frame interval.
export function birthReelDelay(elapsed,duration=2800){
  const progress=Math.max(0,Math.min(1,elapsed/duration));
  const slowdown=Math.max(0,(progress-.4)/.6);
  return 32+750*slowdown**2;
}
export function createBirthReel({prepare,paint,finish,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,duration=2800}) {
  let serial=0,timer=null,warmup=null;
  function stop(){serial++;for(const id of [timer,warmup])if(id!==null)cancel(id);timer=warmup=null;}
  function start(cities,offset=0,resultCity=null){
    stop();const ticket=serial,ready=[];let frame=0,started=null,remaining=Math.min(16,cities.length),last=null,completed=false;
    const complete=()=>{if(completed||ticket!==serial)return;completed=true;finish();};
    const tick=()=>{
      timer=null;if(ticket!==serial||completed)return;
      const elapsed=now()-started;if(elapsed>=duration){complete();return;}
      const candidates=ready.filter(city=>city!==last);
      if(candidates.length){const city=candidates[frame++%candidates.length];last=city;paint(city);}
      timer=schedule(tick,birthReelDelay(elapsed,duration));
    };
    const begin=()=>{
      if(ticket!==serial||completed||started!==null||!ready.length)return;
      if(warmup!==null){cancel(warmup);warmup=null;}
      started=now();tick();
    };
    // Prepare the actual outcome alongside the reel, avoiding a final network pause.
    if(resultCity)void Promise.resolve().then(()=>prepare(resultCity)).catch(()=>{});
    for(let index=0;index<Math.min(16,cities.length);index++){
      const city=cities[(offset+index*37)%cities.length];
      Promise.resolve().then(()=>prepare(city)).then(()=>{
        if(ticket!==serial||completed)return;
        ready.push(city);
        if(ready.length>=2)begin();
        else warmup=schedule(begin,100);
      },()=>{}).finally(()=>{
        remaining--;if(ticket!==serial||completed||remaining)return;
        if(!ready.length)complete();else begin();
      });
    }
  }
  return Object.freeze({start,stop});
}
