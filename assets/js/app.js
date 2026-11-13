/* ===================== 공통 엔진 ===================== */
(function(){
'use strict';

/* ---------- 유틸 ---------- */
const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const el = (t,c,h)=>{const n=document.createElement(t);if(c)n.className=c;if(h!=null)n.innerHTML=h;return n;};
const esc = s => String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const shuffle = a => {a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
window.ISB = {$,$$,el,esc,shuffle};

/* ---------- 저장소 ---------- */
const KEY='isb_final_v1';
const store = {
  d:null,
  load(){ if(this.d)return this.d; try{this.d=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){this.d={};} return this.d; },
  get(k,dv){ const d=this.load(); return (k in d)?d[k]:dv; },
  set(k,v){ const d=this.load(); d[k]=v; try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){} },
  known(){ return this.get('known',{}); },
  toggleKnown(id){ const k=this.known(); if(k[id])delete k[id]; else k[id]=1; this.set('known',k); return !!k[id]; },
  score(u,v){ const s=this.get('scores',{}); if(v!=null){ s[u]=Math.max(s[u]||0,v); this.set('scores',s);} return s[u]||0; },
  checks(){ return this.get('checks',{}); },
  toggleCheck(id){ const c=this.checks(); if(c[id])delete c[id]; else c[id]=1; this.set('checks',c); return !!c[id]; }
};
window.ISB.store = store;

/* ---------- 토스트 ---------- */
let tT;
function toast(msg){
  let t=$('#toast'); if(!t){t=el('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show'); clearTimeout(tT);
  tT=setTimeout(()=>t.classList.remove('show'),1800);
}
window.ISB.toast = toast;

/* ---------- 테마 ---------- */
function initTheme(){
  const saved = store.get('theme', null);
  const sys = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light';
  document.documentElement.dataset.theme = saved || sys;
}
function toggleTheme(){
  const cur = document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme = cur; store.set('theme',cur);
}
initTheme();
window.ISB.toggleTheme = toggleTheme;

/* ---------- 음성(TTS): 스페인어 원어민 목소리 우선 선택 ---------- */
const TTS = {
  voices:[], v:null, ready:false,
  pick(){
    const all = speechSynthesis.getVoices()||[];
    this.voices = all.filter(v=>/^es/i.test(v.lang));
    const pref = [
      /Mónica|Monica/i, /Paulina/i, /Jorge/i, /Juan/i, /Helena/i, /Laura/i,
      /Google español(?!.*Estados)/i, /Microsoft (Elvira|Alvaro|Álvaro|Dalia|Pablo|Helena)/i,
      /es-ES/i, /es-MX/i, /es-US/i, /Google español/i
    ];
    for(const re of pref){ const f=this.voices.find(v=>re.test(v.name)||re.test(v.lang)); if(f){this.v=f;break;} }
    if(!this.v && this.voices.length) this.v=this.voices[0];
    this.ready=true;
  },
  init(){
    if(!('speechSynthesis' in window)) return;
    this.pick();
    speechSynthesis.onvoiceschanged = ()=>this.pick();
  },
  clean(t){
    return String(t)
      .replace(/_{2,}/g,' algo ')
      .replace(/[“”"]/g,'')
      .replace(/\s*\/\s*/g,' … ')
      .replace(/\(([^)]*)\)/g,' $1 ')
      .replace(/\s+/g,' ').trim();
  },
  speak(text, opt){
    opt=opt||{};
    if(!('speechSynthesis' in window)){ toast('이 브라우저는 음성을 지원하지 않습니다'); return; }
    if(!this.ready) this.pick();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(this.clean(text));
    if(this.v){ u.voice=this.v; u.lang=this.v.lang; } else u.lang='es-ES';
    u.rate = opt.rate != null ? opt.rate : (store.get('rate',0.95));
    u.pitch = 1.0; u.volume = 1;
    if(opt.onend) u.onend = opt.onend;
    speechSynthesis.speak(u);
    return u;
  },
  stop(){ if('speechSynthesis' in window) speechSynthesis.cancel(); },
  queue(list, i, done){
    i=i||0;
    if(i>=list.length){ if(done)done(); return; }
    const item = list[i];
    if(item.before) item.before();
    this.speak(item.text, {onend:()=> setTimeout(()=>this.queue(list,i+1,done), item.gap||420)});
  }
};
TTS.init();
window.ISB.TTS = TTS;
function say(t,r){ TTS.speak(t, r?{rate:r}:undefined); }
window.ISB.say = say;

/* ---------- 상단바 / 공통 셸 ---------- */
const NAV = [
  ['index.html','홈'],['u1.html','01 인사'],['u2.html','02 출신'],
  ['u3.html','03 직업'],['u4.html','04 집·위치'],['exam.html','모의고사'],['cheatsheet.html','최종정리']
];
function buildShell(){
  const here = location.pathname.split('/').pop() || 'index.html';
  const top = el('header','top');
  top.innerHTML =
   '<div class="top-in">'+
     '<a class="brandmark" href="index.html"><span class="dot">E</span><span>Español 1-2<small>기말고사 대비</small></span></a>'+
     '<div class="topbtns">'+
       '<button class="iconbtn" id="rateBtn" title="말하기 속도">⏱</button>'+
       '<button class="iconbtn" id="themeBtn" title="밝게/어둡게">◐</button>'+
     '</div>'+
     '<nav>'+ NAV.map(n=>`<a href="${n[0]}" class="${n[0]===here?'on':''}">${n[1]}</a>`).join('') +'</nav>'+
   '</div>';
  document.body.insertBefore(top, document.body.firstChild);
  $('#themeBtn').onclick = toggleTheme;
  $('#rateBtn').onclick = ()=>{
    const steps=[0.75,0.85,0.95,1.05];
    const cur=store.get('rate',0.95);
    const nx=steps[(steps.indexOf(cur)+1+steps.length)%steps.length] || 0.95;
    store.set('rate',nx); toast('말하기 속도 '+nx.toFixed(2)+'배');
  };
  const f = el('footer');
  f.innerHTML = '<div class="wrap"><span>2026학년도 1학년 2학기 스페인어 기말고사 대비</span>'+
   '<span style="margin-left:auto">학습 기록은 이 브라우저에만 저장됩니다 · '+
   '<a href="#" id="resetBtn">기록 초기화</a></span></div>';
  document.body.appendChild(f);
  $('#resetBtn').onclick = e=>{
    e.preventDefault();
    if(confirm('플래시카드·퀴즈·체크리스트 기록을 모두 지울까요?')){
      localStorage.removeItem(KEY); store.d=null; location.reload();
    }
  };
}
window.ISB.buildShell = buildShell;

/* ---------- 탭 ---------- */
function initTabs(root){
  root = root||document;
  $$('.tabs',root).forEach(tabs=>{
    const btns=$$('button',tabs);
    btns.forEach(b=>{
      b.onclick=()=>{
        btns.forEach(x=>x.classList.remove('on')); b.classList.add('on');
        const group = tabs.dataset.group||'';
        const sel = group ? '.pane[data-group="'+group+'"]' : '.pane:not([data-group])';
        $$(sel, tabs.parentElement).forEach(p=>p.classList.remove('on'));
        const t=$('#'+b.dataset.pane); if(t)t.classList.add('on');
        if(b.dataset.pane) location.hash = b.dataset.pane;
      };
    });
  });
  if(location.hash){
    const b = $('.tabs button[data-pane="'+location.hash.slice(1)+'"]');
    if(b) b.click();
  }
}
window.ISB.initTabs = initTabs;

/* ---------- 문법 아코디언 ---------- */
function renderGrammar(host, items){
  host.innerHTML='';
  items.forEach((g,i)=>{
    const d = el('details','gitem'); if(i===0) d.open=true;
    const stars = (g.t.match(/★+/)||[''])[0];
    const title = g.t.replace(/\s*★+/,'');
    d.innerHTML = '<summary>'+esc(title)+(stars?' <span class="star">'+stars+'</span>':'')+'</summary>'+
      '<div class="gbody">'+
        (g.points&&g.points.length?'<ul>'+g.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'')+
        (g.ex||[]).map(e=>
          '<div class="exline"><button class="play" data-say="'+esc(e[0])+'">▶</button>'+
          '<div class="txt"><b>'+esc(e[0])+'</b><span>'+esc(e[1])+'</span></div></div>').join('')+
      '</div>';
    host.appendChild(d);
  });
  host.addEventListener('click',e=>{
    const b=e.target.closest('[data-say]'); if(b) say(b.dataset.say);
  });
}
window.ISB.renderGrammar = renderGrammar;

/* ---------- 어휘 목록 ---------- */
function renderVocab(host, groups, uid){
  const tools = el('div','vtools');
  tools.innerHTML =
    '<input class="search" placeholder="스페인어 또는 한국어로 검색…">'+
    '<button class="btn sm" data-f="all">전체</button>'+
    '<button class="btn sm" data-f="unknown">모르는 것만</button>'+
    '<button class="btn sm" data-f="known">아는 것만</button>'+
    '<span class="pill" id="vcount"></span>';
  const body = el('div');
  host.innerHTML=''; host.appendChild(tools); host.appendChild(body);
  let filter='all', q='';

  function draw(){
    const kn = store.known(); let shown=0, total=0;
    body.innerHTML='';
    groups.forEach((g,gi)=>{
      const rows = g.items.filter((it,ii)=>{
        total++;
        const id = uid+'-'+gi+'-'+ii;
        const isK = !!kn[id];
        if(filter==='known' && !isK) return false;
        if(filter==='unknown' && isK) return false;
        if(q && !(it[0].toLowerCase().includes(q)||it[1].toLowerCase().includes(q))) return false;
        return true;
      });
      if(!rows.length) return;
      const sec = el('div','vgroup');
      sec.innerHTML = '<h4>'+esc(g.group)+' <span style="color:var(--line-2)">('+rows.length+')</span></h4>';
      const list = el('div','vlist');
      g.items.forEach((it,ii)=>{
        if(!rows.includes(it)) return;
        const id = uid+'-'+gi+'-'+ii;
        shown++;
        const r = el('div','vrow'+(kn[id]?' known':''));
        r.innerHTML = '<button class="mini" data-say="'+esc(it[0])+'">▶</button>'+
          '<div class="t"><b>'+esc(it[0])+'</b><span>'+esc(it[1])+'</span></div>'+
          '<button class="mini'+(kn[id]?' on':'')+'" data-k="'+id+'" title="외웠어요">✓</button>';
        list.appendChild(r);
      });
      sec.appendChild(list); body.appendChild(sec);
    });
    const knCount = Object.keys(kn).filter(k=>k.startsWith(uid+'-')).length;
    $('#vcount',tools).textContent = '외운 단어 '+knCount+' / '+total;
    if(!shown) body.innerHTML='<p style="color:var(--ink-3)">해당하는 단어가 없습니다.</p>';
  }
  $('.search',tools).oninput = e=>{ q=e.target.value.trim().toLowerCase(); draw(); };
  $$('[data-f]',tools).forEach(b=>b.onclick=()=>{filter=b.dataset.f;draw();});
  body.addEventListener('click',e=>{
    const s=e.target.closest('[data-say]'); if(s){say(s.dataset.say);return;}
    const k=e.target.closest('[data-k]'); if(k){ store.toggleKnown(k.dataset.k); draw(); }
  });
  draw();
}
window.ISB.renderVocab = renderVocab;

/* ---------- 플래시카드 ---------- */
function renderFlash(host, pairs, uid){
  let deck = shuffle(pairs), i=0, flipped=false, dir='es';
  host.innerHTML =
   '<div class="fc-stage">'+
     '<div class="fc" id="fcCard"><div class="fc-in">'+
       '<div class="fc-f"><div><div class="big" id="fcA"></div><div class="hint">카드를 눌러 뜻 확인</div></div></div>'+
       '<div class="fc-b"><div><div class="big" id="fcB"></div><div class="hint">다시 눌러 앞면</div></div></div>'+
     '</div></div>'+
     '<div class="fc-bar">'+
       '<button class="btn sm" id="fcPrev">← 이전</button>'+
       '<button class="btn sm pri" id="fcSay">🔊 듣기</button>'+
       '<button class="btn sm" id="fcNext">다음 →</button>'+
       '<button class="btn sm" id="fcDir">스→한</button>'+
       '<button class="btn sm" id="fcShuf">섞기</button>'+
       '<button class="btn sm" id="fcKnow">✓ 외웠어요</button>'+
     '</div>'+
     '<div class="fc-count" id="fcCount"></div>'+
   '</div>';
  const card=$('#fcCard',host);
  function draw(){
    const p = deck[i]; flipped=false; card.classList.remove('flip');
    const front = dir==='es'? p[0] : p[1];
    const back  = dir==='es'? p[1] : p[0];
    $('#fcA',host).innerHTML = '<span class="'+(dir==='es'?'es':'')+'">'+esc(front)+'</span>';
    $('#fcB',host).innerHTML = '<span class="'+(dir==='es'?'':'es')+'">'+esc(back)+'</span>';
    const kn=store.known(); const id=uid+'-fc-'+pairs.indexOf(p);
    $('#fcKnow',host).classList.toggle('pri', !!kn[id]);
    $('#fcCount',host).textContent = (i+1)+' / '+deck.length+'  ·  외운 카드 '+
      Object.keys(kn).filter(k=>k.startsWith(uid+'-fc-')).length;
  }
  card.onclick = ()=>{ flipped=!flipped; card.classList.toggle('flip',flipped); };
  $('#fcNext',host).onclick=()=>{ i=(i+1)%deck.length; draw(); };
  $('#fcPrev',host).onclick=()=>{ i=(i-1+deck.length)%deck.length; draw(); };
  $('#fcSay',host).onclick=()=> say(deck[i][0]);
  $('#fcShuf',host).onclick=()=>{ deck=shuffle(pairs); i=0; draw(); toast('카드를 섞었습니다'); };
  $('#fcDir',host).onclick=e=>{ dir = dir==='es'?'ko':'es'; e.target.textContent = dir==='es'?'스→한':'한→스'; draw(); };
  $('#fcKnow',host).onclick=()=>{ store.toggleKnown(uid+'-fc-'+pairs.indexOf(deck[i])); draw(); i=(i+1)%deck.length; draw(); };
  document.addEventListener('keydown',ev=>{
    if(!host.offsetParent) return;
    if(ev.key==='ArrowRight'){$('#fcNext',host).click();}
    if(ev.key==='ArrowLeft'){$('#fcPrev',host).click();}
    if(ev.key===' '){ev.preventDefault();card.click();}
  });
  draw();
}
window.ISB.renderFlash = renderFlash;

/* ---------- 동사 활용표 + 드릴 ---------- */
function renderVerbs(host, verbs){
  host.innerHTML='';
  verbs.forEach((v,vi)=>{
    const c = el('div','card verbcard');
    c.innerHTML =
      '<h4 class="es">'+esc(v.inf)+'</h4><div class="note">'+esc(v.ko)+(v.note?' · '+esc(v.note):'')+'</div>'+
      '<table class="vtab"><thead><tr><th>인칭</th><th>현재형</th><th style="width:40px"></th></tr></thead><tbody>'+
      v.forms.map(f=>'<tr><td>'+esc(f[0])+'</td><td class="form" data-form="'+esc(f[1])+'">'+esc(f[1])+'</td>'+
        '<td><button class="mini" style="width:26px;height:26px;border:1px solid var(--line-2);border-radius:7px;background:none;cursor:pointer" data-say="'+esc(v.inf.replace(/se$/,'')+' '+f[1])+'">▶</button></td></tr>').join('')+
      '</tbody></table>'+
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn sm" data-drill="'+vi+'">✍️ 빈칸 연습</button>'+
        '<button class="btn sm" data-sayall="'+vi+'">🔊 전체 듣기</button>'+
      '</div>';
    host.appendChild(c);
  });
  host.addEventListener('click',e=>{
    const s=e.target.closest('[data-say]'); if(s){ say(s.dataset.say.split(' ').pop()); return; }
    const sa=e.target.closest('[data-sayall]');
    if(sa){ const v=verbs[+sa.dataset.sayall];
      TTS.queue(v.forms.map(f=>({text:f[1],gap:300}))); return; }
    const d=e.target.closest('[data-drill]');
    if(d){
      const v=verbs[+d.dataset.drill];
      const card=d.closest('.verbcard');
      const cells=$$('td.form',card);
      if(d.dataset.state==='on'){
        cells.forEach(td=>{td.textContent=td.dataset.form;});
        d.textContent='✍️ 빈칸 연습'; d.dataset.state='';
        return;
      }
      cells.forEach(td=>{
        td.innerHTML='<input placeholder="?" autocomplete="off">';
        const inp=$('input',td);
        const want=td.dataset.form.toLowerCase();
        const norm=s=>s.trim().toLowerCase().normalize('NFC');
        const bare=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const hit=()=>{ const g=norm(inp.value); return g===want || (g && bare(g)===bare(want)); };
        inp.addEventListener('input',()=>{
          inp.classList.remove('ok','no');
          if(inp.value.trim() && hit()) inp.classList.add('ok');
        });
        inp.addEventListener('keydown',ev=>{
          if(ev.key!=='Enter') return;
          ev.preventDefault();
          if(hit()){
            inp.classList.remove('no'); inp.classList.add('ok');
            const all=$$('input',card); const n=all[all.indexOf(inp)+1]; if(n)n.focus();
          } else { inp.classList.remove('ok'); inp.classList.add('no'); }
        });
      });
      d.textContent='정답 보기'; d.dataset.state='on';
    }
  });
}
window.ISB.renderVerbs = renderVerbs;

/* ---------- 대화 ---------- */
function renderDialogs(host, dialogs){
  host.innerHTML='';
  dialogs.forEach((d,di)=>{
    const box = el('div','dlg');
    box.innerHTML =
      '<h4>'+esc(d.title)+'</h4>'+
      (d.intro?'<div class="intro">'+esc(d.intro)+'</div>':'')+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
        '<button class="btn sm pri" data-play="'+di+'">▶ 전체 재생</button>'+
        '<button class="btn sm" data-stop="1">■ 정지</button>'+
        '<button class="btn sm" data-ko="'+di+'">한국어 가리기</button>'+
      '</div>'+
      d.lines.map((l,li)=>
        '<div class="dline" data-li="'+li+'">'+
          '<span class="who">'+esc(l[0])+'</span>'+
          '<div><div class="sp es" data-say="'+esc(l[1])+'">'+esc(l[1])+'</div>'+
          '<div class="ko">'+esc(l[2])+'</div></div>'+
        '</div>').join('');
    host.appendChild(box);
  });
  host.addEventListener('click',e=>{
    const s=e.target.closest('[data-say]'); if(s){ say(s.dataset.say); return; }
    if(e.target.closest('[data-stop]')){ TTS.stop(); $$('.dline',host).forEach(x=>x.classList.remove('active')); return; }
    const k=e.target.closest('[data-ko]');
    if(k){ const box=k.closest('.dlg'); const h=box.classList.toggle('hideko');
      k.textContent = h?'한국어 보기':'한국어 가리기'; return; }
    const p=e.target.closest('[data-play]');
    if(p){
      const d=dialogs[+p.dataset.play], box=p.closest('.dlg');
      const lines=$$('.dline',box);
      TTS.queue(d.lines.map((l,li)=>({
        text:l[1], gap:560,
        before:()=>{ lines.forEach(x=>x.classList.remove('active'));
          lines[li].classList.add('active');
          lines[li].scrollIntoView({block:'center',behavior:'smooth'}); }
      })), 0, ()=> lines.forEach(x=>x.classList.remove('active')));
    }
  });
}
window.ISB.renderDialogs = renderDialogs;

/* ---------- 퀴즈 엔진 ---------- */
function renderQuiz(host, pool, opts){
  opts = opts||{};
  const n = Math.min(opts.count||pool.length, pool.length);
  let qs = shuffle(pool).slice(0,n);
  let i=0, right=0, wrong=[], locked=false, t0=Date.now();
  host.innerHTML='<div class="quizbox"><div id="qArea"></div></div>';
  const area = $('#qArea',host);

  function norm(s){ return String(s).toLowerCase().normalize('NFC').replace(/[.,!?¡¿;]/g,'').trim(); }
  function stripAcc(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,''); }

  function draw(){
    if(i>=qs.length) return finish();
    const q=qs[i]; locked=false;
    const pct=Math.round(i/qs.length*100);
    let inner =
      '<div class="qmeta"><span>'+(i+1)+' / '+qs.length+'</span>'+
      '<span class="qbar"><i style="width:'+pct+'%"></i></span>'+
      '<span>정답 '+right+'</span></div>'+
      '<div class="qcard"><div class="qtext">'+q.q.replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡][A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡,.…!?\s_]{3,})/g, m=>/[가-힣]/.test(m)?m:'<span class="es">'+m+'</span>')+'</div>';
    if(q.t==='mc'){
      inner += '<div class="opts">'+q.o.map((o,oi)=>
        '<button class="opt" data-o="'+oi+'"><span class="k">'+'ABCD'[oi]+'</span><span>'+esc(o)+'</span></button>').join('')+'</div>';
    } else {
      inner += '<div class="fillwrap"><input id="fillIn" placeholder="답을 입력하세요" autocomplete="off" autocapitalize="off">'+
        '<button class="btn pri" id="fillGo">확인</button></div>';
    }
    inner += '<div class="fb" id="fb"></div>'+
      '<div class="qfoot"><button class="btn" id="qNext" disabled>다음 문제 →</button>'+
      (q.t==='fill'?'<button class="btn ghost sm" id="qSkip">모르겠어요</button>':'')+
      '<span style="margin-left:auto;font-size:12.5px;color:var(--ink-3)">'+
      (q.t==='mc'?'A·B·C·D 키로도 선택할 수 있어요':'Enter로 확인')+'</span></div></div>';
    area.innerHTML = inner;
    const fb=$('#fb',area), next=$('#qNext',area);

    function reveal(ok, userAns){
      if(locked) return; locked=true;
      if(ok){ right++; fb.className='fb show ok'; fb.innerHTML='<b>정답입니다 ✓</b>'+esc(q.e||''); }
      else {
        const ans = q.t==='mc'? q.o[q.a] : q.a[0];
        fb.className='fb show no';
        fb.innerHTML='<b>정답: '+esc(ans)+'</b>'+esc(q.e||'');
        wrong.push({q:q.q, ans:ans, mine:userAns||'(무응답)'});
      }
      next.disabled=false; next.classList.add('pri'); next.focus();
      if(q.t==='mc'){
        $$('.opt',area).forEach((b,bi)=>{ b.disabled=true;
          if(bi===q.a) b.classList.add('ok');
          else if(b.dataset.picked) b.classList.add('no'); });
      } else {
        const inp=$('#fillIn',area); if(inp){ inp.disabled=true; inp.classList.add(ok?'ok':'no'); }
        const corr = q.t==='fill' ? q.a[0] : '';
        if(corr) say(corr);
      }
    }
    if(q.t==='mc'){
      $$('.opt',area).forEach(b=> b.onclick=()=>{ b.dataset.picked=1; reveal(+b.dataset.o===q.a, q.o[+b.dataset.o]); });
    } else {
      const inp=$('#fillIn',area);
      const check=()=>{ const g=norm(inp.value);
        const ok = q.a.some(a=> norm(a)===g || stripAcc(norm(a))===stripAcc(g));
        reveal(ok, inp.value); };
      $('#fillGo',area).onclick=check;
      inp.onkeydown=e=>{ if(e.key==='Enter'){ if(locked) next.click(); else check(); } };
      inp.focus();
      $('#qSkip',area).onclick=()=>reveal(false,'');
    }
    next.onclick=()=>{ i++; draw(); };
    area.onkeydown=null;
    document.onkeydown=e=>{
      if(q.t==='mc' && !locked){
        const k='abcd'.indexOf(e.key.toLowerCase());
        if(k>-1 && q.o[k]){ const b=$$('.opt',area)[k]; if(b){b.dataset.picked=1;b.click();} }
      }
      if(e.key==='Enter' && locked && !next.disabled) next.click();
    };
  }

  function finish(){
    document.onkeydown=null;
    const pct = Math.round(right/qs.length*100);
    const mins = Math.max(1,Math.round((Date.now()-t0)/60000));
    const msg = pct>=90?'완벽해요! 시험 준비가 거의 끝났어요.'
      : pct>=75?'잘하고 있어요. 틀린 부분만 다시 보면 충분합니다.'
      : pct>=50?'절반을 넘겼어요. 문법 카드를 한 번 더 복습해 보세요.'
      : '아직 낯선 부분이 많아요. 핵심 문법부터 천천히 다시 봅시다.';
    if(opts.save) store.score(opts.save, pct);
    area.innerHTML =
      '<div class="qcard result"><div class="score">'+pct+'<span style="font-size:.4em">점</span></div>'+
      '<div class="msg">'+right+' / '+qs.length+' 정답 · 약 '+mins+'분 소요<br>'+msg+'</div>'+
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
        '<button class="btn pri" id="again">다시 풀기</button>'+
        (wrong.length?'<button class="btn" id="onlyWrong">틀린 문제만 다시</button>':'')+
        '<a class="btn" href="index.html">홈으로</a>'+
      '</div>'+
      (wrong.length?'<div class="wrongbox"><h4>틀린 문제 ('+wrong.length+')</h4>'+
        wrong.map(w=>'<div class="wrongitem">'+esc(w.q)+'<br><span class="ans">정답: '+esc(w.ans)+'</span>'+
        ' <span style="color:var(--ink-3)">· 내 답: '+esc(w.mine)+'</span></div>').join('')+'</div>':'')+
      '</div>';
    $('#again',area).onclick=()=>{ qs=shuffle(pool).slice(0,n); i=0;right=0;wrong=[];t0=Date.now(); draw(); };
    const ow=$('#onlyWrong',area);
    if(ow) ow.onclick=()=>{
      const texts=wrong.map(w=>w.q);
      const sub=pool.filter(p=>texts.includes(p.q));
      qs=shuffle(sub); i=0;right=0;wrong=[];t0=Date.now(); draw();
    };
  }
  draw();
}
window.ISB.renderQuiz = renderQuiz;

/* ---------- 받아쓰기 ---------- */
function renderDictation(host, pairs){
  /* 받아쓰기는 완결된 문장만 사용 (구·단어 조각 제외) */
  const full = pairs.filter(p=>/[.!?]$/.test(p[0].trim()));
  if(full.length>=10) pairs = full;
  let deck=shuffle(pairs), i=0, score=0, done=0;
  host.innerHTML='<div class="quizbox"><div class="qcard">'+
    '<div class="qmeta"><span id="dCount"></span><span class="qbar"><i id="dBar" style="width:0%"></i></span><span id="dScore">정답 0</span></div>'+
    '<p style="color:var(--ink-3);font-size:14px;margin-top:0">음성을 듣고 스페인어 문장을 그대로 입력하세요. 강세 기호는 없어도 정답으로 처리됩니다.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+
      '<button class="btn pri" id="dPlay">🔊 다시 듣기</button>'+
      '<button class="btn" id="dSlow">🐢 느리게</button>'+
      '<button class="btn ghost" id="dShow">정답 보기</button>'+
    '</div>'+
    '<div class="fillwrap"><input id="dIn" placeholder="들린 문장을 입력…" autocomplete="off" autocapitalize="off">'+
    '<button class="btn pri" id="dGo">확인</button></div>'+
    '<div class="fb" id="dFb"></div>'+
    '<div class="qfoot"><button class="btn" id="dNext">다음 →</button></div>'+
  '</div></div>';
  const inp=$('#dIn',host), fb=$('#dFb',host);
  const clean=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.,!?¡¿;:"“”]/g,'').replace(/\s+/g,' ').trim();
  function draw(){
    fb.className='fb'; inp.value=''; inp.disabled=false; inp.className=''; inp.focus();
    $('#dCount',host).textContent=(i+1)+' / '+deck.length;
    $('#dBar',host).style.width=Math.round(done/deck.length*100)+'%';
    $('#dScore',host).textContent='정답 '+score;
    setTimeout(()=>say(deck[i][0]),250);
  }
  function check(){
    if(inp.disabled) return;
    const ok = clean(inp.value)===clean(deck[i][0]);
    inp.disabled=true; inp.classList.add(ok?'ok':'no');
    if(ok)score++; done++;
    fb.className='fb show '+(ok?'ok':'no');
    fb.innerHTML='<b>'+(ok?'정답입니다 ✓':'정답을 확인하세요')+'</b><span class="es" style="font-size:16px">'+esc(deck[i][0])+'</span><br><span style="color:var(--ink-3)">'+esc(deck[i][1])+'</span>';
    $('#dScore',host).textContent='정답 '+score;
  }
  $('#dPlay',host).onclick=()=>say(deck[i][0]);
  $('#dSlow',host).onclick=()=>say(deck[i][0],0.7);
  $('#dShow',host).onclick=check;
  $('#dGo',host).onclick=check;
  inp.onkeydown=e=>{ if(e.key==='Enter'){ if(inp.disabled)$('#dNext',host).click(); else check(); } };
  $('#dNext',host).onclick=()=>{ i=(i+1)%deck.length; if(i===0){deck=shuffle(pairs);done=0;score=0;} draw(); };
  draw();
}
window.ISB.renderDictation = renderDictation;

/* ---------- 짝 맞추기 게임 ---------- */
function renderMatch(host, pairs){
  let round=[], picked=null, solved=0, tries=0;
  function start(){
    round = shuffle(pairs).slice(0,8);
    const cards = shuffle(round.flatMap((p,idx)=>[{k:idx,txt:p[0],es:1},{k:idx,txt:p[1],es:0}]));
    picked=null; solved=0; tries=0;
    host.innerHTML='<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">'+
      '<span class="pill" id="mScore">0 / 8</span><button class="btn sm" id="mNew">새 게임</button>'+
      '<span style="font-size:13px;color:var(--ink-3)">스페인어와 뜻을 짝지어 보세요</span></div>'+
      '<div class="grid g3" id="mGrid"></div>';
    const g=$('#mGrid',host);
    cards.forEach(c=>{
      const b=el('button','card');
      b.style.cssText='cursor:pointer;padding:16px;text-align:center;font-size:15px;min-height:76px';
      b.innerHTML = c.es? '<span class="es" style="font-size:17px">'+esc(c.txt)+'</span>' : esc(c.txt);
      b.dataset.k=c.k; b.dataset.es=c.es;
      b.onclick=()=>pick(b,c);
      g.appendChild(b);
    });
    $('#mNew',host).onclick=start;
  }
  function pick(b,c){
    if(b.dataset.done) return;
    if(c.es) say(c.txt);
    if(!picked){ picked={b,c}; b.style.borderColor='var(--brand)'; b.style.background='var(--brand-soft)'; return; }
    if(picked.b===b){ picked.b.style.borderColor='';picked.b.style.background=''; picked=null; return; }
    tries++;
    if(picked.c.k===c.k && picked.c.es!==c.es){
      [picked.b,b].forEach(x=>{x.dataset.done=1;x.style.borderColor='var(--teal)';x.style.background='var(--teal-soft)';x.style.opacity=.75;});
      solved++; $('#mScore',host).textContent=solved+' / 8';
      if(solved===8) toast('완성! '+tries+'번 시도했어요 🎉');
    } else {
      const a=picked.b;
      a.style.borderColor='var(--no)';b.style.borderColor='var(--no)';
      setTimeout(()=>{ [a,b].forEach(x=>{ if(!x.dataset.done){x.style.borderColor='';x.style.background='';} }); },520);
    }
    picked.b.style.background = picked.b.dataset.done?'var(--teal-soft)':'';
    picked=null;
  }
  start();
}
window.ISB.renderMatch = renderMatch;

/* ---------- 어휘/문장 추출 헬퍼 ---------- */
function unitPairs(u){
  const out=[];
  (u.vocab||[]).forEach(g=>g.items.forEach(it=>out.push([it[0],it[1]])));
  return out;
}
function unitSentences(u){
  const out=[];
  (u.grammar||[]).forEach(g=>(g.ex||[]).forEach(e=>{ if(e[0].length<60 && !e[0].includes('_')) out.push([e[0],e[1]]); }));
  (u.dialogs||[]).forEach(d=>d.lines.forEach(l=>{ if(l[1].length<70 && !l[1].includes('_')) out.push([l[1],l[2]]); }));
  (u.catPos||[]).forEach(c=>out.push(c));
  const seen=new Set();
  return out.filter(p=>{ const k=p[0]; if(seen.has(k))return false; seen.add(k); return true; });
}
window.ISB.unitPairs = unitPairs;
window.ISB.unitSentences = unitSentences;

})();
