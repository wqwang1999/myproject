(function(){
  const canvas = document.getElementById('starfield');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  const stars = [];
  const STAR_COUNT = Math.round((w*h)/40000);

  function rand(min,max){return Math.random()*(max-min)+min}

  function init(){
    stars.length=0;
    for(let i=0;i<STAR_COUNT;i++){
      stars.push({x:rand(0,w),y:rand(0,h),r:rand(0.4,1.6),a:rand(0.1,1),vx:rand(-0.02,0.02),vy:rand(-0.02,0.02)})
    }
    draw();
  }

  function resize(){
    w = canvas.width = innerWidth; h = canvas.height = innerHeight;
    init();
  }

  let t0 = performance.now();
  function draw(){
    const t = performance.now();
    const dt = (t - t0)/16.666; t0 = t;
    ctx.clearRect(0,0,w,h);
    // faint gradient
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'rgba(8,10,30,0.45)');
    g.addColorStop(1,'rgba(2,6,23,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

    for(let s of stars){
      s.x += s.vx*dt; s.y += s.vy*dt; s.a += Math.sin(t/1000 + s.x)*0.002;
      if(s.x < -10) s.x = w+10; if(s.x > w+10) s.x = -10;
      if(s.y < -10) s.y = h+10; if(s.y > h+10) s.y = -10;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,'+Math.max(0.06,Math.min(1,s.a))+')';
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  // subtle parallax on mouse
  window.addEventListener('mousemove', e=>{
    const mx = (e.clientX - w/2)/w; const my = (e.clientY - h/2)/h;
    for(let i=0;i<stars.length;i++){
      stars[i].x += mx*0.3*(i%3-1);
      stars[i].y += my*0.3*(i%3-1);
    }
  });

  init();
})();
