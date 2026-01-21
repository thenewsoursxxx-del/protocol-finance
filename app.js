const tg = window.Telegram?.WebApp;
tg?.expand();

const $ = id => document.getElementById(id);

let planChosen = false;
let planName = "";

$("pace").oninput = () => $("percentLabel").innerText = $("pace").value + "%";

$("calculate").onclick = () => {
  if (planChosen) return;
  $("sheet").style.bottom = "0";
  $("sheetOverlay").style.display = "block";
};

function startProtocol(name){
  planChosen = true;
  planName = name;

  $("sheet").style.bottom = "-100%";
  $("sheetOverlay").style.display = "none";

  $("lockText").innerText = `У вас уже выбран план: ${name}`;
  $("calcLock").style.display = "block";

  $("loader").classList.remove("hidden");
  $("adviceCard").innerText = "Выбран режим " + name + ".";

  openScreen("advice");

  setTimeout(()=>$("adviceCard").innerText="Часть средств будет направляться в резерв для устойчивости плана.",2000);
  setTimeout(()=>$("adviceCard").innerText="Готово.",4000);
  setTimeout(()=>{
    $("loader").classList.add("hidden");
    $("adviceCard").innerText="Protocol завершил расчёт.";
  },6000);
}

$("noBuffer").onclick = ()=>startProtocol("без подушки");
$("withBuffer").onclick = ()=>startProtocol("с подушкой");

$("resetPlan").onclick = ()=>$("confirmReset").style.display="block";
$("confirmNo").onclick = ()=>$("confirmReset").style.display="none";
$("confirmYes").onclick = ()=>location.reload();

/* NAV */
document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.onclick=()=>openScreen(btn.dataset.screen,btn)
});
function openScreen(name,btn){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $("screen-"+name).classList.add("active");
}