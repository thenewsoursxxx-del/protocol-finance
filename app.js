const $ = id => document.getElementById(id);
const parse = v => Number(v.replace(/\./g,""));
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");

let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");
let goals = state.goals || [{id:1,name:"Главная цель",target:300000,balance:0,priority:1,active:true}];
let buffer = state.buffer || 0;
let monthly = state.monthly || 0;

function save() {
  localStorage.setItem("protocol_state", JSON.stringify({goals,buffer,monthly}));
}

/* NAV */
document.querySelectorAll(".bottom-nav button").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));
    $("screen-"+b.dataset.screen).classList.add("active");
    b.classList.add("active");
  }
});

/* INPUT FORMAT */
["income","expenses","newGoalTarget"].forEach(id=>{
  const el=$(id); if(el) el.oninput=e=>e.target.value=format(e.target.value);
});

/* CALC */
$("calculate").onclick=()=>{
  const income=parse($("income").value);
  const expenses=parse($("expenses").value);
  if(income<=expenses) return;
  monthly=Math.round((income-expenses)*0.5);
  $("planResult").innerText=`Откладывать ${monthly} ₽ / мес`;
  save();
};

/* ACCOUNTS */
function renderAccounts(){
  $("accounts").innerHTML=`
    <div class="card">🎯 Цель: ${goals[0].balance} / ${goals[0].target}</div>
    <div class="card">🛡 Подушка: ${buffer}</div>
  `;
}

/* GOALS */
function renderGoals(){
  $("goals").innerHTML=goals.map((g,i)=>`
    <div class="card">
      <b>${g.name}</b>
${g.balance} / ${g.target}
    </div>
  `).join("");
}

$("addGoal").onclick=()=>{
  const name=$("newGoalName").value;
  const target=parse($("newGoalTarget").value);
  if(!name||!target) return;
  goals.push({id:Date.now(),name,target,balance:0,priority:goals.length+1,active:true});
  save(); renderGoals();
};

/* INIT */
renderAccounts();
renderGoals();