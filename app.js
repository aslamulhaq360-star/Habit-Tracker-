const STORAGE_KEY = 'habitTrackerData_v1';
const DEFAULT_DATA = {
  habitName: 'ধারা',
  startDate: '2026-10-15',
  totalDays: 180,
  milestones: [1,3,5,7,10,14,21,30,45,60,75,90,100,120,150,165,180],
  settings: { darkMode:false, weeklyGoal:5, monthlyGoal:20, reminderEnabled:false, reminderTime:'21:00' },
  entries: {}
};

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
function toBn(num){ return String(num).replace(/[0-9]/g, d => BN_DIGITS[d]); }

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_MONTHS_SHORT = ['জানু','ফেব্রু','মার্চ','এপ্রি','মে','জুন','জুলা','আগ','সেপ্ট','অক্টো','নভে','ডিসে'];

function pad(n){ return n<10 ? '0'+n : ''+n; }
function formatDate(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseDate(str){ const [y,m,d] = str.split('-').map(Number); return new Date(y, m-1, d); }
function addDays(dateStr, n){ const d = parseDate(dateStr); d.setDate(d.getDate()+n); return formatDate(d); }
function daysBetween(a,b){ return Math.round((parseDate(b)-parseDate(a))/86400000); }
function todayStr(){ return formatDate(new Date()); }
function bnDateLabel(dateStr, withYear=true){
  const d = parseDate(dateStr);
  const day = toBn(d.getDate());
  const month = BN_MONTHS_SHORT[d.getMonth()];
  return withYear ? `${day} ${month}, ${toBn(d.getFullYear())}` : `${day} ${month}`;
}

let DATA = loadData();
function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    return Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), JSON.parse(raw));
  }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }

function getEndDate(){ return addDays(DATA.startDate, DATA.totalDays - 1); }
function getElapsedDays(){
  const t = todayStr();
  if(t < DATA.startDate) return 0;
  return Math.min(daysBetween(DATA.startDate, t) + 1, DATA.totalDays);
}
function getAllDatesElapsed(){
  const elapsed = getElapsedDays();
  const dates = [];
  for(let i=0;i<elapsed;i++) dates.push(addDays(DATA.startDate, i));
  return dates;
}

function calcStats(){
  const dates = getAllDatesElapsed();
  let success=0, partial=0, fail=0, skip=0, unmarked=0;
  dates.forEach(d=>{
    const e = DATA.entries[d];
    if(!e || !e.status) unmarked++;
    else if(e.status==='success') success++;
    else if(e.status==='partial') partial++;
    else if(e.status==='fail') fail++;
    else if(e.status==='skip') skip++;
  });
  const consideredForRate = dates.length - skip - unmarked;
  const successScore = success + partial*0.5;
  const successRate = consideredForRate>0 ? Math.round((successScore/consideredForRate)*100) : 0;
  const failureRate = consideredForRate>0 ? Math.round((fail/consideredForRate)*100) : 0;
  const elapsed = dates.length;
  const total = DATA.totalDays;
  const remaining = total - elapsed;
  const elapsedPercent = total>0 ? Math.round((elapsed/total)*100) : 0;
  const remainingPercent = 100 - elapsedPercent;
  const fullSuccessPercent = elapsed>0 ? Math.round((success/elapsed)*100) : 0;
  return {success,partial,fail,skip,unmarked,successRate,failureRate,elapsed,total,remaining,elapsedPercent,remainingPercent,fullSuccessPercent};
}

function calcStreaks(){
  const elapsed = getElapsedDays();
  let max=0, run=0, current=0;
  for(let i=0;i<elapsed;i++){
    const e = DATA.entries[addDays(DATA.startDate, i)];
    if(e && (e.status==='success'||e.status==='partial')){ run++; if(run>max) max=run; }
    else if(!(e && e.status==='skip')){ run=0; }
  }
  for(let i=elapsed-1;i>=0;i--){
    const e = DATA.entries[addDays(DATA.startDate, i)];
    if(e && (e.status==='success'||e.status==='partial')) current++;
    else if(e && e.status==='skip') continue;
    else break;
  }
  return {current, max};
}
function getMilestoneStatus(){
  const s = calcStreaks();
  return DATA.milestones.map(m=>({day:m, achieved: s.max >= m}));
}

function renderDashboard(){
  const stats = calcStats();
  const streaks = calcStreaks();
  document.getElementById('elapsed-days-num').textContent = toBn(stats.elapsed);
  document.getElementById('total-days-num').textContent = toBn(DATA.totalDays);
  document.getElementById('ring-percent').textContent = toBn(stats.elapsedPercent)+'%';
  document.getElementById('elapsed-percent-label').textContent = toBn(stats.elapsedPercent)+'%';
  document.getElementById('progress-elapsed').style.width = stats.elapsedPercent+'%';
  document.getElementById('start-date-label').textContent = bnDateLabel(DATA.startDate);
  document.getElementById('end-date-label').textContent = bnDateLabel(getEndDate());
  document.getElementById('header-today').textContent = `${bnDateLabel(DATA.startDate,false)} - ${bnDateLabel(getEndDate())} · ছয় মাসের নির্দিষ্ট সময়সীমা`;
  document.getElementById('stat-elapsed').textContent = toBn(stats.elapsedPercent)+'%';
  document.getElementById('stat-elapsed-days').textContent = toBn(stats.elapsed)+' দিন';
  document.getElementById('stat-success-rate2').textContent = toBn(stats.fullSuccessPercent)+'%';
  document.getElementById('stat-success-fraction').textContent = `${toBn(stats.success)} / ${toBn(stats.elapsed)} অতিবাহিত দিন`;
  document.getElementById('stat-remaining').textContent = toBn(stats.remainingPercent)+'%';
  document.getElementById('stat-remaining-days').textContent = toBn(stats.remaining)+' দিন';
  document.getElementById('stat-success-rate').textContent = toBn(stats.successRate)+'%';
  document.getElementById('stat-failure-rate').textContent = toBn(stats.failureRate)+'%';
  document.getElementById('stat-current-streak').textContent = toBn(streaks.current)+' দিন';
  document.getElementById('stat-max-streak').textContent = toBn(streaks.max)+' দিন';

  const ring = document.getElementById('today-ring');
  const circumference = 2*Math.PI*52;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference - (stats.elapsedPercent/100)*circumference;

  const t = todayStr();
  const entry = DATA.entries[t];
  const badge = document.getElementById('today-status-display');
  const labels = {success:'✅ সফল', partial:'💪 আংশিক সফল', fail:'😔 ব্যর্থ', skip:'😴 ছুটি'};
  if(entry && entry.status){
    badge.textContent = labels[entry.status];
    badge.className = 'today-status-badge status-'+entry.status;
  } else {
    badge.textContent = 'এখনো চিহ্নিত হয়নি';
    badge.className = 'today-status-badge';
  }
  document.getElementById('today-date-text').textContent = 'আজ, '+bnDateLabel(t);
  renderMilestones();
}

function renderMilestones(){
  const wrap = document.getElementById('milestone-list');
  wrap.innerHTML = '';
  getMilestoneStatus().forEach(m=>{
    const chip = document.createElement('div');
    chip.className = 'milestone-chip' + (m.achieved ? ' achieved' : '');
    chip.innerHTML = `<span class="m-day">${toBn(m.day)}</span><span class="m-label">দিন</span>`;
    wrap.appendChild(chip);
  });
}

let calViewMonth = parseDate(DATA.startDate).getMonth();
let calViewYear = parseDate(DATA.startDate).getFullYear();

function renderCalendar(){
  document.getElementById('cal-month-label').textContent = `${BN_MONTHS[calViewMonth]} ${toBn(calViewYear)}`;
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  ['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'].forEach(n=>{
    const h = document.createElement('div');
    h.className = 'cal-dayname'; h.textContent = n;
    grid.appendChild(h);
  });
  const firstDay = new Date(calViewYear, calViewMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(calViewYear, calViewMonth+1, 0).getDate();
  for(let i=0;i<startOffset;i++){
    const blank = document.createElement('div');
    blank.className = 'cal-cell empty';
    grid.appendChild(blank);
  }
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = formatDate(new Date(calViewYear, calViewMonth, d));
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    const inRange = dateStr >= DATA.startDate && dateStr <= getEndDate();
    const entry = DATA.entries[dateStr];
    if(inRange){
      cell.classList.add('in-range');
      if(entry && entry.status) cell.classList.add('status-'+entry.status);
      if(dateStr === todayStr()) cell.classList.add('today');
      cell.addEventListener('click', ()=> openModal(dateStr));
    } else {
      cell.classList.add('out-range');
    }
    cell.textContent = toBn(d);
    grid.appendChild(cell);
  }
}
document.getElementById('cal-prev').addEventListener('click', ()=>{
  calViewMonth--; if(calViewMonth<0){ calViewMonth=11; calViewYear--; }
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', ()=>{
  calViewMonth++; if(calViewMonth>11){ calViewMonth=0; calViewYear++; }
  renderCalendar();
});

let chartDoughnut, chartWeekly, chartLine;
function renderStats(){
  const stats = calcStats();
  const ctx1 = document.getElementById('chart-doughnut');
  if(chartDoughnut) chartDoughnut.destroy();
  chartDoughnut = new Chart(ctx1, {
    type:'doughnut',
    data:{ labels:['সফল','আংশিক','ব্যর্থ','ছুটি','খালি'],
      datasets:[{data:[stats.success,stats.partial,stats.fail,stats.skip,stats.unmarked],
        backgroundColor:['#16a34a','#f59e0b','#dc2626','#6366f1','#d1d5db']}] },
    options:{plugins:{legend:{position:'bottom'}}}
  });
  renderWeeklyBreakdown();
  renderMonthlyBreakdown();
}

function getWeeklyBreakdown(){
  const dates = getAllDatesElapsed();
  const weeks = [];
  for(let i=0;i<dates.length;i+=7){
    const chunk = dates.slice(i,i+7);
    let success=0,partial=0,fail=0;
    chunk.forEach(d=>{
      const e = DATA.entries[d];
      if(e){
        if(e.status==='success') success++;
        else if(e.status==='partial') partial++;
        else if(e.status==='fail') fail++;
      }
    });
    weeks.push({label:`সপ্তাহ ${toBn(weeks.length+1)}`, success, partial, fail, total:chunk.length});
  }
  return weeks;
}
function renderWeeklyBreakdown(){
  const weeks = getWeeklyBreakdown();
  const ctx = document.getElementById('chart-weekly');
  if(chartWeekly) chartWeekly.destroy();
  chartWeekly = new Chart(ctx, {
    type:'bar',
    data:{ labels: weeks.map(w=>w.label),
      datasets:[
        {label:'সফল', data:weeks.map(w=>w.success), backgroundColor:'#16a34a'},
        {label:'আংশিক', data:weeks.map(w=>w.partial), backgroundColor:'#f59e0b'},
        {label:'ব্যর্থ', data:weeks.map(w=>w.fail), backgroundColor:'#dc2626'}
      ]},
    options:{scales:{x:{stacked:true},y:{stacked:true}}, plugins:{legend:{position:'bottom'}}}
  });
  document.getElementById('weekly-breakdown').innerHTML = weeks.map(w=>{
    const met = w.success >= DATA.settings.weeklyGoal;
    return `<div class="breakdown-item"><span>${w.label}</span><span>${toBn(w.success)}/${toBn(w.total)} সফল ${met?'✅':''}</span></div>`;
  }).join('');
}

function getMonthlyBreakdown(){
  const dates = getAllDatesElapsed();
  const map = {};
  dates.forEach(d=>{
    const key = d.slice(0,7);
    if(!map[key]) map[key] = {success:0, total:0};
    map[key].total++;
    if(DATA.entries[d] && DATA.entries[d].status==='success') map[key].success++;
  });
  return Object.keys(map).map(k=>({month:k, ...map[k]}));
}
function renderMonthlyBreakdown(){
  const months = getMonthlyBreakdown();
  const ctx = document.getElementById('chart-line');
  if(chartLine) chartLine.destroy();
  chartLine = new Chart(ctx, {
    type:'line',
    data:{ labels: months.map(m=> BN_MONTHS_SHORT[parseInt(m.month.split('-')[1])-1]),
      datasets:[{label:'সফল দিন', data:months.map(m=>m.success), borderColor:'#65a30d', backgroundColor:'rgba(163,230,53,0.2)', fill:true, tension:0.3}] },
    options:{plugins:{legend:{display:false}}}
  });
  document.getElementById('monthly-breakdown').innerHTML = months.map(m=>{
    const met = m.success >= DATA.settings.monthlyGoal;
    const [y,mo] = m.month.split('-');
    return `<div class="breakdown-item"><span>${BN_MONTHS[parseInt(mo)-1]} ${toBn(y)}</span><span>${toBn(m.success)}/${toBn(m.total)} সফল ${met?'✅':''}</span></div>`;
  }).join('');
}

function renderReview(){
  const filter = document.getElementById('review-filter').value;
  const listEl = document.getElementById('review-list');
  const dates = getAllDatesElapsed().slice().reverse();
  const reasonLabels = {time:'সময়ের অভাব',energy:'শক্তির অভাব',motivation:'অনুপ্রেরণার অভাব',sickness:'অসুস্থতা',other:'অন্যান্য'};
  const statusLabels = {success:'✅ সফল', partial:'💪 আংশিক', fail:'😔 ব্যর্থ', skip:'😴 ছুটি'};
  const filtered = dates.filter(d=>{
    const e = DATA.entries[d];
    if(filter==='all') return e && e.status;
    return e && e.status===filter;
  });
  if(filtered.length===0){
    listEl.innerHTML = '<p class="empty-text">কোনো এন্ট্রি পাওয়া যায়নি</p>';
    return;
  }
  listEl.innerHTML = filtered.map(d=>{
    const e = DATA.entries[d];
    return `<div class="review-item">
      <div class="review-item-top">
        <span class="review-date">${bnDateLabel(d)}</span>
        <span class="review-status status-${e.status}">${statusLabels[e.status]||''}</span>
      </div>
      ${e.reason ? `<p class="review-reason">কারণ: ${reasonLabels[e.reason]||e.reason}</p>` : ''}
      ${e.note ? `<p class="review-note">${e.note}</p>` : ''}
    </div>`;
  }).join('');
}

function renderSettingsFields(){
  document.getElementById('setting-habit-name').value = DATA.habitName;
  document.getElementById('setting-start-date').value = DATA.startDate;
  document.getElementById('setting-total-days').value = DATA.totalDays;
  document.getElementById('setting-weekly-goal').value = DATA.settings.weeklyGoal;
  document.getElementById('setting-monthly-goal').value = DATA.settings.monthlyGoal;
  document.getElementById('setting-dark-mode').checked = DATA.settings.darkMode;
  document.getElementById('setting-reminder').checked = DATA.settings.reminderEnabled;
  document.getElementById('setting-reminder-time').value = DATA.settings.reminderTime;
}

document.getElementById('save-settings-btn').addEventListener('click', ()=>{
  DATA.habitName = document.getElementById('setting-habit-name').value || 'ধারা';
  DATA.startDate = document.getElementById('setting-start-date').value || DATA.startDate;
  DATA.totalDays = parseInt(document.getElementById('setting-total-days').value) || 180;
  DATA.settings.weeklyGoal = parseInt(document.getElementById('setting-weekly-goal').value) || 5;
  DATA.settings.monthlyGoal = parseInt(document.getElementById('setting-monthly-goal').value) || 20;
  saveData();
  document.getElementById('habit-title').textContent = DATA.habitName;
  renderAll();
  showToast('সেটিংস সংরক্ষিত হয়েছে ✅');
});

document.getElementById('setting-dark-mode').addEventListener('change', e=>{
  DATA.settings.darkMode = e.target.checked;
  document.body.classList.toggle('dark', DATA.settings.darkMode);
  saveData();
});
document.getElementById('setting-reminder').addEventListener('change', e=>{
  DATA.settings.reminderEnabled = e.target.checked;
  saveData();
  if(e.target.checked && 'Notification' in window) Notification.requestPermission();
});
document.getElementById('setting-reminder-time').addEventListener('change', e=>{
  DATA.settings.reminderTime = e.target.value;
  saveData();
});

document.getElementById('export-btn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'habit-tracker-backup.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('ব্যাকআপ ডাউনলোড হয়েছে ✅');
});
document.getElementById('import-btn').addEventListener('click', ()=> document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const imported = JSON.parse(reader.result);
      DATA = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), imported);
      saveData(); renderAll(); renderSettingsFields();
      showToast('ব্যাকআপ পুনরুদ্ধার হয়েছে ✅');
    }catch(err){ showToast('ফাইল পড়তে সমস্যা হয়েছে ❌'); }
  };
  reader.readAsText(file);
});
document.getElementById('reset-btn').addEventListener('click', ()=>{
  if(confirm('আপনি কি নিশ্চিত সব ডেটা মুছে ফেলতে চান?')){
    DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData(); renderAll(); renderSettingsFields();
    showToast('সব ডেটা রিসেট হয়েছে');
  }
});

let modalDate = null;
function openModal(dateStr){
  modalDate = dateStr;
  const e = DATA.entries[dateStr] || {};
  document.getElementById('modal-date-title').textContent = bnDateLabel(dateStr);
  document.getElementById('modal-status').value = e.status || 'success';
  document.getElementById('modal-reason').value = e.reason || 'time';
  document.getElementById('modal-note').value = e.note || '';
  toggleReasonField();
  document.getElementById('day-modal').classList.add('open');
}
function closeModal(){ document.getElementById('day-modal').classList.remove('open'); modalDate = null; }
function toggleReasonField(){
  const status = document.getElementById('modal-status').value;
  document.getElementById('modal-reason-wrap').classList.toggle('hidden', status!=='fail');
}
document.getElementById('modal-status').addEventListener('change', toggleReasonField);
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.getElementById('modal-save-btn').addEventListener('click', ()=>{
  if(!modalDate) return;
  const status = document.getElementById('modal-status').value;
  const reason = status==='fail' ? document.getElementById('modal-reason').value : null;
  const note = document.getElementById('modal-note').value;
  const before = calcStreaks();
  DATA.entries[modalDate] = {status, reason, note};
  saveData();
  const after = calcStreaks();
  closeModal(); renderAll();
  checkMilestoneCelebration(before.max, after.max);
  showToast('এন্ট্রি সংরক্ষিত হয়েছে ✅');
});
document.getElementById('modal-delete-btn').addEventListener('click', ()=>{
  if(!modalDate) return;
  delete DATA.entries[modalDate];
  saveData(); closeModal(); renderAll();
  showToast('এন্ট্রি মুছে ফেলা হয়েছে');
});
document.getElementById('mark-today-btn').addEventListener('click', ()=> openModal(todayStr()));
document.getElementById('fill-missed-btn').addEventListener('click', ()=>{
  const missed = getAllDatesElapsed().filter(d=> !DATA.entries[d] || !DATA.entries[d].status);
  if(missed.length===0){ showToast('কোনো বাদ পড়া দিন নেই ✅'); return; }
  openModal(missed[0]);
});
document.getElementById('review-filter').addEventListener('change', renderReview);

function checkMilestoneCelebration(oldMax, newMax){
  const hit = DATA.milestones.find(m=> m>oldMax && m<=newMax);
  if(hit){ fireConfetti(); showToast(`🎉 অভিনন্দন! ${toBn(hit)} দিনের মাইলফলক অর্জন করেছেন!`); }
}
function fireConfetti(){
  const colors = ['#a3e635','#65a30d','#16a34a','#f59e0b','#6366f1'];
  for(let i=0;i<60;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random()*100+'vw';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (2+Math.random()*2)+'s';
    p.style.animationDelay = (Math.random()*0.5)+'s';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 4000);
  }
}
function showToast(msg){
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(()=> toast.classList.add('show'), 10);
  setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(), 300); }, 3000);
}

function initNav(){
  document.
