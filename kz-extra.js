/* kz-extra.js — KAMPZA: promotions, bank transfer + receipt, chat, PWA.
   Load BEFORE the main inline script. Uses the main script's globals (sb, U, pg, draw, toast, fmt, esc, pgHead, empty, notif, loadServer) at call time only. */
(()=>{
const K=window.KX={payCode:null,PAY:null,conv:null,name:'',ch:null,seen:new Set(),hooks:{}};
const $=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=n=>'₦'+Number(n).toLocaleString('en-NG');
const wa=p=>{p=String(p||'').replace(/\D/g,'');if(p.startsWith('0'))p='234'+p.slice(1);return p};
const shrink=f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();
 i.onload=()=>{const r=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*r);c.height=Math.round(i.height*r);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?ok(b):no(new Error('Image error')),'image/jpeg',.82)};
 i.onerror=()=>no(new Error('Could not read the image'));i.src=u});

/* ---------- promotions: turn promo price into price + old price so existing badges/flash deals work ---------- */
K.promos=(P,rows)=>{(rows||[]).forEach(r=>{const p=P.find(x=>x.id===r.product_id);if(p&&r.promo_price<r.base_price){p.o=r.base_price;p.p=r.promo_price;p.pe=r.ends_at}})};

/* ---------- leave chat page: close realtime channel ---------- */
K.leave=p=>{if(p!=='chat'&&K.ch){try{sb.removeChannel(K.ch)}catch{}K.ch=null}};

/* ---------- pay by transfer ---------- */
const PS={unpaid:['Awaiting payment',''],submitted:['Receipt sent',''],confirmed:['Payment confirmed',''],rejected:['Rejected. Resend receipt','no']};
K.payView=()=>pgHead('Pay by transfer')+'<div id="pay"><div class="sk"></div></div>';
K.hooks.pay=async()=>{
 if(!$('#pay'))return;
 const{data:d,error}=await sb.rpc('order_pay_info',{p_code:K.payCode});
 const el=$('#pay');if(!el)return;
 if(error||!d){el.innerHTML='<div class="warn">'+E(error?.message||'Could not load payment details')+'</div>';return}
 K.PAY=d;
 el.innerHTML=`<div class="nt"><div class="oh"><b>${E(d.code)}</b><span class="st">${M(d.total)}</span></div><small>Send each amount below straight to that vendor's account, then upload your receipt.</small></div>`
 +d.vendors.map(v=>{
  const s=PS[v.pay_status]||PS.unpaid,open=v.pay_status==='unpaid'||v.pay_status==='rejected',hasBank=v.bank_name&&v.account_number;
  return `<div class="box pad" style="margin-bottom:12px"><div class="oh"><b>${E(v.business_name)}</b><span class="badge ${s[1]}">${s[0]}</span></div>`
  +v.items.map(i=>`<div class="oh" style="font-weight:400"><span>${i.qty}× ${E(i.name)}</span><span>${M(i.price*i.qty)}</span></div>`).join('')
  +(v.has_fee?`<div class="oh"><small>Delivery</small><small>${M(d.delivery_fee)}</small></div>`:'')
  +`<div class="oh tot"><span>Amount to pay</span><b>${M(v.amount)}</b></div>`
  +(hasBank?`<div class="box"><table class="spec"><tr><td>Bank</td><td>${E(v.bank_name)}</td></tr><tr><td>Account name</td><td>${E(v.account_name)}</td></tr><tr><td>Account number</td><td><b>${E(v.account_number)}</b> <button class="rm" data-copy="${E(v.account_number)}">Copy</button></td></tr></table></div>`:'<div class="warn">This vendor has no bank details yet. Message them.</div>')
  +(open&&hasBank?`<div class="fld" style="margin:8px 0 0"><label for="rc-${v.vendor_id}">Receipt photo</label><input id="rc-${v.vendor_id}" type="file" accept="image/*"></div><button class="btn full" data-sendrc="${v.vendor_id}">I have paid · send receipt</button>`:'')
  +`<button class="btn full ghost" data-chatv="${v.vendor_id}">Message vendor</button>`
  +(v.phone?`<a class="btn full ghost" href="https://wa.me/${wa(v.phone)}" target="_blank" rel="noopener">WhatsApp vendor</a>`:'')+'</div>'}).join('')};
async function sendReceipt(vid,btn){
 const f=$('#rc-'+vid)?.files?.[0];if(!f){toast('Choose your receipt photo first');return}
 const v=K.PAY.vendors.find(x=>x.vendor_id===vid);btn.disabled=true;btn.textContent='Sending…';
 try{
  const a=await sb.rpc('start_chat',{p_vendor:vid});if(a.error)throw a.error;
  const cid=a.data,blob=await shrink(f),path=cid+'/'+Date.now()+'.jpg';
  const up=await sb.storage.from('chat-files').upload(path,blob,{contentType:'image/jpeg'});if(up.error)throw up.error;
  const m=await sb.from('messages').insert({conversation_id:cid,sender_id:U.id,body:'Payment receipt for order '+K.payCode+' · '+M(v.amount),image_path:path,order_code:K.payCode});if(m.error)throw m.error;
  const s=await sb.rpc('submit_transfer',{p_code:K.payCode,p_vendor:vid});if(s.error)throw s.error;
  toast('Receipt sent. The vendor will confirm your payment');notif('Receipt sent',K.payCode+' · '+M(v.amount));
 }catch(err){toast(err.message||'Could not send receipt')}
 K.hooks.pay();loadServer()}

/* ---------- chat ---------- */
K.chatsView=()=>pgHead('Messages')+'<div id="cl"><div class="sk"></div></div>';
K.hooks.chats=async()=>{
 const{data,error}=await sb.rpc('chat_list');const el=$('#cl');if(!el)return;
 if(error){el.innerHTML='<div class="warn">'+E(error.message)+'</div>';return}
 el.innerHTML=data.length?data.map(c=>`<button class="line" style="width:100%;text-align:left" data-chat="${c.conv_id}" data-nm="${E(c.other_name)}"><span class="av" style="width:44px;height:44px;font-size:18px">${E((c.other_name||'?')[0].toUpperCase())}</span><span class="mid"><b>${E(c.other_name)}${c.as_vendor?' <small>(customer)</small>':''}</b><small>${E(c.last_text||'No messages yet')}</small></span>${c.unread?`<span class="badge">${c.unread}</span>`:''}</button>`).join(''):empty('💬','No conversations yet. Tap Chat on any product to message the vendor.')};
K.chatView=()=>pgHead(E(K.name||'Chat'))+'<div class="chat" id="msgs" style="min-height:45vh"></div><div class="cbar"><label class="btn ghost" style="display:grid;place-items:center;padding:0 14px;cursor:pointer" aria-label="Send photo">📷<input id="cimg" type="file" accept="image/*" hidden></label><input id="cin" placeholder="Type a message…" maxlength="1000" autocomplete="off" enterkeyhint="send"><button class="btn" data-csend>Send</button></div>';
function addMsg(m){
 if(K.seen.has(m.id))return;K.seen.add(m.id);
 const box=$('#msgs');if(!box)return;
 const d=document.createElement('div');d.className='bub '+(m.sender_id===U.id?'me':'bot');
 if(m.order_code){const s=document.createElement('small');s.textContent='Order '+m.order_code;s.style.cssText='display:block;opacity:.8';d.appendChild(s)}
 if(m.image_path){const im=document.createElement('img');im.alt='Photo';im.style.cssText='max-width:100%;border-radius:10px;margin:4px 0';d.appendChild(im);
  sb.storage.from('chat-files').createSignedUrl(m.image_path,3600).then(r=>{if(r.data)im.src=r.data.signedUrl})}
 if(m.body){const t=document.createElement('div');t.textContent=m.body;d.appendChild(t)}
 box.appendChild(d);window.scrollTo(0,document.body.scrollHeight)}
K.hooks.chat=async()=>{
 if(!K.conv||!$('#msgs'))return;
 K.seen=new Set();if(K.ch){try{sb.removeChannel(K.ch)}catch{}K.ch=null}
 const id=K.conv;
 const[r,l]=await Promise.all([sb.from('messages').select('*').eq('conversation_id',id).order('created_at').limit(150),sb.rpc('chat_list')]);
 if(K.conv!==id||!$('#msgs'))return;
 if(!K.name&&l.data){const c=l.data.find(x=>x.conv_id===id);if(c){K.name=c.other_name;const h=$('.top h1');if(h)h.textContent=K.name}}
 if(r.error){toast('Could not load messages');return}
 r.data.forEach(addMsg);
 sb.rpc('mark_chat_read',{p_conv:id});
 K.ch=sb.channel('kz-msg-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+id},p=>{addMsg(p.new);if(p.new.sender_id!==U.id)sb.rpc('mark_chat_read',{p_conv:id})}).subscribe()};
async function send(body,path){
 if(!K.conv)return;
 const r=await sb.from('messages').insert({conversation_id:K.conv,sender_id:U.id,body:body||null,image_path:path||null}).select().single();
 if(r.error){toast('Message not sent');return false}addMsg(r.data);return true}
async function openChat(vid){
 const{data,error}=await sb.rpc('start_chat',{p_vendor:vid});
 if(error){toast(error.message||'Could not open chat');return}
 K.conv=data;K.name='';pg='chat';draw()}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
 const g=s=>e.target.closest(s);let x;
 if(x=g('[data-chatv]')){openChat(x.dataset.chatv);return}
 if(x=g('[data-chat]')){K.conv=x.dataset.chat;K.name=x.dataset.nm||'';pg='chat';draw();return}
 if(x=g('[data-copy]')){try{await navigator.clipboard.writeText(x.dataset.copy);toast('Account number copied')}catch{toast(x.dataset.copy)}return}
 if(x=g('[data-sendrc]')){sendReceipt(x.dataset.sendrc,x);return}
 if(g('[data-csend]')){const i=$('#cin'),t=i.value.trim();if(!t)return;i.value='';if(!await send(t))i.value=t;return}
});
document.addEventListener('keydown',async e=>{if(e.key==='Enter'&&e.target.id==='cin'){e.preventDefault();const t=e.target.value.trim();if(!t)return;e.target.value='';if(!await send(t))e.target.value=t}});
document.addEventListener('change',async e=>{
 if(e.target.id!=='cimg'||!e.target.files[0])return;
 const f=e.target.files[0];e.target.value='';toast('Sending photo…');
 try{const blob=await shrink(f),path=K.conv+'/'+Date.now()+'.jpg';
  const up=await sb.storage.from('chat-files').upload(path,blob,{contentType:'image/jpeg'});if(up.error)throw up.error;
  await send('',path)}catch(err){toast(err.message||'Could not send photo')}});

/* ---------- PWA ---------- */
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
