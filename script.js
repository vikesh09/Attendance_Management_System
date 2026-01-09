const API_URL = "https://script.google.com/macros/s/AKfycbxDszE5hdj4kEmOKxk9_cjFftHXgOLjLTJgDBPsN0_tSaegoqL2bF0fEo0T34jubfQY6Q/exec";

// 1. SUBJECT LIST
const subjectsMap = {
  "Maths": "Mathematics-II",
  "Physics": "Physics",
  "Discrete Maths": "Discrete Structures",
  "Data Structure": "Data Structures",
  "Basic ML": "Machine Learning (SEC-I)",
  "Logical Reasoning": "AEC/VAC",
  "Data Lab": "Data(lab)",
  "Basic ML Lab": "Basic Ml(Lab)",
  "Physics Lab": "Physics(Lab)"
};

// 2. TIMETABLE
const timetable = {
  "Monday": [
    {time:"8–10", subject:"Discrete Maths", type:"Lecture"},
    {time:"12–2", subject:"Data Lab", type:"LAB"},
    {time:"2–4", subject:"Physics", type:"Lecture"}
  ],
  "Tuesday": [
    {time:"8–10", subject:"Logical Reasoning", type:"AEC"},
    {time:"10–11", subject:"Discrete Maths", type:"Lecture"},
    {time:"12–2", subject:"Physics Lab", type:"LAB"},
    {time:"2–3", subject:"Maths", type:"Tutorial"}
  ],
  "Wednesday": [
    {time:"10–11", subject:"Maths", type:"Lecture"},
    {time:"12–1", subject:"Physics", type:"Lecture"},
    {time:"1–3", subject:"Data Structure", type:"Lecture"}
  ],
  "Thursday": [
    {time:"10–11", subject:"Data Structure", type:"Lecture"},
    {time:"1–3", subject:"Maths", type:"Lecture"}
  ],
  "Friday": [
    {time:"10–11", subject:"Discrete Maths", type:"Lecture"},
    {time:"12–1", subject:"Basic ML", type:"Lecture"},
    {time:"2–4", subject:"Basic ML Lab", type:"LAB"}
  ]
};

// --- DISPLAY LOGIC ---
const today = new Date();
document.getElementById("date").innerText = today.toDateString();
const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayName = weekdays[today.getDay()];
const dayDisplay = document.getElementById("day");
if(dayDisplay) dayDisplay.innerText = "Today is: " + todayName;

let attendance = JSON.parse(localStorage.getItem("attendance")) || {};

function save() {
  localStorage.setItem("attendance", JSON.stringify(attendance));
}

// --- SYNC TO GOOGLE SHEET ---
async function syncWithGoogleSheet(date, subjectKey, status) {
    if (!status) return;
    const sheetHeaderName = subjectsMap[subjectKey] || subjectKey;
    const data = {
        date: date,
        subject: sheetHeaderName,
        status: status
    };
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log("Synced: " + sheetHeaderName);
    } catch (error) {
        console.error("Sync Error:", error);
    }
}

// --- RENDER CLASSES ---
function loadTodayClasses(){
  const container = document.getElementById("todayClasses");
  if (!container) return;
  container.innerHTML = "";
  if(!timetable[todayName]){
    container.innerHTML = "<p>No classes today (Enjoy!)</p>";
    return;
  }
  timetable[todayName].forEach(cls=>{
    const dateStr = today.toDateString();
    const id = dateStr + "_" + cls.subject + "_" + cls.time;
    if(!attendance[id]){ attendance[id] = {status:null}; }
    const card = document.createElement("div");
    card.className = "card";
    const currentStatus = attendance[id].status || "Not marked";
    card.innerHTML = `
      <h3>${cls.subject} (${cls.type})</h3>
      <p><b>Time:</b> ${cls.time}</p>
      <p><b>Status:</b> <span class="status-label">${currentStatus}</span></p>
      <div class="button-group">
        <button class="present" ${attendance[id].status === 'present' ? 'disabled' : ''} onclick="mark('${id}','present','${cls.subject}')">Present</button>
        <button class="absent" ${attendance[id].status === 'absent' ? 'disabled' : ''} onclick="mark('${id}','absent','${cls.subject}')">Absent</button>
        <button class="undo" onclick="mark('${id}',null,'${cls.subject}')">Undo</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- MARK ATTENDANCE ---
function mark(id, val, subjectKey) {
  if (attendance[id].status === val) return;
  attendance[id].status = val;
  save();
  loadTodayClasses();
  loadSummary();
  loadMonthlyAnalysis(); // Refresh analysis on mark
  if (val !== null) {
      const datePart = id.split("_")[0];
      syncWithGoogleSheet(datePart, subjectKey, val);
  }
}

// --- SUBJECT-WISE SUMMARY ---
function loadSummary(){
  const summary = {};
  Object.keys(attendance).forEach(id=>{
    const parts = id.split("_");
    const subject = parts[1];
    if(!summary[subject]) summary[subject]={p:0,a:0};
    if(attendance[id].status==="present") summary[subject].p++;
    if(attendance[id].status==="absent") summary[subject].a++;
  });
  const container = document.getElementById("subjectSummary");
  if (!container) return;
  container.innerHTML = "";
  Object.keys(subjectsMap).forEach(subKey=>{
    const s = summary[subKey] || {p:0,a:0};
    const total = s.p+s.a;
    const percent = total===0?0:Math.round((s.p/total)*100);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${subjectsMap[subKey]}</h3>
      <p>Present: ${s.p} | Absent: ${s.a}</p>
      <p><b>Percentage: ${percent}%</b></p>
    `;
    container.appendChild(card);
  });
}

// --- MONTHLY ANALYSIS (REPLACED CALENDAR) ---
function loadMonthlyAnalysis() {
  const container = document.getElementById("calendar"); 
  if (!container) return;
  
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthName = today.toLocaleString('default', { month: 'long' });

  let presentCount = 0;
  let absentCount = 0;

  Object.keys(attendance).forEach(id => {
    const parts = id.split("_");
    const entryDate = new Date(parts[0]);
    if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
      if (attendance[id].status === "present") presentCount++;
      if (attendance[id].status === "absent") absentCount++;
    }
  });

  const totalClasses = presentCount + absentCount;
  const monthlyPercent = totalClasses === 0 ? 0 : Math.round((presentCount / totalClasses) * 100);

  container.innerHTML = `
    <div class="card" style="border-top: 4px solid #007bff; margin-top: 20px;">
      <h2 style="text-align:center;">📊 ${monthName} Stats</h2>
      <div style="display: flex; justify-content: space-around; text-align: center; margin: 15px 0;">
        <div><p>Total</p><h3>${totalClasses}</h3></div>
        <div><p style="color:green;">Present</p><h3>${presentCount}</h3></div>
        <div><p style="color:red;">Absent</p><h3>${absentCount}</h3></div>
      </div>
      <div style="text-align:center;">
        <p><b>Monthly Attendance: ${monthlyPercent}%</b></p>
        <div style="background:#eee; height:12px; border-radius:10px; overflow:hidden; margin:10px 0;">
          <div style="background:${monthlyPercent >= 75 ? '#28a745' : '#dc3545'}; width:${monthlyPercent}%; height:100%;"></div>
        </div>
      </div>
    </div>
  `;
}

// Run
loadTodayClasses();
loadSummary();
loadMonthlyAnalysis();