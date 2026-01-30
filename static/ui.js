// ui.js - client-side validation, admin polling and notification sound
(function(){
  const usernameRe = /^[A-Za-z]+$/;
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const hasLetter = /[A-Za-z]/;
  const hasDigit = /\d/;

  function showError(el, msg){
    let e = el.parentNode.querySelector('.field-error');
    if(!e){ e = document.createElement('div'); e.className = 'field-error'; el.parentNode.appendChild(e); }
    e.textContent = msg;
  }
  function clearError(el){
    let e = el.parentNode.querySelector('.field-error'); if(e) e.textContent='';
  }

  function validateRegisterForm(form){
    const username = form.querySelector('[name=username]');
    const password = form.querySelector('[name=password]');
    const email = form.querySelector('[name=email]');
    let ok = true;
    if(!usernameRe.test(username.value.trim())){ showError(username,'用户名需仅包含英文字母'); ok=false;} else clearError(username);
    if(!hasLetter.test(password.value) || !hasDigit.test(password.value)){ showError(password,'密码需同时包含字母和数字'); ok=false;} else clearError(password);
    if(!emailRe.test(email.value.trim())){ showError(email,'邮箱格式不正确'); ok=false;} else clearError(email);
    return ok;
  }

  function validateAdminCreate(form){
    // same rules as register
    return validateRegisterForm(form);
  }

  function bindForms(){
    const reg = document.querySelector('form.auth-form');
    if(reg){
      reg.addEventListener('submit', function(e){
        if(!validateRegisterForm(reg)) e.preventDefault();
      });
    }

    const adminCreate = document.querySelector('form[action="/admin/users"]') || document.querySelector('form input[name=action][value=create]') && document.querySelector('form');
    // safer: find form that contains input[name=action][value=create]
    const forms = document.querySelectorAll('form');
    for(const f of forms){
      const a = f.querySelector('input[name=action][value=create]');
      if(a){
        f.addEventListener('submit', function(e){ if(!validateAdminCreate(f)) e.preventDefault(); });
      }
    }

    // add small button press animation
    document.querySelectorAll('.btn').forEach(b => {
      b.addEventListener('mousedown', ()=> b.classList.add('pressed'));
      b.addEventListener('mouseup', ()=> b.classList.remove('pressed'));
      b.addEventListener('mouseleave', ()=> b.classList.remove('pressed'));
    });
  }

  // notification tone via WebAudio
  function playTone(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.linearRampToValueAtTime(0.12, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      o.stop(now + 0.6);
    }catch(e){console.warn('tone failed',e)}
  }

  // admin polling for pending count and play tone on new pending
  function adminPolling(){
    let last = null;
    async function tick(){
      try{
        const res = await fetch('/api/pending_count');
        if(!res.ok) return;
        const j = await res.json();
        const cnt = j.pending || 0;
        const el = document.querySelector('#pending-count');
        if(el) el.textContent = cnt;
        if(last !== null && cnt > last){ playTone(); }
        last = cnt;
      }catch(e){ console.warn('poll',e); }
    }
    if(location.pathname.startsWith('/admin/users') || document.querySelector('#pending-count')){
      tick(); setInterval(tick, 10000);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){ bindForms(); adminPolling(); });
  
  // Reveal on scroll using IntersectionObserver: elements with .reveal will get .visible
  function setupReveal(){
    const items = document.querySelectorAll('.reveal');
    if(!items.length) return;
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting){ ent.target.classList.add('visible'); }
        else { ent.target.classList.remove('visible'); }
      });
    },{threshold:0.25});
    items.forEach(it=>obs.observe(it));
  }
  document.addEventListener('DOMContentLoaded', setupReveal);
})();
