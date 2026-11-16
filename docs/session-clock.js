// Independent clock; persistence adapter is supplied by the authenticated app.
export function createSessionClock({now=()=>Date.now(),idleMs=300000}={}) {
  let start=now(),last=start,activity=start,activeMs=0,closed=false;
  function advance() {
    const time=Math.max(last,now());
    if(!closed) activeMs+=Math.max(0,Math.min(time,activity+idleMs)-last);
    last=time;
    return time;
  }
  return {
    activity(){const time=advance();if(!closed)activity=time;return this.snapshot();},
    snapshot(){advance();return {startedAt:start,lastActivityAt:activity,activeMs,elapsedMs:last-start,closed};},
    close(){advance();closed=true;return this.snapshot();}
  };
}
