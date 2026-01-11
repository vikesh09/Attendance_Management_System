const APP_PASSWORD = "vikesh123"; 

function login() {
  const input = prompt("Enter password:");
  if (input === APP_PASSWORD) {
      localStorage.setItem("loggedIn", "true");
      alert("Login successful");
      loadTodayClasses();
      loadSummary();
      loadMonthlyAnalysis();
  } else {
      alert("Wrong password");
      window.location.reload();
  }
}




const API_URL = "https://script.google.com/macros/s/AKfycbxDszE5hdj4kEmOKxk9_cjFftHXgOLjLTJgDBPsN0_tSaegoqL2bF0fEo0T34jubfQY6Q/exec";

// SUBJECT LIST
const subjectsMap = {
  "Maths": "Mathematics-II",
  "Physics": "Physics",
  "Discrete Maths": "Discrete Structures",
  "Data Structure": "Data Structures",
  "Basic ML": "Machine Learning (SEC-I)",
  "Logical Reasoning": "AEC/VAC",
  "Data Lab": "Data(lab)",
  "Basic ML Lab": "Basic ML(Lab)",
  "Physics Lab": "Physics(Lab)"
};

// TIMETABLE
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

// TODAY INFO
const today = new Date();
document.getElementById("date").innerText = today.toDateString();

const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayName = weekdays[today.getDay()];
document.getElementById("day").innerText = "Today is: " + todayName;

// LOAD / SAVE ATTENDANCE
let attendance = JSON.parse(localStorage.getItem("attendance")) || {};

function save(){
  localStorage.setItem("attendance", JSON.stringify(attendance));
}

// GOOGLE SHEET SYNC
async function syncWithGoogleSheet(date, subjectKey, status){
  if(!status) return;

  const subject = subjectsMap[subjectKey] || subjectKey;

  try{
    await fetch(API_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({date, subject, status})
    });
  }catch(e){
    console.log("Sheet sync fail");
  }
}

// RENDER TODAY CLASSES
function loadTodayClasses(){
  const container = document.getElementById("todayClasses");
  container.innerHTML = "";

  if(!timetable[todayName]){
    container.innerHTML = "<p>No classes today 😊</p>";
    return;
  }

  timetable[todayName].forEach(cls=>{
    const dateStr = today.toDateString();
    const id = dateStr + "_" + cls.subject + "_" + cls.time;

    if(!attendance[id]) attendance[id] = {status:null};

    const status = attendance[id].status || "Not marked";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${cls.subject} (${cls.type})</h3>
      <p><b>Time:</b> ${cls.time}</p>
      <p><b>Status:</b> <span>${status}</span></p>

      <div class="button-group">
        <button class="present" ${status==="present"?"disabled":""}
          onclick="mark('${id}','present','${cls.subject}')">Present</button>

        <button class="absent" ${status==="absent"?"disabled":""}
          onclick="mark('${id}','absent','${cls.subject}')">Absent</button>

        <button class="undo"
          onclick="mark('${id}',null,'${cls.subject}')">Undo</button>
      </div>
    `;

    container.appendChild(card);
  });
}

// MARK ATTENDANCE
function mark(id,val,subject){
  attendance[id].status = val;
  save();

  loadTodayClasses();
  loadSummary();
  loadMonthSummary();

  if(val!==null){
    const datePart = id.split("_")[0];
    syncWithGoogleSheet(datePart, subject, val);
  }
}

// SUBJECT-WISE SUMMARY
function loadSummary(){
  const container = document.getElementById("subjectSummary");
  container.innerHTML = "";

  const summary = {};

  Object.keys(attendance).forEach(id=>{
    const subject = id.split("_")[1];

    if(!summary[subject]) summary[subject] = {p:0,a:0};

    if(attendance[id].status==="present") summary[subject].p++;
    if(attendance[id].status==="absent") summary[subject].a++;
  });

  Object.keys(subjectsMap).forEach(sub=>{
    const rec = summary[sub] || {p:0,a:0};

    const total = rec.p + rec.a;
    const percent = total===0 ? 0 : Math.round((rec.p/total)*100);

    const warn = percent < 75 ? `<p class="warning">⚠ Below 75%</p>` : ``;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${subjectsMap[sub]}</h3>
      <p>Present: ${rec.p} | Absent: ${rec.a}</p>
      <p><b>Attendance: ${percent}%</b></p>
      ${warn}
    `;

    container.appendChild(card);
  });
}

// MONTH SUMMARY
function loadMonthSummary(){
  const container = document.getElementById("monthlyAnalysis");

  let p=0,a=0;

  Object.keys(attendance).forEach(id=>{
    const d = new Date(id.split("_")[0]);

    if(d.getMonth()===today.getMonth() && d.getFullYear()===today.getFullYear()){
      if(attendance[id].status==="present") p++;
      if(attendance[id].status==="absent") a++;
    }
  });

  const total = p + a;
  const monthPercent = total===0 ? 0 : Math.round((p/total)*100);

  container.innerHTML = `
    <div class="card">
      <h3>Monthly Summary</h3>
      <p>Total Classes: ${total}</p>
      <p>Present: ${p}</p>
      <p>Absent: ${a}</p>
      <p><b>${monthPercent}% Attendance</b></p>
    </div>
  `;
}

// RUN
loadTodayClasses();
loadSummary();
loadMonthSummary();
