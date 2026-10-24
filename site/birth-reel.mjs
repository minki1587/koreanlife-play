// Display a city only after its matching map is ready. Stopped draws cannot paint.
export function createBirthReel({prepare,paint,finish,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,duration=3600}) {
  let serial=0,timer=null;
  function stop(){serial++;if(timer!==null){cancel(timer);timer=null;}}
  function start(cities,offset=0){
    stop();const ticket=serial;let frame=0,started=null;
    const tick=async()=>{
      timer=null;if(ticket!==serial)return;
      if(started!==null&&now()-started>=duration){finish();return;}
      const city=cities[(offset+frame++*37)%cities.length];
      try{await prepare(city);}catch{if(ticket===serial)finish();return;}
      if(ticket!==serial)return;
      if(started!==null&&now()-started>=duration){finish();return;}
      started??=now();paint(city);
      timer=schedule(tick,45+230*((now()-started)/duration)**2);
    };
    void tick();
  }
  return Object.freeze({start,stop});
}
