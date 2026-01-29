async function fetchSessions(){
  const res = await fetch('/api/sessions');
  const list = await res.json();
  const ul = document.getElementById('sessionList');
  ul.innerHTML = '';
  list.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s.title + ' ('+s.count+')';
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
    d.textContent = m.text;
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}

async function sendMessage(){
  const input = document.getElementById('inputMsg');
  const text = input.value.trim();
  if(!text) return;
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
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('inputMsg').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });
document.getElementById('newSession').addEventListener('click', ()=>{
  // clear cookie and create new
  document.cookie = 'chat_sid=; Max-Age=0; path=/';
  fetch('/api/sessions').then(()=>{ fetchSessions(); document.getElementById('messages').innerHTML=''; });
});

// init
fetchSessions();
