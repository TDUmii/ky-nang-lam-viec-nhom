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
  function pageHeading(kicker,title,subtitle,action){return '<div class="page-heading"><div><h1>'+h(title)+'</h1></div>'+(action||'')+'</div>';}
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
    var titles={home:'Trang chủ',library:'Ngân hàng câu hỏi',quick:'Làm nhanh 3p / 5p',setup:'Thiết lập luyện tập',quiz:'Đang làm bài',results:'Kết quả',mistakes:'Câu cần luyện lại',bookmarks:'Đã đánh dấu',history:'Lịch sử kết quả'};
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
    root.innerHTML=pageHeading('','Làm nhanh','')+
      '<section class="quick-choice-grid" aria-label="Chọn thời gian làm bài">'+
        '<button type="button" class="quick-time-tile" data-quick="3"><span class="quick-time-icon">'+icon('bolt')+'</span><strong>03:00</strong><span>8 câu</span>'+icon('arrow')+'</button>'+
        '<button type="button" class="quick-time-tile" data-quick="5"><span class="quick-time-icon">'+icon('timer')+'</span><strong>05:00</strong><span>10 câu</span>'+icon('arrow')+'</button>'+
      '</section>';
  }

  function startQuick(minutes){
    if(minutes!==3&&minutes!==5)return;
    if(progress.active&&!window.confirm('Bắt đầu thử thách mới sẽ thay thế bài đang làm dở. Tiếp tục?'))return;
    setup.count=String(minutes===3?8:10);
    launch(originals,'quick',quickSource,minutes,true);
  }
  function stat(title,value,sub,ico,klass){return '<div class="stat-card"><div class="stat-top"><span>'+h(title)+'</span><span class="stat-icon '+(klass||'')+'">'+icon(ico)+'</span></div><span class="stat-value">'+h(value)+'</span><div class="stat-foot">'+h(sub)+'</div></div>';}
  function renderHome(){
    var total=ALL.length;
    var done=Object.keys(progress.seen).filter(function(id){return !!LOOKUP[id];}).length;
    var due=dueReviewQuestions(ALL).length;
    var resume=(progress.active && progress.active.items && progress.active.items.length)?
      '<div class="resume-strip"><div><strong>Bài đang làm dở</strong><span>'+h(sessionName(progress.active.mode,progress.active.durationMs))+'</span></div><div class="btn-row"><button class="btn btn-primary btn-sm" data-action="resume">Tiếp tục</button><button class="btn btn-quiet btn-sm" data-action="discard">Bỏ bài</button></div></div>':'';
    root.innerHTML=
      '<section class="home-titlebar"><div><h1>Kỹ năng làm việc nhóm</h1></div><span class="home-count">'+total+' câu hỏi</span></section>'+
      resume+
      '<section class="action-grid" aria-label="Chọn chức năng">'+
        '<button type="button" class="action-tile action-tile-primary" data-action="study-now">'+
          '<span class="action-icon">'+icon('book')+'</span><span class="action-name">Ôn từng câu</span><span class="action-detail">20 câu</span><span class="action-chevron">'+icon('arrow')+'</span></button>'+
        '<button type="button" class="action-tile" data-nav="setup" data-mode="exam">'+
          '<span class="action-icon">'+icon('timer')+'</span><span class="action-name">Thi thử</span><span class="action-detail">Tùy chọn đề</span><span class="action-chevron">'+icon('arrow')+'</span></button>'+
        '<button type="button" class="action-tile" data-nav="quick">'+
          '<span class="action-icon">'+icon('bolt')+'</span><span class="action-name">Làm nhanh</span><span class="action-detail">3 hoặc 5 phút</span><span class="action-chevron">'+icon('arrow')+'</span></button>'+
        '<button type="button" class="action-tile" data-nav="library">'+
          '<span class="action-icon">'+icon('library')+'</span><span class="action-name">Kho câu hỏi</span><span class="action-detail">'+total+' câu</span><span class="action-chevron">'+icon('arrow')+'</span></button>'+
      '</section>'+
      '<div class="home-utility" aria-label="Chức năng ôn lại">'+
        '<button type="button" class="utility-link" data-nav="setup" data-mode="study">'+icon('filter')+' Tùy chỉnh bài ôn</button>'+
        '<button type="button" class="utility-link" data-nav="mistakes">'+icon('target')+' Câu làm sai <span class="utility-count">'+progress.mistakes.length+'</span></button>'+
        '<button type="button" class="utility-link" data-nav="bookmarks">'+icon('bookmark')+' Đã đánh dấu <span class="utility-count">'+progress.bookmarks.length+'</span></button>'+
        (due?'<button type="button" class="utility-link" data-action="review-due">'+icon('rotate')+' Đến hạn ôn <span class="utility-count">'+due+'</span></button>':'')+
        '<button type="button" class="utility-link" data-nav="history">'+icon('chart')+' Lịch sử</button>'+
      '</div>'+
      '<div class="home-progress"><span>Đã luyện <strong>'+done+' / '+total+'</strong> câu</span><div class="home-progress-track"><div style="width:'+(total?Math.round(done/total*100):0)+'%"></div></div></div>';
  }

  function renderSetup(){
    var isExam=setup.mode==='exam';
    var counts=['10','20','30','50','100','all'].map(function(n){
      return '<option value="'+n+'"'+(setup.count===n?' selected':'')+'>'+(n==='all'?'Toàn bộ câu':n+' câu')+'</option>';
    }).join('');
    var times=[['0','Không giới hạn'],['3','3 phút'],['5','5 phút'],['10','10 phút'],['20','20 phút'],['30','30 phút'],['45','45 phút'],['60','60 phút'],['90','90 phút']].map(function(a){
      return '<option value="'+a[0]+'"'+(setup.duration===a[0]?' selected':'')+'>'+a[1]+'</option>';
    }).join('');
    var tab1='<button type="button" class="mode-tab'+(!isExam?' selected':'')+'" data-nav="setup" data-mode="study" aria-pressed="'+(!isExam)+'">'+icon('book')+' Ôn tập</button>';
    var tab2='<button type="button" class="mode-tab'+(isExam?' selected':'')+'" data-nav="setup" data-mode="exam" aria-pressed="'+isExam+'">'+icon('timer')+' Thi thử</button>';
    root.innerHTML=pageHeading('',isExam?'Thi thử':'Ôn từng câu','')+
      '<div class="mode-tabs" role="group" aria-label="Chế độ làm bài">'+tab1+tab2+'</div>'+
      '<section class="card simple-setup">'+
        '<div class="simple-fields">'+
          '<label>Số câu hỏi<select class="form-select" id="setupCount">'+counts+'</select></label>'+
          '<label>Chủ đề<select class="form-select" id="setupTopic">'+topicOptions(setup.topic,true)+'</select></label>'+
          (isExam?'<label>Thời gian<select class="form-select" id="setupDuration">'+times+'</select></label>':'')+
        '</div>'+
        '<div class="simple-setup-footer"><span>'+icon(isExam?'timer':'check')+(isExam?' Chấm điểm sau khi nộp bài':' Hiển thị đáp án sau mỗi câu')+'</span>'+
          '<button class="btn btn-primary" data-action="start">'+(isExam?'Bắt đầu thi thử':'Bắt đầu ôn tập')+icon('arrow')+'</button>'+
        '</div>'+
      '</section>';
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
      feedback='<div class="feedback'+(right?'':' fail')+'"><strong>'+(right?'Chính xác!':'Chưa đúng')+'</strong><p class="correct-line">Đáp án đúng: '+h(q.options[q.answer])+'</p><p>'+h(q.explanation||'Đáp án được trích nguyên văn từ phần phản hồi của bài thi PDF.')+'</p></div>';
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
    var verdict='Đã hoàn thành';
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
      (review.length?'<div class="section-header"><h2>Những câu cần xem lại</h2><span class="section-note">'+review.length+' câu</span></div><div class="result-list">'+html+'</div>':'<div class="notice" style="margin-top:20px">Không có câu sai trong lượt làm bài này.</div>');
  }

  function filterQuestions(){
    var pool=library.kind==='mistakes'?progress.mistakes.map(byId).filter(Boolean):library.kind==='bookmarks'?progress.bookmarks.map(byId).filter(Boolean):ALL;
    if(library.source==='original')pool=pool.filter(function(q){return q.source==='Tài liệu PDF';});
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
    var description='';
    var action=library.kind!=='all'&&filterQuestions().length?'<button class="btn btn-primary" data-action="practice-filter">'+icon('arrow')+' Luyện danh sách này</button>':'<button class="btn btn-quiet" data-action="download-answers">'+icon('download')+' Tải 250 đáp án</button>';
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
  function exportProgress(){download('goc-hoc-nhom-tien-do-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({app:'Góc Học Nhóm',version:1,exportedAt:new Date().toISOString(),progress:progress},null,2),'application/json;charset=utf-8');toast('Đã sao lưu tiến độ.');}
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
    if(action==='study-now'){
      if(progress.active&&!window.confirm('Bài đang làm dở sẽ được thay thế. Tiếp tục?'))return;
      setup.count='20';setup.duration='0';setup.source='original';setup.topic='all';
      launch(originals,'study','original',0,true);
    }
    else if(action==='start')startFromSetup();
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
          throw new Error('Tệp không đúng định dạng tiến độ Góc Học Nhóm.');
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