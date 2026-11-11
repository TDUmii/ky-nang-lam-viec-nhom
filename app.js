/* Góc Học Nhóm — offline exam trainer. No libraries, tracking, or network requests. */
(function () {
  'use strict';

  var TOPICS = [
    'Nền tảng & lợi ích làm việc nhóm',
    'Các giai đoạn phát triển nhóm',
    'Điều hành và phong cách lãnh đạo',
    'Thuyết trình & tổ chức cuộc họp',
    'Giao tiếp & giải quyết xung đột',
    'Lập kế hoạch, SMART và quản lý',
    'Hợp tác, thuyết phục & tư duy phản biện'
  ];
  var ranges = [[1,40],[41,76],[77,109],[110,131],[132,147],[148,205],[206,250]];
  var byNumber = {};
  ranges.forEach(function(r,i){for(var n=r[0];n<=r[1];n++)byNumber[n]=TOPICS[i];});

  var rawBank = window.BANK || {original: [], similar: []};
  var originals = (rawBank.original || []).map(function (q) { return Object.assign({}, q, {topic: byNumber[q.number] || TOPICS[6]}); });
  var similar = (rawBank.similar || []).map(function (q) { return Object.assign({}, q); });
  var ALL = originals.concat(similar);
  var LOOKUP = {};
  ALL.forEach(function (q) { LOOKUP[q.id] = q; });

  var ICONS = {
    home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    library:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M12 8h6M12 12h6M12 16h4"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M9 8h7"/>',
    timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M18.5 5.5l2-2"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    bookmark:'<path d="M6 3.5h12v17l-6-4-6 4z"/>',
    chart:'<path d="M4 20V4M4 20h17M8 16v-4M13 16V7M18 16V9"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check:'<path d="M4 12l5 5L20 6"/>',
    spark:'<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 10-12h-7z"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.5"/><path d="M16 16l5 5"/>',
    upload:'<path d="M12 16V3M7 8l5-5 5 5M4 15v5h16v-5"/>',
    download:'<path d="M12 3v13M7 11l5 5 5-5M4 17v4h16v-4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    layers:'<path d="M3 8l9-5 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    rotate:'<path d="M3 9V4h5M3 4a9 9 0 1 1-1 11"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
    close:'<path d="M5 5l14 14M19 5L5 19"/>',
    flag:'<path d="M5 21V4M5 5c4-3 8 3 13 0v11c-5 3-9-3-13 0"/>',
    chevron:'<path d="M9 18l6-6-6-6"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[name]||ICONS.check)+'</svg>'; }
  document.querySelectorAll('[data-i]').forEach(function(el){ el.innerHTML = icon(el.getAttribute('data-i')); });

  var root = document.getElementById('viewRoot');
  var STORE = 'goc_hoc_nhom_2026_v1';
  var defaults = function(){ return {bookmarks:[], mistakes:[], seen:{}, correct:{}, repetition:{}, history:[], active:null}; };
  function load() { try { var r = JSON.parse(localStorage.getItem(STORE)); return r && typeof r === 'object' ? Object.assign(defaults(), r) : defaults(); } catch (e) { return defaults(); } }
  var progress = load();
  if(!Array.isArray(progress.bookmarks))progress.bookmarks=[];
  if(!Array.isArray(progress.mistakes))progress.mistakes=[];
  if(!Array.isArray(progress.history))progress.history=[];
  if(!progress.seen||typeof progress.seen!=='object')progress.seen={};
  if(!progress.correct||typeof progress.correct!=='object')progress.correct={};
  if(!progress.repetition||typeof progress.repetition!=='object')progress.repetition={};
  function save() { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch (e) {} }
  var screen = 'home';
  var setup = {mode:'study', source:'original', count:'20', duration:'0', topic:'all'};
  var quickSource = 'original';
  var quickAdvance = null;
  var library = {kind:'all', source:'all', topic:'all', query:'', page:1};
  var revealed = {};
  var timerRef = null;
  var toastRef = null;
  var currentResult = null;

  function h(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function shuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function byId(id){return LOOKUP[id];}
  /* Spaced retrieval: 1 / 3 / 7 / 14 days after consecutive correct recalls.
     Wrong answers are due on the next practice session, but never duplicated in one test.
     Legacy v1 progress.seen is read without changing or resetting the user's history. */
  var DAY_MS=86400000;
  var REVIEW_INTERVAL_DAYS=[1,3,7,14];
  function wasSeen(q){return Number(progress.seen[q.id]||0)>0;}
  function memoryFor(q){
    var c=progress.repetition[q.id];
    if(c&&typeof c==='object')return c;
    if(!wasSeen(q))return {streak:0,nextReviewAt:0,lastSeenAt:0,correctCount:0,wrongCount:0};
    return {streak:progress.correct[q.id]?1:0,nextReviewAt:0,lastSeenAt:0,correctCount:progress.correct[q.id]?1:0,wrongCount:progress.correct[q.id]?0:1};
  }
  function isReviewDue(q,now){
    if(!wasSeen(q))return false;
    var card=memoryFor(q);
    return progress.mistakes.includes(q.id)||Number(card.nextReviewAt||0)<=now;
  }
  function reviewPriority(q,now){
    var card=memoryFor(q), last=Number(card.lastSeenAt||0);
    var overdue=Number(card.nextReviewAt||0)<=now;
    var score=(progress.mistakes.includes(q.id)?10000:0)+(!progress.correct[q.id]?1000:0)
      +(overdue?600:0)+(progress.bookmarks.includes(q.id)?90:0)
      +Math.min(400,Math.floor((now-last)/DAY_MS));
    return score;
  }
  function dueReviewQuestions(pool){
    var now=Date.now();
    return pool.filter(function(q){return isReviewDue(q,now);})
      .sort(function(a,b){return reviewPriority(b,now)-reviewPriority(a,now);});
  }
  function pickBalanced(pool,count){
    var shuffled=shuffle(pool);
    var fresh=shuffled.filter(function(q){return !wasSeen(q);});
    var reviewed=shuffled.filter(wasSeen),now=Date.now();
    reviewed.sort(function(a,b){return reviewPriority(b,now)-reviewPriority(a,now);});
    // Aim for roughly one familiar question per two new ones.
    var quota=Math.min(reviewed.length,Math.round(count*.35));
    var known=reviewed.slice(0,quota);
    var novel=fresh.slice(0,count-quota);
    // Once all available new questions are used, fill remaining places from older material.
    for(var k=quota;k<reviewed.length&&known.length+novel.length<count;k++)known.push(reviewed[k]);
    for(var n=novel.length;n<fresh.length&&known.length+novel.length<count;n++)novel.push(fresh[n]);
    var total=known.length+novel.length;
    var scheduled=new Set();
    for(var i=0;i<known.length;i++)scheduled.add(Math.min(total-1,Math.floor((i+1)*total/(known.length+1))));
    var selected=[],nextNew=0,nextReview=0;
    for(var pos=0;pos<total;pos++){
      var review=scheduled.has(pos);
      if(review&&nextReview>=known.length)review=false;
      if(!review&&nextNew>=novel.length)review=true;
      selected.push({q:review?known[nextReview++]:novel[nextNew++],kind:review?'review':'new'});
    }
    return selected;
  }
  function sourceLabel(q){return q.source === 'Tài liệu PDF' ? 'Tài liệu PDF' : 'Câu luyện tập';}
  function sourceClass(q){return q.source === 'Tài liệu PDF' ? 'tag' : 'tag gold';}
  function asDate(ts){return new Date(ts).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  function fmtTime(ms){var n=Math.max(0,Math.floor(ms/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function sessionName(mode,durationMs){return mode==='quick'?'Làm nhanh '+((durationMs||180000)/60000)+' phút':mode==='exam'?'Thi thử':'Ôn từng câu';}
  function toast(msg){var node=document.getElementById('toast');node.textContent=msg;node.classList.add('visible');clearTimeout(toastRef);toastRef=setTimeout(function(){node.classList.remove('visible');},2300);}
  function pageHeading(kicker,title,subtitle,action){return '<div class="page-heading"><div><div class="page-kicker">'+h(kicker)+'</div><h1>'+h(title)+'</h1><p>'+h(subtitle)+'</p></div>'+(action||'')+'</div>';}
  function badge(q){return '<span class="'+sourceClass(q)+'">'+h(sourceLabel(q))+'</span>';}
  function empty(title,description,action){return '<div class="card empty"><div class="empty-icon">'+icon('book')+'</div><h2>'+h(title)+'</h2><p>'+h(description)+'</p>'+(action||'')+'</div>';}
  function topicOptions(value,includeAll){return (includeAll?'<option value="all">Tất cả chủ đề</option>':'')+TOPICS.map(function(topic){return '<option value="'+h(topic)+'"'+(value===topic?' selected':'')+'>'+h(topic)+'</option>';}).join('');}

  function nav(view, mode){
    stopClock();
    if(view==='setup'){
      setup.mode = mode || setup.mode;
      setup.duration = setup.mode==='exam'?'30':'0';
      setup.count = setup.mode==='exam'?'30':'20';
      setup.source = 'original';setup.topic='all';
    }
    if(view==='mistakes'||view==='bookmarks'||view==='library'){
      library.kind=view==='library'?'all':view;
      library.query='';library.topic='all';library.source='all';library.page=1;
    }
    screen=view;
    render();
    window.scrollTo({top:0,behavior:'instant'});
    closeMobile();
  }
  function updateNav(){
    var titles={home:'Tổng quan',library:'Ngân hàng câu hỏi',quick:'Làm nhanh 3p / 5p',setup:'Thiết lập luyện tập',quiz:'Đang làm bài',results:'Kết quả',mistakes:'Câu cần luyện lại',bookmarks:'Đã đánh dấu',history:'Lịch sử kết quả'};
    var activeMode=screen==='setup'?setup.mode:screen==='quiz'&&progress.active?progress.active.mode:null;
    var activeNav=activeMode==='study'||activeMode==='exam'?'setup':activeMode==='quick'?'quick':screen;
    document.getElementById('pageTitle').textContent=screen==='setup'?(setup.mode==='study'?'Ôn tập từng câu':'Thi thử'):screen==='quiz'&&activeMode?(activeMode==='study'?'Ôn tập từng câu':activeMode==='exam'?'Thi thử':'Làm nhanh 3p / 5p'):(titles[screen]||'Ôn thi');
    document.querySelectorAll('.nav-item, .mobile-tab').forEach(function(el){
      var selected=el.dataset.nav===activeNav&&(activeNav!=='setup'||el.dataset.mode===activeMode);
      el.classList.toggle('active',selected);
      if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    document.getElementById('mistakeCount').textContent=progress.mistakes.length;
    document.getElementById('bookmarkCount').textContent=progress.bookmarks.length;
  }
  function render(){
    updateNav();
    if(!ALL.length){root.innerHTML=empty('Không có dữ liệu câu hỏi','Kiểm tra file bank.js trong thư mục website.');return;}
    if(screen==='home')renderHome();
    else if(screen==='quick')renderQuick();
    else if(screen==='setup')renderSetup();
    else if(screen==='quiz')renderQuiz();
    else if(screen==='results')renderResults();
    else if(screen==='history')renderHistory();
    else renderLibrary();
  }
  function sprintCard(minutes,compact){
    var short=minutes===3,amount=short?8:10;
    return '<button type="button" class="sprint-card '+(short?'sprint-three':'sprint-five')+(compact?' compact':'')+'" data-quick="'+minutes+'" aria-label="Bắt đầu thử thách '+minutes+' phút, '+amount+' câu">'+
      '<span class="sprint-header"><span class="sprint-label">'+(short?'TĂNG TỐC':'BỀN BỈ')+'</span><span class="sprint-arrow">'+icon('arrow')+'</span></span>'+
      '<span class="sprint-clock">'+String(minutes).padStart(2,'0')+'<span>:00</span></span>'+
      '<span class="sprint-description">'+amount+' câu · xen câu ôn lại <span class="sprint-dot">·</span> Tự nộp khi hết giờ</span>'+
      '<span class="sprint-action">Bắt đầu ngay '+icon('arrow')+'</span></button>';
  }
  function renderQuick(){
    var choices=[['original','250 câu từ tài liệu','Ngân hàng PDF']].map(function(x){
      return '<button type="button" class="quick-source-choice'+(quickSource===x[0]?' selected':'')+'" data-quick-source="'+x[0]+'" aria-pressed="'+(quickSource===x[0])+'"><strong>'+x[1]+'</strong><small>'+x[2]+'</small></button>';
    }).join('');
    root.innerHTML=pageHeading('LUYỆN PHẢN XẠ','Làm nhanh, nhớ lâu hơn.','Một lượt làm ngắn để tự kiểm tra tốc độ và độ chính xác. Hết giờ hệ thống tự nộp bài.')+
      '<div class="quick-page-intro"><div class="quick-intro-icon">'+icon('timer')+'</div><div><span class="page-kicker">CHẾ ĐỘ SPRINT</span><h2>Chỉ cần 3 hoặc 5 phút.</h2><p>Chọn đề bên dưới, sau đó bấm vào mốc thời gian. Câu hỏi và đáp án được đảo ngẫu nhiên mỗi lượt.</p></div></div>'+
      '<div class="section-header"><h2>1. Chọn nguồn câu hỏi</h2><span class="section-note">Có thể thay đổi trước khi bắt đầu</span></div>'+
      '<div class="quick-source-grid">'+choices+'</div>'+
      '<div class="section-header"><h2>2. Chọn thời gian</h2><span class="section-note">Nhấn để làm bài ngay</span></div>'+
      '<div class="sprint-grid page-sprints">'+sprintCard(3,false)+sprintCard(5,false)+'</div>'+
      '<div class="spaced-guide"><span class="spaced-guide-icon">'+icon('rotate')+'</span><div><strong>Đề mới vẫn nhắc câu cũ</strong><p>Khoảng 2/3 câu chưa học + 1/3 câu từng gặp. Ưu tiên câu sai, câu đã lâu chưa ôn; lần đầu chưa có câu cũ sẽ dùng toàn câu mới.</p></div></div>'+
      '<div class="quick-facts"><div>'+icon('bolt')+' <strong>Chọn xong tự sang câu tiếp</strong><span>Không cần bấm “Tiếp theo” sau mỗi đáp án.</span></div><div>'+icon('timer')+' <strong>Đếm ngược theo thời gian thực</strong><span>Hết 3/5 phút sẽ tự nộp và chấm điểm.</span></div><div>'+icon('chart')+' <strong>Xem kết quả & câu sai</strong><span>Điểm và lịch sử được lưu trên trình duyệt.</span></div></div>';
  }
  function startQuick(minutes){
    if(minutes!==3&&minutes!==5)return;
    if(progress.active&&!window.confirm('Bắt đầu thử thách mới sẽ thay thế bài đang làm dở. Tiếp tục?'))return;
    setup.count=String(minutes===3?8:10);
    launch(originals,'quick',quickSource,minutes,true);
  }
  function stat(title,value,sub,ico,klass){return '<div class="stat-card"><div class="stat-top"><span>'+h(title)+'</span><span class="stat-icon '+(klass||'')+'">'+icon(ico)+'</span></div><span class="stat-value">'+h(value)+'</span><div class="stat-foot">'+h(sub)+'</div></div>';}
  function renderHome(){
    var dueCount=dueReviewQuestions(ALL).length;
    var answered=Object.keys(progress.seen).length;
    var learned=Object.keys(progress.correct).filter(function(k){return progress.correct[k];}).length;
    var total=ALL.length;
    var history=progress.history;
    var average=history.length?Math.round(history.reduce(function(sum,x){return sum+x.score;},0)/history.length):0;
    var topics=TOPICS.filter(function(t){return ALL.some(function(q){return q.topic===t;});});
    var topicHtml=topics.map(function(t){
      var qs=ALL.filter(function(q){return q.topic===t;});
      var done=qs.filter(function(q){return !!progress.seen[q.id];}).length;
      return '<div class="topic-row"><div><div class="topic-name">'+h(t)+'</div><div class="progress-track"><div class="progress-fill" style="width:'+(done/qs.length*100)+'%"></div></div></div><div class="topic-count">'+done+' / '+qs.length+' câu</div></div>';
    }).join('');
    var resume=progress.active && progress.active.items && progress.active.items.length?'<div class="notice" style="margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>Có bài đang làm dở</strong><div class="small">Bạn đã lưu tiến độ của bài '+h(sessionName(progress.active.mode,progress.active.durationMs))+'.</div></div><div class="btn-row"><button class="btn btn-primary btn-sm" data-action="resume">Tiếp tục bài</button><button class="btn btn-quiet btn-sm" data-action="discard">Bỏ bài cũ</button></div></div>':'';
    root.innerHTML=
      '<section class="hero"><div class="hero-copy"><span class="page-kicker">KỸ NĂNG LÀM VIỆC NHÓM · 2026</span><h1>Học gọn mỗi ngày.<br>Vững vàng khi vào thi.</h1><p>250 câu từ tài liệu PDF, kèm đáp án được tô đỏ. Học ngắn mỗi ngày, nhớ bền vững khi vào thi. Ôn kiến thức trọng tâm, thi thử và thử thách phản xạ chỉ trong vài phút.</p><div class="btn-row"><button class="btn btn-white" data-nav="setup" data-mode="study">Bắt đầu ôn tập '+icon('arrow')+'</button><button class="btn btn-outline" style="color:#fff;border-color:#7797dd" data-nav="setup" data-mode="exam">Thi thử ngay</button></div></div><div class="hero-stamp"><strong>'+total+'</strong><small>CÂU HỎI ÔN TẬP</small></div></section>'+
      resume+
      '<div class="sprint-section"><div class="section-header"><div><span class="eyebrow-note">LÀM NHANH / QUICK CHALLENGE</span><h2>Tranh thủ vài phút, nhớ thêm nhiều câu.</h2></div><button class="link-inline" data-nav="quick">Tùy chỉnh bộ đề '+icon('arrow')+'</button></div><div class="sprint-home-grid"><div class="sprint-home-intro"><span class="mini-icon">'+icon('bolt')+'</span><strong>Thử thách tốc độ</strong><p>Chọn một mốc thời gian. Trả lời liên tục, hệ thống tự chuyển câu và chấm điểm khi hết giờ.</p><div class="intro-line"><span class="intro-signal"></span> Lấy từ tài liệu PDF</div></div>'+sprintCard(3,true)+sprintCard(5,true)+'</div></div>'+
      '<section class="stats-grid">'+stat('Câu hỏi trong PDF',originals.length,'Đáp án chữ màu đỏ','library')+stat('Đã đánh dấu',progress.bookmarks.length,'Câu bạn muốn ôn lại','layers','green')+stat('Đã trả lời đúng',learned,'Trong '+answered+' câu đã làm','check','amber')+stat('Điểm trung bình',average+'%','Qua '+history.length+' lượt làm bài','chart','pink')+'</section>'+
      '<div class="section-header"><h2>Chọn cách ôn tập</h2><span class="section-note">Học theo nhịp độ của bạn</span></div>'+
      '<section class="mode-grid">'+
      '<button class="mode-card" data-nav="setup" data-mode="study"><span class="mode-icon">'+icon('book')+'</span><span class="mode-arrow">'+icon('arrow')+'</span><h3>Ôn từng câu</h3><p>Chọn đáp án, nhận phản hồi ngay. Phù hợp lúc bắt đầu học hoặc ôn trước giờ thi.</p></button>'+
      '<button class="mode-card" data-nav="setup" data-mode="exam"><span class="mode-icon amber">'+icon('timer')+'</span><span class="mode-arrow">'+icon('arrow')+'</span><h3>Thi thử tính giờ</h3><p>Đề ngẫu nhiên, đảo đáp án, có đồng hồ và bảng tổng kết như thi thật.</p></button>'+
      '<button class="mode-card" data-nav="mistakes"><span class="mode-icon green">'+icon('target')+'</span><span class="mode-arrow">'+icon('arrow')+'</span><h3>Chinh phục câu sai</h3><p>Tập trung những câu chưa đúng, luyện lại đến khi nhớ được kiến thức.</p></button>'+
      '</section>'+
      '<section class="lower-grid"><div class="panel"><div class="panel-head"><h3>Tiến độ theo chủ đề</h3><span class="section-note">'+answered+' / '+total+' đã làm</span></div>'+topicHtml+'</div>'+
      '<div class="panel"><div class="panel-head"><h3>Cách học hiệu quả</h3>'+icon('spark')+'</div>'+
      '<div class="memory-status"><div class="memory-status-icon">'+icon('rotate')+'</div><div><span class="memory-status-label">CẦN NHỚ LẠI</span><strong>'+dueCount+' câu đến lượt ôn</strong><small>'+(dueCount?'Ưu tiên những câu sai hoặc đã đến hạn ôn.':'Làm một đề để bắt đầu tạo lịch ghi nhớ.')+'</small></div></div>'+
      '<div class="quick-points"><div class="quick-point">'+icon('check')+'Mỗi đề: khoảng 65% câu mới và 35% câu đã học.</div><div class="quick-point">'+icon('check')+'Trả lời sai: gặp lại ở lần luyện tiếp theo.</div><div class="quick-point">'+icon('check')+'Trả lời đúng: nhắc sau 1, 3, 7, 14 ngày.</div></div>'+
      (dueCount?'<button type="button" class="btn btn-primary btn-sm" style="margin-top:19px" data-action="review-due">'+icon('rotate')+' Câu cần ôn tối đa 10 câu đến hạn</button>':'')+
      '<div class="tip-panel" style="margin-top:24px"><strong>Phân biệt rõ nguồn câu hỏi</strong>Đáp án được trích trực tiếp từ phần tô đỏ trong tài liệu PDF. Nguồn có một số lỗi chính tả, cần xem giáo trình khi có điểm chưa rõ.</div>'+
      '<div class="btn-row" style="margin-top:19px"><button class="btn btn-quiet btn-sm" data-action="download-answers">'+icon('download')+' Tải 250 đáp án</button><button class="btn btn-quiet btn-sm" data-action="export-progress">'+icon('download')+' Sao lưu tiến độ</button><button class="btn btn-quiet btn-sm" data-action="import-progress">'+icon('upload')+' Khôi phục tiến độ</button></div></div></section';
  }

  function renderSetup(){
    var isExam=setup.mode==='exam';
    var sourceChoices=[['original','Ngân hàng tài liệu','250 câu có đáp án màu đỏ']].map(function(choice){
      return '<button type="button" class="choice-btn'+(setup.source===choice[0]?' selected':'')+'" data-source="'+choice[0]+'"><strong>'+choice[1]+'</strong><small>'+choice[2]+'</small></button>';
    }).join('');
    var countOptions=['10','20','30','50','100','all'].map(function(n){
      return '<option value="'+n+'"'+(setup.count===n?' selected':'')+'>'+(n==='all'?'Tất cả câu hiện có':n+' câu')+'</option>';
    }).join('');
    var timeOptions=[['0','Không giới hạn thời gian'],['3','3 phút'],['5','5 phút'],['10','10 phút'],['20','20 phút'],['30','30 phút'],['45','45 phút'],['60','60 phút'],['90','90 phút']].map(function(x){
      return '<option value="'+x[0]+'"'+(setup.duration===x[0]?' selected':'')+'>'+x[1]+'</option>';
    }).join('');
    var timeField=isExam?
      '<div class="form-row"><label class="caption" for="setupDuration">4. Thời gian làm bài</label><select class="form-select" id="setupDuration">'+timeOptions+'</select><p class="setup-field-note">Hết thời gian hệ thống tự nộp. Bạn cũng có thể nộp sớm.</p></div>':
      '<div class="setup-no-timer">'+icon('book')+' <span><strong>Không giới hạn thời gian</strong><small>Ở chế độ ôn tập, bạn học theo tốc độ của mình và xem đáp án sau mỗi câu.</small></span></div>';
    var sidebar=isExam?
      '<h3>Như một bài thi thật</h3><p>Chọn đáp án cho từng câu, có thể quay lại để sửa. <strong>Không hiển thị đúng/sai</strong> trước khi nộp bài.</p>'+
      '<div class="aside-feature">'+icon('timer')+'Đếm ngược theo thời gian đã chọn</div><div class="aside-feature">'+icon('check')+'Chấm điểm khi nộp hoặc hết giờ</div><div class="aside-feature">'+icon('chart')+'Báo cáo câu đúng, câu sai và lịch sử</div>':
      '<h3>Học để nhớ kiến thức</h3><p>Chọn đáp án và <strong>biết đúng hay sai ngay</strong>. Đáp án chính xác được tô xanh để dễ ghi nhớ.</p>'+
      '<div class="aside-feature">'+icon('check')+'Xem đáp án đúng sau mỗi lựa chọn</div><div class="aside-feature">'+icon('bookmark')+'Đánh dấu câu cần học lại</div><div class="aside-feature">'+icon('target')+'Tự động lưu các câu trả lời sai</div>';
    var headingTitle=isExam?'Thi thử như thi thật':'Ôn tập từng câu';
    var headingInfo=isExam?'Làm bài có đồng hồ, không lộ đáp án trước khi nộp.':'Học theo nhịp độ riêng, nhận phản hồi ngay sau mỗi câu.';
    root.innerHTML=pageHeading(isExam?'CHẾ ĐỘ KIỂM TRA':'CHẾ ĐỘ HỌC TẬP',headingTitle,headingInfo)+
      '<section class="setup-mode-banner '+(isExam?'exam-banner':'study-banner')+'">'+
        '<div class="setup-mode-emblem">'+icon(isExam?'timer':'book')+'</div>'+
        '<div class="setup-mode-copy"><div class="setup-mode-kicker">'+(isExam?'THI THỬ · ĐÁNH GIÁ':'ÔN TẬP · TIẾP THU')+'</div>'+
          '<h2>'+(isExam?'Kiểm tra kiến thức của bạn':'Nắm vững từng câu một')+'</h2>'+
          '<p>'+(isExam?'Chọn đáp án, quản lý thời gian và chỉ xem kết quả sau khi hoàn thành bài.':'Mỗi câu đều được chấm ngay, kèm đáp án đúng và danh sách cần luyện lại.')+'</p></div>'+
        '<button type="button" class="setup-switch" data-nav="setup" data-mode="'+(isExam?'study':'exam')+'">'+icon(isExam?'book':'timer')+' Chuyển sang '+(isExam?'Ôn tập':'Thi thử')+'</button>'+
      '</section>'+
      '<div class="setup-grid"><div class="card setup-card"><div class="setup-section-top"><span class="page-kicker">'+(isExam?'THIẾT LẬP ĐỀ THI':'THIẾT LẬP BÀI ÔN')+'</span><h2>'+(isExam?'Tạo đề thi thử':'Chọn nội dung cần ôn')+'</h2><p>'+(isExam?'Bạn có thể chọn câu hỏi ngẫu nhiên từ một hoặc cả hai ngân hàng.':'Học từ bộ đề gốc hoặc thử các câu hỏi bổ sung để ghi nhớ tốt hơn.')+'</p></div>'+
      '<div class="form-row"><label class="caption">1. Ngân hàng câu hỏi</label><div class="choice-grid">'+sourceChoices+'</div></div>'+
      '<div class="form-row control-grid"><div><label class="caption" for="setupCount">2. Số câu hỏi</label><select class="form-select" id="setupCount">'+countOptions+'</select></div>'+
      '<div><label class="caption" for="setupTopic">3. Chủ đề</label><select class="form-select" id="setupTopic">'+topicOptions(setup.topic,true)+'</select></div></div>'+
      timeField+
      '<div class="spaced-setup-note">'+icon('rotate')+' <span><strong>Ghi nhớ lâu hơn:</strong> Mỗi đề tự xen khoảng 35% câu từng học. Câu sai và câu đến hạn ôn sẽ được ưu tiên.</span></div>'+
      '<div class="btn-row setup-actions"><button type="button" class="btn btn-primary" data-action="start">'+icon('arrow')+' '+(isExam?'Bắt đầu thi thử':'Bắt đầu ôn tập')+'</button><button type="button" class="btn btn-quiet" data-nav="home">Trở về tổng quan</button></div></div>'+
      '<aside class="card setup-aside"><div class="aside-art '+(isExam?'exam-art':'study-art')+'">'+icon(isExam?'timer':'book')+'</div>'+sidebar+'</aside></div>';
  }

  function getPool(){
    var pool=originals;
    if(setup.topic!=='all')pool=pool.filter(function(q){return q.topic===setup.topic;});
    return pool;
  }
  function launch(items,mode,source,duration,smart){
    if(!items.length){toast('Chưa có câu hỏi cho lựa chọn này.');return;}
    var count=setup.count==='all'?items.length:Math.max(1,Math.min(items.length,Number(setup.count)||20));
    var chosen=smart?pickBalanced(items,count):shuffle(items).slice(0,count).map(function(q){return {q:q,kind:'custom'};});
    progress.active={id:Date.now(),mode:mode||'study',source:source||'original',durationMs:Math.max(0,Number(duration)||0)*60000,startedAt:Date.now(),index:0,responses:{},reviewed:{},items:chosen.map(function(item){return {id:item.q.id,kind:item.kind,order:shuffle([0,1,2,3])};})};
    save();screen='quiz';render();window.scrollTo({top:0,behavior:'instant'});
  }
  function startFromSetup(){
    setup.count=document.getElementById('setupCount').value;
    setup.topic=document.getElementById('setupTopic').value;
    var timerSelect=document.getElementById('setupDuration');
    setup.duration=setup.mode==='exam'&&timerSelect?timerSelect.value:'0';
    if(progress.active && !window.confirm('Bạn đang có bài làm dở. Bắt đầu bài mới sẽ thay thế bài này. Tiếp tục?'))return;
    launch(getPool(),setup.mode,setup.source,setup.duration,true);
  }
  function getCurrent(){
    var s=progress.active;if(!s||!Array.isArray(s.items)||!s.items.length)return null;
    return {s:s,item:s.items[s.index],q:byId(s.items[s.index].id)};
  }
  function correctCount(s){
    return s.items.filter(function(item){var q=byId(item.id);return q && Object.prototype.hasOwnProperty.call(s.responses,item.id) && s.responses[item.id]===q.answer;}).length;
  }
  function answeredCount(s){return s.items.filter(function(item){return Object.prototype.hasOwnProperty.call(s.responses,item.id);}).length;}
  function renderQuiz(){
    var part=getCurrent();if(!part||!part.q){nav('home');return;}
    var s=part.s,q=part.q,idx=s.index,answered=Object.prototype.hasOwnProperty.call(s.responses,q.id);
    var selected=s.responses[q.id],locked=s.mode==='study'&&answered;
    var remaining=s.durationMs?Math.max(0,s.durationMs-(Date.now()-s.startedAt)):0;
    var answerList=part.item.order.map(function(optionIndex,orderIndex){
      var option=q.options[optionIndex],selectedHere=answered&&selected===optionIndex;
      var cls=locked?(optionIndex===q.answer?' correct':selectedHere?' wrong':''):(selectedHere?' selected':'');
      return '<button class="answer-option'+cls+'" data-answer="'+optionIndex+'"'+(locked?' disabled':'')+'><span class="letter">'+String.fromCharCode(65+orderIndex)+'</span><span class="answer-text">'+h(option)+'</span>'+(locked&&optionIndex===q.answer?icon('check'):'')+'</button>';
    }).join('');
    var feedback='';
    if(locked){
      var right=selected===q.answer;
      feedback='<div class="feedback'+(right?'':' fail')+'"><strong>'+(right?'Chính xác!':'Chưa đúng, ôn lại nhé.')+'</strong><p class="correct-line">Đáp án đúng: '+h(q.options[q.answer])+'</p><p>'+h(q.explanation||'Đáp án được trích nguyên văn từ phần phản hồi của bài thi PDF.')+'</p></div>';
    }
    var grid=s.items.map(function(item,i){
      return '<button title="Câu '+(i+1)+(progress.bookmarks.includes(item.id)?' - Đánh dấu':'')+'" aria-label="Chuyển đến câu '+(i+1)+'" class="number-chip'+(Object.prototype.hasOwnProperty.call(s.responses,item.id)?' done':'')+(i===idx?' current':'')+(progress.bookmarks.includes(item.id)?' flagged':'')+'" data-jump="'+i+'">'+(i+1)+'</button>';
    }).join('');
    var progressPct=answeredCount(s)/s.items.length*100;
    var recallLabel=part.item.kind==='review'?'<span class="tag green memory-tag">'+icon('rotate')+' Ôn lại</span>':part.item.kind==='new'?'<span class="tag gray memory-tag">Câu mới</span>':'';
    var mobileClock=s.durationMs?'<span class="mobile-quiz-clock"><span>'+icon('timer')+' Còn lại</span><strong id="mobileTimeText">'+fmtTime(remaining)+'</strong></span>':'';
    root.innerHTML=
      '<div class="quiz-top"><div class="quiz-meta"><span class="tag'+(s.mode==='exam'||s.mode==='quick'?' gold':'')+'">'+h(sessionName(s.mode,s.durationMs))+'</span><span class="tag gray">'+h(q.topic)+'</span>'+recallLabel+'</div>'+mobileClock+'<div class="btn-row"><button class="btn btn-quiet btn-sm" data-action="exit-quiz">Về trang chủ</button><button class="btn btn-outline btn-sm" data-action="finish">Nộp bài</button></div></div>'+
      '<div class="quiz-layout"><section class="card question-card"><div class="question-head"><span class="part">CÂU '+(idx+1)+' <span style="color:#9fa9bd">/ '+s.items.length+'</span></span><div class="btn-row"><span class="origin">'+h(sourceLabel(q))+' · '+h(q.id)+'</span><button class="icon-button'+(progress.bookmarks.includes(q.id)?' active':'')+'" title="Đánh dấu câu này" aria-label="Đánh dấu câu này" aria-pressed="'+(progress.bookmarks.includes(q.id)?'true':'false')+'" data-bookmark="'+h(q.id)+'">'+icon('bookmark')+'</button></div></div><h2 class="question-title">'+h(q.question)+'</h2><div class="answer-list">'+answerList+'</div>'+feedback+
      '<div class="quiz-actions"><button class="btn btn-quiet" data-action="prev"'+(idx===0?' disabled':'')+'>'+icon('back')+' Trước</button><div class="btn-row"><button class="btn btn-primary" data-action="'+(idx===s.items.length-1?'finish':'next')+'">'+(idx===s.items.length-1?'Nộp bài':'Câu tiếp')+' '+icon('arrow')+'</button></div></div></section>'+
      '<aside class="card quiz-side">'+
      (s.durationMs?'<div class="timer-box'+(remaining<60000?' urgent':'')+(s.mode==='quick'?' quick-timer':'')+'" id="quizTimer"><small>THỜI GIAN CÒN LẠI</small><strong id="timeText">'+fmtTime(remaining)+'</strong><div class="countdown-track"><span id="countdownFill" style="width:'+(remaining/s.durationMs*100)+'%"></span></div></div>':'<div class="timer-box"><small>CHẾ ĐỘ</small><strong style="font-size:17px">Không giới hạn</strong></div>')+
      '<h4>Tiến độ làm bài</h4><p>'+answeredCount(s)+' / '+s.items.length+' câu đã trả lời</p><div class="quiz-progress"><span style="width:'+progressPct+'%"></span></div><div class="number-grid">'+grid+'</div><div class="shortcut-note">Mẹo: nhấn <strong>A / B / C / D</strong> để chọn đáp án, phím <strong>← / →</strong> để chuyển câu. <strong>Enter</strong> để sang câu tiếp.</div></aside></div>';
    startClock();
  }
  function rememberAnswer(q,correct){
    var before=memoryFor(q),now=Date.now(),streak=correct?Math.min(4,(Number(before.streak)||0)+1):0;
    progress.repetition[q.id]={
      streak:streak,lastSeenAt:now,
      nextReviewAt:correct?now+REVIEW_INTERVAL_DAYS[streak-1]*DAY_MS:now,
      correctCount:(Number(before.correctCount)||0)+(correct?1:0),
      wrongCount:(Number(before.wrongCount)||0)+(correct?0:1)
    };
    progress.seen[q.id]=(Number(progress.seen[q.id])||0)+1;
    progress.correct[q.id]=correct;
    if(correct)progress.mistakes=progress.mistakes.filter(function(id){return id!==q.id;});
    else if(!progress.mistakes.includes(q.id))progress.mistakes.unshift(q.id);
  }
  function answerQuestion(optionIndex){
    var part=getCurrent();if(!part)return;
    var s=part.s,q=part.q;
    if(s.mode==='study'&&Object.prototype.hasOwnProperty.call(s.responses,q.id))return;
    if(!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>3)return;
    s.responses[q.id]=optionIndex;
    if(s.mode==='study'&&!s.reviewed[q.id]){rememberAnswer(q,optionIndex===q.answer);s.reviewed[q.id]=true;}
    save();renderQuiz();
    if(s.mode==='quick'){
      if(quickAdvance)clearTimeout(quickAdvance);
      var currentIndex=s.index;
      quickAdvance=setTimeout(function(){
        if(progress.active!==s||screen!=='quiz'||s.index!==currentIndex)return;
        if(answeredCount(s)===s.items.length){finishQuiz(false);return;}
        if(currentIndex<s.items.length-1)jumpQuestion(currentIndex+1);
      },260);
    }
  }
  function jumpQuestion(index){
    var s=progress.active;if(!s||index<0||index>=s.items.length)return;
    s.index=index;save();renderQuiz();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function changeQuestion(delta){
    var s=progress.active;if(!s)return;
    jumpQuestion(Math.min(s.items.length-1,Math.max(0,s.index+delta)));
  }
  function finishQuiz(auto){
    var s=progress.active;if(!s)return;
    var answered=answeredCount(s);
    if(!auto&&answered<s.items.length&&!window.confirm('Bạn mới làm '+answered+'/'+s.items.length+' câu. Nộp bài ngay?'))return;
    var wrong=[];
    s.items.forEach(function(item){
      var q=byId(item.id);if(!q)return;
      var selected=s.responses[item.id];
      if(selected!==q.answer)wrong.push(item.id);
      if((s.mode==='exam'||s.mode==='quick')&&selected!==undefined)rememberAnswer(q,selected===q.answer);
    });
    var good=correctCount(s);
    var result={
      id:s.id,date:Date.now(),startedAt:s.startedAt,mode:s.mode,source:s.source,durationMs:s.durationMs,
      correct:good,total:s.items.length,answered:answered,score:Math.round(100*good/s.items.length),
      elapsed:Date.now()-s.startedAt,wrongIds:wrong,
      reviewCount:s.items.filter(function(item){return item.kind==='review';}).length,
      newCount:s.items.filter(function(item){return item.kind==='new';}).length,
      items:s.items.map(function(item){return {id:item.id,kind:item.kind||'',chosen:s.responses[item.id]===undefined?null:s.responses[item.id]};})
    };
    progress.history.unshift(result);
    progress.history=progress.history.slice(0,100);
    progress.active=null;save();stopClock();if(quickAdvance)clearTimeout(quickAdvance);quickAdvance=null;currentResult=result;screen='results';render();
    window.scrollTo({top:0,behavior:'instant'});if(auto)toast('Hết giờ! Bài đã được nộp tự động.');
  }
  function startClock(){
    stopClock();
    var s=progress.active;if(!s||!s.durationMs)return;
    function tick(){
      if(screen!=='quiz'||progress.active!==s){stopClock();return;}
      var left=s.durationMs-(Date.now()-s.startedAt);
      if(left<=0){finishQuiz(true);return;}
      ['timeText','mobileTimeText'].forEach(function(id){
        var label=document.getElementById(id);
        if(label)label.textContent=fmtTime(left);
      });
      var box=document.getElementById('quizTimer');
      if(box)box.classList.toggle('urgent',left<60000);
      var fill=document.getElementById('countdownFill');
      if(fill)fill.style.width=Math.max(0,left/s.durationMs*100)+'%';
    }
    tick();timerRef=setInterval(tick,1000);
  }
  function stopClock(){if(timerRef!==null){clearInterval(timerRef);timerRef=null;}}
  function renderResults(){
    var r=currentResult||progress.history[0];if(!r){nav('history');return;}
    var verdict=r.score>=80?'Làm bài rất tốt!':r.score>=50?'Bạn đang tiến bộ.':'Hãy tập trung vào câu chưa vững.';
    var review=r.items.filter(function(item){var q=byId(item.id);return q && q.answer!==item.chosen;});
    var html=review.slice(0,60).map(function(item,i){
      var q=byId(item.id),chosen=item.chosen===null?'Chưa trả lời':q.options[item.chosen];
      return '<div class="card review-item"><div class="quiz-meta" style="margin-bottom:8px"><span class="tag gray">Câu cần ôn '+(i+1)+'</span>'+badge(q)+'</div><h3>'+h(q.question)+'</h3><div class="answer-line bad"><strong>Bạn chọn: </strong>'+h(chosen)+'</div><div class="answer-line good"><strong>Đáp án đúng: </strong>'+h(q.answerText)+'</div></div>';
    }).join('');
    root.innerHTML=pageHeading('KẾT QUẢ','Tổng kết lượt làm bài','Đã lưu kết quả và cập nhật danh sách câu cần ôn.')+
      '<div class="card result-hero"><div class="result-ring" style="--value:'+r.score+'%"><strong>'+r.score+'%</strong></div><h1>'+h(verdict)+'</h1><p>'+h(sessionName(r.mode,r.durationMs))+' · '+asDate(r.date)+'</p>'+
      '<div class="result-metrics"><div class="result-metric"><strong>'+r.correct+' / '+r.total+'</strong><span>Trả lời đúng</span></div><div class="result-metric"><strong>'+r.wrongIds.length+'</strong><span>Chưa đúng / bỏ trống</span></div><div class="result-metric"><strong>'+fmtTime(r.elapsed)+'</strong><span>Thời gian thực hiện</span></div></div>'+
      (r.reviewCount||r.newCount?'<p class="memory-summary">'+icon('rotate')+' Đề này gồm <strong>'+(r.newCount||0)+' câu mới</strong> và <strong>'+(r.reviewCount||0)+' câu ôn lại</strong>.</p>':'')+
      '<div class="btn-row" style="justify-content:center"><button class="btn btn-primary" data-action="retry-wrong">'+icon('rotate')+' Luyện lại câu sai</button><button class="btn btn-quiet" data-nav="home">Về tổng quan</button><button class="btn btn-outline" data-nav="history">Lịch sử</button></div></div>'+
      (review.length?'<div class="section-header"><h2>Những câu cần xem lại</h2><span class="section-note">'+review.length+' câu</span></div><div class="result-list">'+html+'</div>':'<div class="notice" style="margin-top:20px">Bạn đã làm đúng toàn bộ câu trong lượt thi này. Hãy thử trộn cả hai bộ đề để nâng độ khó.</div>');
  }

  function filterQuestions(){
    var pool=library.kind==='mistakes'?progress.mistakes.map(byId).filter(Boolean):library.kind==='bookmarks'?progress.bookmarks.map(byId).filter(Boolean):ALL;
    if(library.source!=='all')pool=pool.filter(function(q){return library.source==='original'?(q.id[0]==='G'):(q.id[0]==='L');});
    if(library.topic!=='all')pool=pool.filter(function(q){return q.topic===library.topic;});
    if(library.query){
      var query=norm(library.query);
      pool=pool.filter(function(q){return norm(q.question+' '+q.options.join(' ')+' '+q.answerText+' '+q.topic+' '+q.number).includes(query);});
    }
    return pool;
  }
  function libraryCards(){
    var items=filterQuestions(),total=items.length;
    var pages=Math.max(1,Math.ceil(total/10));library.page=Math.min(Math.max(1,library.page),pages);
    var shown=items.slice((library.page-1)*10,library.page*10);
    var cards=shown.map(function(q){
      var open=!!revealed[q.id],fav=progress.bookmarks.includes(q.id);
      var answers=open?'<div class="answer-preview">'+q.options.map(function(x,i){return '<div style="margin:5px 0;'+(i===q.answer?'font-weight:750;color:#208c65':'')+'">'+String.fromCharCode(65+i)+'. '+h(x)+(i===q.answer?' ✓':'')+'</div>';}).join('')+'<div style="margin-top:10px;padding-top:9px;border-top:1px solid #e1e8f3"><strong>Đáp án: '+h(q.answerText)+'</strong><div style="margin-top:5px;color:#8391a5">'+h(q.explanation||'Theo phần phản hồi chính thức trên trang xem lại bài PDF.')+'</div></div></div>':'';
      return '<article class="card library-card"><div class="library-card-head"><div class="quiz-meta"><span class="tag gray">Câu '+q.number+'</span>'+badge(q)+'<span class="tag gray">'+h(q.topic)+'</span></div><button class="icon-button'+(fav?' active':'')+'" aria-label="Đánh dấu" aria-pressed="'+fav+'" title="Đánh dấu" data-bookmark="'+h(q.id)+'">'+icon('bookmark')+'</button></div><h3>'+h(q.question)+'</h3><div class="library-card-actions"><button class="btn btn-quiet btn-sm" data-reveal="'+h(q.id)+'">'+icon(open?'close':'book')+' '+(open?'Ẩn đáp án':'Xem 4 lựa chọn & đáp án')+'</button><button class="btn btn-outline btn-sm" data-practice-single="'+h(q.id)+'">Luyện câu này '+icon('arrow')+'</button></div>'+answers+'</article>';
    }).join('');
    return '<div class="library-count">Hiển thị '+(total?(library.page-1)*10+1:0)+'–'+Math.min(library.page*10,total)+' trên '+total+' câu</div>'+
      (total?'<div class="library-list">'+cards+'</div><div class="pagination"><button class="btn btn-quiet btn-sm" data-page="-1"'+(library.page===1?' disabled':'')+'>Trang trước</button><span>Trang '+library.page+' / '+pages+'</span><button class="btn btn-quiet btn-sm" data-page="1"'+(library.page===pages?' disabled':'')+'>Trang sau</button></div>':empty('Không tìm thấy câu hỏi','Thử thay đổi từ khóa hoặc bộ lọc.', '<button class="btn btn-outline" data-action="clear-filter">Xóa bộ lọc</button>'));
  }
  function refreshLibraryCards(){var target=document.getElementById('libraryResults');if(target)target.innerHTML=libraryCards();updateNav();}
  function renderLibrary(){
    var title=library.kind==='mistakes'?'Câu cần luyện lại':library.kind==='bookmarks'?'Những câu đã đánh dấu':'Ngân hàng câu hỏi';
    var description=library.kind==='mistakes'?'Các câu bạn làm sai được tự động thêm vào đây và rời khỏi danh sách khi làm đúng.':library.kind==='bookmarks'?'Lưu những câu quan trọng để quay lại nhanh bất cứ lúc nào.':'Tra cứu trọn bộ 100 câu gốc và 61 câu tương tự, kèm lựa chọn và đáp án.';
    var action=library.kind!=='all'&&filterQuestions().length?'<button class="btn btn-primary" data-action="practice-filter">'+icon('arrow')+' Luyện danh sách này</button>':'<button class="btn btn-quiet" data-action="download-answers">'+icon('download')+' Tải 100 đáp án</button>';
    root.innerHTML=pageHeading('THƯ VIỆN',title,description,action)+
    '<div class="toolbar"><div class="search-wrap">'+icon('search')+'<input class="form-input" id="searchQuestions" type="search" autocomplete="off" placeholder="Tìm theo nội dung, câu số, đáp án..." value="'+h(library.query)+'" aria-label="Tìm câu hỏi"></div>'+
    '<select class="form-select" id="filterSource" aria-label="Nguồn câu hỏi"><option value="all">Tất cả câu hỏi</option><option value="original"'+(library.source==='original'?' selected':'')+'>250 câu PDF</option></select>'+
    '<select class="form-select" id="filterTopic" aria-label="Chủ đề">'+topicOptions(library.topic,true)+'</select></div><div id="libraryResults">'+libraryCards()+'</div>';
  }
  function renderHistory(){
    var entries=progress.history;
    root.innerHTML=pageHeading('THỐNG KÊ','Lịch sử làm bài','Theo dõi từng lượt học và kết quả cải thiện theo thời gian.','<div class="btn-row"><button class="btn btn-quiet" data-action="export-progress">'+icon('download')+' Xuất dữ liệu</button><button class="btn btn-outline" data-action="import-progress">'+icon('upload')+' Khôi phục</button></div>')+
    (entries.length?'<div class="history-list">'+entries.map(function(r,i){
      return '<div class="card history-item"><div><div class="quiz-meta"><span class="tag">'+h(sessionName(r.mode,r.durationMs))+'</span><span class="tag gray">'+h(r.source==='original'?'Tài liệu PDF':r.source==='similar'?'Đề tương tự':'Đề trộn')+'</span></div><h3>'+r.correct+'/'+r.total+' câu đúng</h3><p>'+asDate(r.date)+' · '+fmtTime(r.elapsed)+' · '+r.answered+' câu đã chọn</p></div><div style="text-align:right"><div class="history-score">'+r.score+'<small>%</small></div><button class="btn btn-quiet btn-sm" data-result="'+i+'">Xem chi tiết</button></div></div>';
    }).join('')+'</div>':empty('Chưa có lịch sử','Kết thúc bài ôn hoặc thi thử đầu tiên để xem kết quả tại đây.','<button class="btn btn-primary" data-nav="setup" data-mode="exam">Bắt đầu thi thử</button>'))+
    '<div class="notice" style="margin-top:24px"><strong>Dữ liệu chỉ lưu trên máy này.</strong> Xóa dữ liệu trình duyệt có thể làm mất lịch sử. Hãy dùng nút “Xuất dữ liệu” để sao lưu. <button class="btn btn-danger btn-sm" style="margin-top:9px" data-action="reset-progress">Xóa toàn bộ tiến độ</button></div>';
  }
  function bookmark(id){
    if(!byId(id))return;
    var index=progress.bookmarks.indexOf(id);
    if(index>=0){progress.bookmarks.splice(index,1);toast('Đã bỏ đánh dấu');}
    else{progress.bookmarks.unshift(id);toast('Đã đánh dấu câu hỏi');}
    save();if(screen==='quiz')renderQuiz();else render();
  }
  function download(filename,content,type){
    var blob=new Blob([content],{type:type||'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function downloadAnswers(){
    var txt='250 CÂU ÔN TẬP — KỸ NĂNG LÀM VIỆC NHÓM\nNguồn: PDF 35 trang; đáp án được tô đỏ trong tài liệu.\n\n';
    originals.forEach(function(q){
      txt+='CÂU '+q.number+'. '+q.question+'\n';
      q.options.forEach(function(x,i){txt+='  '+String.fromCharCode(65+i)+'. '+x+'\n';});
      txt+='  => ĐÁP ÁN: '+String.fromCharCode(65+q.answer)+'. '+q.answerText+'\n\n';
    });
    download('250-cau-va-dap-an-ky-nang-lam-viec-nhom.txt',txt);toast('Đã xuất câu hỏi và đáp án.');
  }
  function exportProgress(){download('su-ky-tien-do-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({app:'Su Ky',version:1,exportedAt:new Date().toISOString(),progress:progress},null,2),'application/json;charset=utf-8');toast('Đã sao lưu tiến độ.');}
  function practiceFiltered(){
    var pool=filterQuestions();if(!pool.length){toast('Không có câu hỏi trong danh sách');return;}
    setup.count='all';setup.duration='0';
    if(progress.active&&!window.confirm('Bài đang làm dở sẽ bị thay thế. Tiếp tục?'))return;
    launch(pool,'study','all',0);
  }
  function retryWrong(){
    var r=currentResult||progress.history[0];if(!r||!r.wrongIds.length){toast('Bạn không có câu sai trong lượt này.');return;}
    setup.count='all';setup.duration='0';
    launch(r.wrongIds.map(byId).filter(Boolean),'study','all',0);
  }
  function closeMobile(){document.getElementById('sidebar').classList.remove('open');document.getElementById('mobileOverlay').classList.remove('show');document.getElementById('mobileOverlay').hidden=true;}
  document.getElementById('mobileMenu').addEventListener('click',function(){document.getElementById('sidebar').classList.toggle('open');var show=document.getElementById('sidebar').classList.contains('open');document.getElementById('mobileOverlay').classList.toggle('show',show);document.getElementById('mobileOverlay').hidden=!show;});
  document.getElementById('mobileOverlay').addEventListener('click',closeMobile);

  document.addEventListener('click',function(event){
    var b=event.target.closest('button');if(!b)return;
    if(b.dataset.nav){nav(b.dataset.nav,b.dataset.mode);return;}
    if(b.dataset.quick){startQuick(Number(b.dataset.quick));return;}
    if(b.dataset.quickSource){quickSource=b.dataset.quickSource;renderQuick();return;}
    if(b.dataset.source){setup.source=b.dataset.source;document.querySelectorAll('[data-source]').forEach(function(el){el.classList.toggle('selected',el.dataset.source===setup.source);});return;}
    if(b.dataset.bookmark){bookmark(b.dataset.bookmark);return;}
    if(b.dataset.answer!==undefined){answerQuestion(Number(b.dataset.answer));return;}
    if(b.dataset.jump!==undefined){jumpQuestion(Number(b.dataset.jump));return;}
    if(b.dataset.page){library.page+=Number(b.dataset.page);refreshLibraryCards();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(b.dataset.reveal){revealed[b.dataset.reveal]=!revealed[b.dataset.reveal];refreshLibraryCards();return;}
    if(b.dataset.practiceSingle){setup.count='all';setup.duration='0';if(progress.active&&!window.confirm('Thay thế bài đang làm dở?'))return;launch([byId(b.dataset.practiceSingle)],'study','all',0);return;}
    if(b.dataset.result!==undefined){currentResult=progress.history[Number(b.dataset.result)];screen='results';render();window.scrollTo({top:0,behavior:'instant'});return;}
    var action=b.dataset.action;
    if(action==='start')startFromSetup();
    else if(action==='resume'&&progress.active){screen='quiz';render();}
    else if(action==='discard'){if(window.confirm('Bỏ bài đang làm dở?')){progress.active=null;save();render();}}
    else if(action==='prev')changeQuestion(-1);
    else if(action==='next')changeQuestion(1);
    else if(action==='finish')finishQuiz(false);
    else if(action==='exit-quiz'){screen='home';render();}
    else if(action==='retry-wrong')retryWrong();
    else if(action==='review-due'){
      var toReview=dueReviewQuestions(ALL).slice(0,10);
      if(!toReview.length){toast('Hiện chưa có câu đến hạn ôn.');return;}
      if(progress.active&&!window.confirm('Bài đang làm dở sẽ bị thay thế. Tiếp tục?'))return;
      setup.count='all';setup.duration='0';
      launch(toReview,'study','all',0,false);
    }
    else if(action==='practice-filter')practiceFiltered();
    else if(action==='download-answers')downloadAnswers();
    else if(action==='export-progress')exportProgress();
    else if(action==='import-progress')document.getElementById('importProgress').click();
    else if(action==='clear-filter'){library.query='';library.source='all';library.topic='all';library.page=1;renderLibrary();}
    else if(action==='reset-progress'&&window.confirm('Bạn có chắc muốn xóa TOÀN BỘ kết quả, câu sai và câu đánh dấu trên trình duyệt này?')){progress=defaults();save();currentResult=null;toast('Đã xóa tiến độ');nav('home');}
  });
  document.addEventListener('change',function(event){
    var el=event.target;if(el.id==='filterSource'){library.source=el.value;library.page=1;refreshLibraryCards();}
    if(el.id==='filterTopic'){library.topic=el.value;library.page=1;refreshLibraryCards();}
    if(el.id==='setupCount')setup.count=el.value;
    if(el.id==='setupTopic')setup.topic=el.value;
    if(el.id==='setupDuration')setup.duration=el.value;
  });
  document.addEventListener('input',function(event){
    if(event.target.id==='searchQuestions'){library.query=event.target.value;library.page=1;refreshLibraryCards();}
  });
  document.addEventListener('keydown',function(event){
    if(screen!=='quiz'||!progress.active||event.ctrlKey||event.altKey||event.metaKey)return;
    if(event.target.matches('input,select,textarea,[contenteditable="true"]'))return;
    var k=event.key.toLowerCase();
    if('abcd'.includes(k)&&k.length===1){var ix=k.charCodeAt(0)-97;var part=getCurrent();if(part){answerQuestion(part.item.order[ix]);event.preventDefault();}}
    else if(k==='arrowleft'){changeQuestion(-1);event.preventDefault();}
    else if(k==='arrowright'||k==='enter'){if(progress.active.index<progress.active.items.length-1){changeQuestion(1);event.preventDefault();}}
  });
  document.getElementById('importProgress').addEventListener('change',function(event){
    var file=event.target.files && event.target.files[0];
    if(!file)return;
    var input=event.target,reader=new FileReader();
    reader.onload=function(){
      try{
        var parsed=JSON.parse(String(reader.result||''));
        var incoming=parsed.progress||parsed;
        if(!incoming||!Array.isArray(incoming.bookmarks)||!Array.isArray(incoming.history)||!Array.isArray(incoming.mistakes)||typeof incoming.seen!=='object'||typeof incoming.correct!=='object'){
          throw new Error('Tệp không đúng định dạng tiến độ Sử ký.');
        }
        if(!window.confirm('Khôi phục sẽ thay thế kết quả học tập hiện tại trên trình duyệt. Bạn đồng ý?'))return;
        progress={
          bookmarks:incoming.bookmarks.filter(function(id){return !!LOOKUP[id];}),
          mistakes:incoming.mistakes.filter(function(id){return !!LOOKUP[id];}),
          seen:incoming.seen,correct:incoming.correct,
          repetition:incoming.repetition&&typeof incoming.repetition==='object'?incoming.repetition:{},
          history:incoming.history.slice(0,100),active:null
        };
        save();currentResult=null;nav('home');toast('Đã khôi phục tiến độ thành công.');
      }catch(error){toast('Không đọc được bản sao lưu: '+error.message);}
      finally{input.value='';}
    };
    reader.onerror=function(){toast('Không thể đọc tệp.');input.value='';};
    reader.readAsText(file,'utf-8');
  });
  render();
})();