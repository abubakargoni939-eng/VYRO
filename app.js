import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.VYRO_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_');
const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const app = document.getElementById('app');
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const state = { page:'home', posts:[], liked:new Set(), profile:null };
let authMode = 'login';

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const timeAgo = iso => { const m=Math.max(1, Math.floor((Date.now()-new Date(iso).getTime())/60000)); return m<60?`${m}m`:m<1440?`${Math.floor(m/60)}h`:`${Math.floor(m/1440)}d`; };
function msg(text){ document.getElementById('authMessage').textContent=text; }
function shell(content){ app.innerHTML=`<section class="page">${content}</section>`; }

function postCard(p){
  const liked=state.liked.has(p.id);
  return `<article class="card"><div class="card-head"><div class="mini">${esc((p.profiles?.username||'V')[0]).toUpperCase()}</div><div><div class="name">${esc(p.profiles?.display_name||p.profiles?.username||'VYRO User')} ${p.profiles?.country ? esc(p.profiles.country):''}</div><div class="meta">${timeAgo(p.created_at)} · Public</div></div></div><div class="post-body"><div class="post-text">${esc(p.content)}</div><div class="actions"><button class="like ${liked?'liked':''}" data-like="${p.id}">♥ ${p.like_count||0}</button><button>◯ ${p.comment_count||0}</button><button>↗ Share</button></div></div></article>`;
}

async function loadHome(){
  shell(`<div class="tabs"><button class="active">WORLD</button><button>NEARBY</button><button>TRENDING</button></div><div class="hero"><div class="eyebrow">🔥 Today's Challenge</div><h1>Show us your city in 10 seconds.</h1><p>Join people around the world and earn XP.</p><button class="primary" data-page="challenges">Join Challenge</button></div><div id="feed"><p class="meta">Loading posts…</p></div>`);
  const {data,error}=await supabase.from('posts').select('id,content,created_at,profiles(username,display_name,country),likes(count),comments(count)').order('created_at',{ascending:false}).limit(30);
  if(error){ document.getElementById('feed').innerHTML=`<div class="card"><div class="post-body">Could not load posts: ${esc(error.message)}</div></div>`; return; }
  state.posts=(data||[]).map(p=>({...p,like_count:p.likes?.[0]?.count||0,comment_count:p.comments?.[0]?.count||0}));
  const ids=state.posts.map(p=>p.id); state.liked=new Set();
  if(ids.length){ const {data:likes}=await supabase.from('likes').select('post_id').eq('user_id',(await supabase.auth.getUser()).data.user.id).in('post_id',ids); (likes||[]).forEach(x=>state.liked.add(x.post_id)); }
  document.getElementById('feed').innerHTML=state.posts.length?state.posts.map(postCard).join(''):`<div class="card"><div class="post-body"><h3>Be the first to post 🚀</h3><p class="meta">Create the first VYRO post and start the global conversation.</p></div></div>`;
  wire();
}
function world(){ shell(`<div class="tabs"><button class="active">TRENDING</button><button>NEARBY</button><button>EXPLORE</button></div><h2>🌎 World Map</h2><p class="meta">Explore where people are talking and creating.</p><div class="map"><span class="pin p1">🇺🇸 USA</span><span class="pin p2">🇳🇬 Nigeria</span><span class="pin p3">🇦🇪 UAE</span><span class="pin p4">🇧🇷 Brazil</span></div><div class="card"><div class="post-body"><span class="tag">GLOBAL</span><h3>What's happening around the world?</h3><p class="meta">The live map will become data-driven as VYRO grows.</p></div></div>`); }
function challenges(){ shell(`<div class="hero"><div class="eyebrow">⚡ Daily Challenge</div><h1>Show us your city in 10 seconds</h1><p>Post a short video or photo. Community votes decide the top entries.</p><button class="primary" id="joinChallenge">Join Challenge · +500 XP</button></div><h2>Leaderboard</h2><div class="challenge-list"><div class="challenge"><b>🥇 Global Creator</b><h3>2,450 XP</h3><span class="xp">Creator · 15 challenges</span></div><div class="challenge"><b>🥈 Rising Star</b><h3>2,150 XP</h3><span class="xp">Creator · 12 challenges</span></div></div>`); document.getElementById('joinChallenge')?.addEventListener('click',()=>alert('Challenge system is ready for the next backend phase.')); }
async function profile(){
  const user=(await supabase.auth.getUser()).data.user;
  const {data:p}=await supabase.from('profiles').select('*').eq('id',user.id).single(); state.profile=p;
  const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('user_id',user.id);
  shell(`<div class="profile-cover"><div class="profile-avatar">${esc((p?.username||'A')[0]).toUpperCase()}</div></div><div class="profile-info"><h1 style="margin:0">${esc(p?.display_name||p?.username||'VYRO User')} ${esc(p?.country||'')}</h1><p class="meta">@${esc(p?.username||'user')} · Level ${p?.level||1}</p><p>${esc(p?.bio||'Exploring people, places and stories around the world. 🌍')}</p></div><div class="stats"><div class="stat"><b>${count||0}</b><small>Posts</small></div><div class="stat"><b>${p?.followers_count||0}</b><small>Followers</small></div><div class="stat"><b>${p?.following_count||0}</b><small>Following</small></div></div><div class="card"><div class="post-body"><span class="tag">LEVEL ${p?.level||1}</span><h3>${p?.xp||0} XP</h3><button class="tool" id="logoutBtn">Log out</button></div></div>`);
  document.getElementById('logoutBtn').onclick=()=>supabase.auth.signOut();
}
function inbox(){ shell(`<h2>Messages</h2><div class="card"><div class="post-body"><h3>Inbox is next 💬</h3><p class="meta">Real-time messaging will be added after the core social feed is stable.</p></div></div>`); }
async function render(){ document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===state.page)); if(state.page==='home')return loadHome(); if(state.page==='profile')return profile(); ({world,challenges,inbox}[state.page]||world)(); }
function wire(){ document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();}); document.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>toggleLike(b.dataset.like)); }
async function toggleLike(postId){ const user=(await supabase.auth.getUser()).data.user; if(state.liked.has(postId)){ await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',user.id); } else { await supabase.from('likes').insert({post_id:postId,user_id:user.id}); } render(); }

async function publish(){ const text=document.getElementById('postText').value.trim(); if(!text)return; const user=(await supabase.auth.getUser()).data.user; const {error}=await supabase.from('posts').insert({user_id:user.id,content:text}); if(error){alert(error.message);return;} document.getElementById('postText').value=''; document.getElementById('postModal').classList.add('hidden'); state.page='home'; render(); }

document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>{state.page=n.dataset.page;render();});
document.getElementById('createBtn').onclick=()=>document.getElementById('postModal').classList.remove('hidden');
document.getElementById('closeModal').onclick=()=>document.getElementById('postModal').classList.add('hidden');
document.getElementById('publishBtn').onclick=publish;

document.getElementById('loginTab').onclick=()=>setAuthMode('login');
document.getElementById('signupTab').onclick=()=>setAuthMode('signup');
document.getElementById('authForm').onsubmit=async e=>{e.preventDefault(); if(!supabase){msg('First connect VYRO to Supabase in config.js.');return;} const email=document.getElementById('authEmail').value.trim(); const password=document.getElementById('authPassword').value; if(authMode==='login'){const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)msg(error.message);} else {const username=document.getElementById('authUsername').value.trim().toLowerCase(); const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}}); if(error)msg(error.message); else if(data.session)msg('Account created!'); else msg('Account created. Check your email to confirm, then log in.'); }};
function setAuthMode(mode){authMode=mode;document.getElementById('loginTab').classList.toggle('active',mode==='login');document.getElementById('signupTab').classList.toggle('active',mode==='signup');document.querySelector('.signup-only').classList.toggle('hidden',mode!=='signup');document.getElementById('authSubmit').textContent=mode==='login'?'Login':'Create account';msg('');}

async function boot(){
  if(!configured){authScreen.classList.remove('hidden');setAuthMode('login');msg('VYRO is ready. Add your Supabase URL and anon key in config.js.');return;}
  const {data:{session}}=await supabase.auth.getSession();
  supabase.auth.onAuthStateChange((_event,s)=>{if(s){authScreen.classList.add('hidden');appShell.classList.remove('hidden');render();}else{appShell.classList.add('hidden');authScreen.classList.remove('hidden');}});
  if(session){authScreen.classList.add('hidden');appShell.classList.remove('hidden');await render();}else{authScreen.classList.remove('hidden');appShell.classList.add('hidden');}
}
boot();
