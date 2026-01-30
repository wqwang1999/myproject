(function(){
  const canvas = document.getElementById('starfield');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = canvas.width = Math.floor(innerWidth * dpr);
  let h = canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.scale(dpr, dpr);

  let stars = [];
  const MAX_STARS = 80; // lower cap for better performance
  const STARS_ENABLED = !(location.search.includes('stars=0') || localStorage.getItem('stars') === 'off');
  if(!STARS_ENABLED){ canvas.style.display = 'none'; return; }

  function rand(min,max){return Math.random()*(max-min)+min}

  function makeStars(){
    stars.length = 0;
    const area = innerWidth * innerHeight;
    let count = Math.round(area / 20000);
    count = Math.max(30, Math.min(MAX_STARS, count));
    for(let i=0;i<count;i++){
      const x = rand(0,innerWidth);
      const y = rand(0,innerHeight);
      const sz = rand(0.6,2.4);
      const color = `hsl(${Math.floor(rand(0,360))},${Math.floor(rand(60,100))}%,${Math.floor(rand(60,90))}%)`;
      const phase = rand(0,Math.PI*2);
      const speed = rand(0.001,0.006); // slower twinkle
      const arms = Math.floor(rand(2,5));
      stars.push({x,y,sz,color,phase,speed,arms});
    }
  }

  // create offscreen canvas for static crosses
  let off = document.createElement('canvas');
  let offCtx = off.getContext('2d');
  function buildOffscreen(){
    off.width = innerWidth * dpr; off.height = innerHeight * dpr;
    off.style.width = innerWidth + 'px'; off.style.height = innerHeight + 'px';
    offCtx.setTransform(1,0,0,1,0,0); // reset
    offCtx.scale(dpr, dpr);
    // subtle gradient background
    const g = offCtx.createLinearGradient(0,0,0,innerHeight);
    g.addColorStop(0,'rgba(8,10,30,0.45)');
    g.addColorStop(1,'rgba(2,6,23,0.6)');
    offCtx.fillStyle = g; offCtx.fillRect(0,0,innerWidth,innerHeight);

    // draw static crosses
    for(const s of stars){
      offCtx.save();
      offCtx.translate(s.x, s.y);
      offCtx.rotate(0);
      offCtx.strokeStyle = s.color;
      offCtx.lineWidth = Math.max(1, s.sz*0.9);
      offCtx.globalAlpha = 0.9;
      // draw multiple arms
      for(let a=0;a<s.arms;a++){
        const ang = (Math.PI*2/a) || 0;
        // draw small arm lines rotated
        offCtx.beginPath();
        offCtx.moveTo(-s.sz*2,0);
        offCtx.lineTo(s.sz*2,0);
        offCtx.stroke();
        offCtx.rotate(Math.PI*2/s.arms);
      }
      offCtx.restore();
    }
  }

  let lastMouse = {x:innerWidth/2,y:innerHeight/2};
  let pendingMouse = false;
  window.addEventListener('pointermove', e=>{
    lastMouse.x = e.clientX; lastMouse.y = e.clientY; if(!pendingMouse){ pendingMouse=true; requestAnimationFrame(()=>{ // apply small parallax transform
      const tx = (lastMouse.x - innerWidth/2) * 0.02;
      const ty = (lastMouse.y - innerHeight/2) * 0.02;
      canvas.style.transform = `translate(${tx}px,${ty}px)`;
      pendingMouse=false;
    })}
  });

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
    makeStars(); buildOffscreen();
  }

  let then = performance.now();
  function draw(now){
    const dt = now - then; then = now;
    // draw static background from offscreen
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.drawImage(off, 0, 0, off.width/dpr, off.height/dpr);

    // twinkle overlay for a sparse subset to reduce draw cost
    for(let i=0;i<stars.length;i++){
      if(i % 3 !== 0) continue; // only every third star twinkles
      const s = stars[i];
      s.phase += s.speed * (dt);
      const a = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(s.phase));
      ctx.beginPath();
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.sz*6);
      glow.addColorStop(0, `rgba(255,255,255,${a*0.6})`);
      glow.addColorStop(0.6, `rgba(255,255,255,${a*0.03})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(s.x - s.sz*6, s.y - s.sz*6, s.sz*12, s.sz*12);
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', debounce(resize, 200));

  function debounce(fn, ms){ let id; return ()=>{ clearTimeout(id); id=setTimeout(()=>fn(), ms); }; }

  makeStars(); buildOffscreen(); requestAnimationFrame(draw);
})();
