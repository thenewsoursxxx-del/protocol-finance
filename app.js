const tg=window.Telegram?.WebApp; tg?.expand();

const $=id=>document.getElementById(id);
const state={plan:null};

["income","expenses","goal"].forEach(id=>{
  $(id).oninput=e=>{
    e.target.value=e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".")
  }
});

$("pace").oninput=()=>$("percentLabel").innerText=$("pace").value+"%";

$("calculate").onclick=()=>{
  if(state.plan){ showLock(); return; }
  openSheet();
};

function openSheet(){
  $("sheetOverlay").style.display="block";
  $("sheet").style.bottom="0";
}
function closeSheet(){
  $("sheetOverlay").style.display="none";
  $("sheet").style.bottom="-100%";
}

$("noBuffer").onclick=()=>startProtocol("Без подушки");
$("withBuffer").onclick=()=>startProtocol("С подушкой");

function startProtocol(type){
  closeSheet();
  state.plan=type;
  openScreen("advice");
  runStages(type);
}

function runStages(type){
  $("loader").style.display="block";
  stage("Выбран режим "+type+".",0);
  stage("Часть средств будет направляться в резерв для устойчивости плана.",2000);
  stage("Готово.",4000);
  setTimeout(()=>{
    $("loader").style.display="none";
    $("adviceCard").innerText="План готов. Перейдите в «Прогресс».";
  },6000);
}

function stage(text,delay){
  setTimeout(()=>{$("adviceCard").innerText=text},delay);
}

function showLock(){
  $("lockText").innerText="У вас уже выбран план: "+state.plan;
  $("lockOverlay").style.display="block";
}

$("resetBtn").onclick=()=>{$("confirmOverlay").style.display="block"};
$("cancelReset").onclick=()=>{$("confirmOverlay").style.display="none"};
$("confirmReset").onclick=()=>{
  state.plan=null;
  $("lockOverlay").style.display="none";
  $("confirmOverlay").style.display="none";
};

function openScreen(name){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $("screen-"+name).classList.add("active");
}