async function fetchSessions(){
  const res = await fetch('/api/sessions');
  const list = await res.json();
  const ul = document.getElementById('sessionList');
  ul.innerHTML = '';
  list.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="s-title">${escapeHtml(s.title)}</div><div class="s-count">${s.count}</div>`;
    li.dataset.sid = s.id;
    li.addEventListener('click', () => selectSession(s.id));
    ul.appendChild(li);
  });
}

async function selectSession(sid){
  const res = await fetch('/api/history/'+sid);
  const msgs = await res.json();
  renderMessages(msgs);
  document.cookie = 'chat_sid='+sid+'; path=/';
}

function renderMessages(msgs){
  const box = document.getElementById('messages');
  box.innerHTML = '';
  msgs.forEach(m => {
    const d = document.createElement('div');
    d.className = 'msg '+(m.role==='user'?'user':'bot');
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = m.text;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = m.role + ' • ' + (m.time || '');
    d.appendChild(content);
    d.appendChild(meta);
    box.appendChild(d);
  });
  // scroll to bottom smoothly
  box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
}

let sending = false;
async function sendMessage(){
  if(sending) return;
  const input = document.getElementById('inputMsg');
  const sendBtn = document.getElementById('sendBtn');
  const text = input.value.trim();
  if(!text) return;
  sending = true; sendBtn.disabled = true;
  try{
    const res = await fetch('/api/send', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
    if(res.ok){
      const data = await res.json();
      renderMessages(data.history);
      fetchSessions();
      input.value = '';
    }
  }catch(e){
    console.error('sendMessage error', e);
  }finally{
    sending = false; sendBtn.disabled = false;
  }
}
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('inputMsg').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendMessage(); } });
document.getElementById('newSession').addEventListener('click', ()=>{
  document.cookie = 'chat_sid=; Max-Age=0; path=/';
  fetch('/api/sessions').then(()=>{ fetchSessions(); document.getElementById('messages').innerHTML=''; });
});

function escapeHtml(s){return (s||'').replace(/[&<>"]+/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));}

// init
fetchSessions();

// simple heartbeat to refresh sessions occasionally
setInterval(fetchSessions, 15000);
