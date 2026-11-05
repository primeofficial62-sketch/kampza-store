/* KAMPZA in-app chat: full-screen, WhatsApp-style. Load AFTER the main script:  <script src="kz-chat.js"></script> */
(()=>{
const css=`
body.kcopen{overflow:hidden}
#kc{position:fixed;left:0;right:0;top:0;height:100dvh;z-index:85;display:flex;flex-direction:column;background:#efeae2}
#kc[hidden]{display:none}
.kh{display:flex;align-items:center;gap:8px;background:var(--o);color:#fff;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 10px 6px;flex:none}
.kb{color:#fff;font-size:26px;width:42px;height:42px;border-radius:50%;line-height:1}
.kn{display:grid;min-width:0}.kn b{font:600 16px Sora,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kn small{opacity:.85;font-size:12px}
.km{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 10px;display:flex;flex-direction:column;gap:4px}
.kmsg{max-width:80%;width:fit-content;padding:7px 10px 5px;border-radius:12px;line-height:1.35;overflow-wrap:anywhere;font-size:15px;box-shadow:0 1px 1px #0001}
.kmsg.me{align-self:flex-end;background:#ffe0cc;border-bottom-right-radius:4px}
.kmsg.th{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}
.kt{white-space:pre-wrap}.kd{display:block;text-align:right;font-size:10.5px;color:#8a8a8a;margin-top:2px}
.kimg{max-width:100%;max-height:260px;min-width:140px;min-height:90px;border-radius:8px;display:block;margin-bottom:4px;background:#ddd;object-fit:cover}
.ko{font:600 11px Inter,sans-serif;color:var(--o);margin-bottom:2px}
.ksep{align-self:center;background:#e1dcd2;color:#555;font-size:11.5px;padding:3px 10px;border-radius:8px;margin:8px 0}
.kz{margin:auto;color:var(--m);text-align:center}
.kf{display:flex;align-items:flex-end;gap:8px;background:#f4f4f4;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));flex:none;border-top:1px solid var(--b)}
.kf textarea{flex:1;border-radius:22px;padding:11px 14px;min-height:44px;max-height:110px;resize:none;line-height:1.3;border:1px solid var(--b);font-size:16px;background:#fff}
.ki,.ks{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px}
.ki{background:#fff;border:1px solid var(--b)}.ks{background:var(--o);color:#fff}
.kli{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;border:1px solid var(--b);border-radius:14px;margin-bottom:10px;background:var(--bg)}
.kli .kav{width:44px;height:44px;border-radius:50%;background:var(--o);color:#fff;display:grid;place-items:center;font:700 18px Sora,sans-serif;flex:none}
.kli .kmid{flex:1;display:grid;min-width:0}.kli .kmid small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kub{background:var(--o);color:#fff;font:700 11px Inter,sans-serif;min-width:20px;height:20px;border-radius:10px;display:grid;place-items:center;padding:0 5px}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const vp=document.querySelector('meta[name=viewport]');if(vp&&!/interactive-widget/.test(vp.content))vp.content+=', interactive-widget=resizes-content';

const o=document.createElement('div');o.id='kc';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-label','Chat');
o.innerHTML='<div class="kh"><button class="kb" id="kcb" aria-label="Back">←</button><div class="kn"><b id="kcn">Chat</b><small id="kcs"></small></div></div><div class="km" id="kcm"></div><form class="kf" id="kcf"><button type="button" class="ki" id="kci" aria-label="Send a photo">📷</button><textarea id="kct" rows="1" maxlength="2000" placeholder="Type a message…" enterkeyhint="send" autocomplete="off"></textarea><button class="ks" aria-label="Send">➤</button></form><input type="file" id="kcu" accept="image/*" hidden>';
document.body.appendChild(o);
const M=o.querySelector('#kcm'),T=o.querySelector('#kct'),F=o.querySelector('#kcf'),FILE=o.querySelector('#kcu');
let cid=null,chan=null,seen=new Set(),lastDay='',tk=0;

/* keep the whole chat (and the typing bar) exactly above the keyboard */
const fit=()=>{const v=window.visualViewport;if(!v||o.hidden)return;o.style.height=v.height+'px';o.style.top=v.offsetTop+'px'};
if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit)}
T.addEventListener('focus',()=>{setTimeout(()=>{fit();scrollTo(0,0);bottom(true)},250)});

const bottom=f=>{if(f||M.scrollHeight-M.scrollTop-M.clientHeight<140)M.scrollTop=M.scrollHeight};
const tm=d=>new Date(d).toLocaleTimeString('en-NG',{hour:'numeric',minute:'2-digit'});
const dayLbl=d=>{const x=new Date(d),t=new Date(),y=new Date(Date.now()-864e5);return x.toDateString()===t.toDateString()?'Today':x.toDateString()===y.toDateString()?'Yesterday':x.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})};

function add(m,force){
 if(seen.has(m.id))return;seen.add(m.id);
 const z=M.querySelector('.kz');if(z)z.remove();
 const dk=new Date(m.created_at).toDateString();
 if(dk!==lastDay){lastDay=dk;const s=document.createElement('div');s.className='ksep';s.textContent=dayLbl(m.created_at);M.appendChild(s)}
 const me=m.sender_id===U.id,d=document.createElement('div');d.className='kmsg '+(me?'me':'th');
 d.innerHTML=(m.order_code?`<div class="ko">Order ${esc(m.order_code)}</div>`:'')+(m.image_path?'<img class="kimg" alt="Photo">':'')+(m.body?`<div class="kt">${esc(m.body)}</div>`:'')+`<span class="kd">${tm(m.created_at)}</span>`;
 M.appendChild(d);
 const im=d.querySelector('img');
 if(im)sb.storage.from('chat-files').createSignedUrl(m.image_path,3600).then(({data})=>{if(data?.signedUrl){im.src=data.signedUrl;im.onclick=()=>window.open(data.signedUrl,'_blank');im.onload=()=>bottom(me||force)}});
 bottom(me||force);
}

async function open(op){
 const my=++tk;
 o.hidden=false;document.body.classList.add('kcopen');fit();
 try{history.pushState({...(history.state||{}),kc:1},'')}catch{}
 o.querySelector('#kcn').textContent=op.name||'Chat';o.querySelector('#kcs').textContent='';
 M.innerHTML='<div class="kz">Loading…</div>';seen=new Set();lastDay='';T.value='';T.style.height='auto';
 try{
  let id=op.conv;
  if(!id){const r=await sb.rpc('start_chat',{p_vendor:op.vendor});if(r.error)throw r.error;id=r.data}
  if(my!==tk)return;cid=id;
  const[ms,cl]=await Promise.all([sb.from('messages').select('*').eq('conversation_id',id).order('created_at',{ascending:true}).limit(300),op.name?null:sb.rpc('chat_list')]);
  if(my!==tk)return;if(ms.error)throw ms.error;
  const c=cl?.data?.find(x=>x.conv_id===id);if(c)o.querySelector('#kcn').textContent=c.other_name||'Chat';
  M.innerHTML='';ms.data.forEach(m=>add(m,true));
  if(!ms.data.length)M.innerHTML='<div class="kz">Say hello 👋<br><small>Messages go straight to the vendor.</small></div>';
  bottom(true);sb.rpc('mark_chat_read',{p_conv:id});
  if(chan)sb.removeChannel(chan);
  chan=sb.channel('kc-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+id},p=>{add(p.new);if(p.new.sender_id!==U.id)sb.rpc('mark_chat_read',{p_conv:id})}).subscribe();
 }catch(e){if(my===tk)M.innerHTML='<div class="kz">Could not open this chat.<br><small>'+esc(e.message||'Check your connection')+'</small></div>'}
}
function shut(){
 tk++;o.hidden=true;document.body.classList.remove('kcopen');cid=null;
 if(chan){sb.removeChannel(chan);chan=null}
 try{if(pg==='chats')view()}catch{}
}
const close=()=>{if(history.state&&history.state.kc)history.back();else shut()};
addEventListener('popstate',e=>{if(!o.hidden&&!(e.state&&e.state.kc))shut()});
o.querySelector('#kcb').onclick=close;

async function send(body,img){
 if(!cid||(!body&&!img))return;
 const{data,error}=await sb.from('messages').insert({conversation_id:cid,sender_id:U.id,body:body||null,image_path:img||null}).select().single();
 if(error){toast('Message not sent. Try again.');return false}
 add(data,true);return true}
F.addEventListener('submit',async e=>{e.preventDefault();const b=T.value.trim();if(!b)return;T.value='';T.style.height='auto';T.focus();if(!await send(b)){T.value=b}});
F.querySelector('.ks').addEventListener('pointerdown',e=>e.preventDefault());
T.addEventListener('input',()=>{T.style.height='auto';T.style.height=Math.min(T.scrollHeight,110)+'px'});
T.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();F.requestSubmit()}});
o.querySelector('#kci').onclick=()=>FILE.click();
FILE.onchange=async()=>{const f=FILE.files[0];FILE.value='';if(!f||!cid)return;if(f.size>8e6)return toast('Photo is too large (max 8 MB)');
 toast('Sending photo…');const ext=(f.type.split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,''),path=cid+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
 const up=await sb.storage.from('chat-files').upload(path,f,{contentType:f.type});if(up.error)return toast('Could not upload the photo');await send(null,path)};

/* "Chat" buttons open the chat instantly (replaces the old chat screen) */
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-chatv]');if(b){e.preventDefault();e.stopImmediatePropagation();open({vendor:b.dataset.chatv});return}
 const c=e.target.closest('[data-kcc]');if(c){e.preventDefault();e.stopImmediatePropagation();open({conv:c.dataset.kcc,name:c.dataset.kn})}
},true);

/* Account → Messages list */
KX.chatsView=()=>pgHead('Messages')+'<div id="kcl"><small>Loading…</small></div>';
KX.hooks=KX.hooks||{};
KX.hooks.chats=async()=>{const el=document.getElementById('kcl');if(!el)return;
 const{data,error}=await sb.rpc('chat_list');if(!document.getElementById('kcl'))return;
 if(error)return el.innerHTML='<div class="warn">Could not load your messages.</div>';
 el.innerHTML=data.length?data.map(c=>`<button class="kli" data-kcc="${esc(c.conv_id)}" data-kn="${esc(c.other_name)}"><span class="kav">${esc((c.other_name||'?')[0].toUpperCase())}</span><span class="kmid"><b>${esc(c.other_name)}</b><small>${esc(c.last_text||'No messages yet')}</small></span>${c.unread?`<span class="kub">${c.unread}</span>`:''}</button>`).join(''):empty('💬','No conversations yet. Tap Chat on any product to message a vendor.')};
})();
