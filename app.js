const tg = window.Telegram?.WebApp;
tg?.expand();

// helpers
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

// onboarding
const onboarding = $("onboarding");
if (localStorage.getItem("onboarding_done")) onboarding.style.display = "none";
$("startApp").onclick = () => {
    localStorage.setItem("onboarding_done","true");
    onboarding.style.display = "none";
};

// inputs
["income","expenses","targetAmount"].forEach(id=>{
    $(id).oninput = e => e.target.value = format(e.target.value);
});

// slider
const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");
const aggrPercent = $("aggressionPercent");

function updateAgg(){
    const v = +aggression.value;
    aggrPercent.textContent = v + "%";
    aggrLabel.textContent =
        v<=40?"Комфортно":v<=60?"Умеренно":"Агрессивно";
}
aggression.oninput = updateAgg;
updateAgg();

// tabs
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name){
    screens.forEach(s=>s.classList.toggle("active",s.id==="screen-"+name));
    tabs.forEach(b=>b.classList.toggle("active",b.dataset.screen===name));
}
tabs.forEach(btn=>{
    btn.addEventListener("touchstart",e=>{
        e.preventDefault();
        openScreen(btn.dataset.screen);
    },{passive:false});
});

// graph
function drawChart(monthly,target){
    const c = $("progressChart");
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);

    const months = Math.ceil(target/monthly);
    const padding = 30;
    const w = c.width - padding*2;
    const h = c.height - padding*2;

    // axes
    ctx.strokeStyle="#333";
    ctx.beginPath();
    ctx.moveTo(padding,padding);
    ctx.lineTo(padding,padding+h);
    ctx.lineTo(padding+w,padding+h);
    ctx.stroke();

    // labels
    ctx.fillStyle="#777";
    ctx.fillText("0%",5,padding+h);
    ctx.fillText("100%",5,padding+10);

    // line
    ctx.strokeStyle="#4f7cff";
    ctx.lineWidth=3;
    ctx.beginPath();

    let sum=0;
    for(let i=0;i<=months;i++){
        const x = padding + (i/months)*w;
        const y = padding + h - (sum/target)*h;
        if(i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
        sum += monthly;
    }
    ctx.stroke();

    // current point
    const currentMonth = 1;
    const curSum = monthly;
    const cx = padding + (currentMonth/months)*w;
    const cy = padding + h - (curSum/target)*h;

    ctx.fillStyle="#fff";
    ctx.beginPath();
    ctx.arc(cx,cy,4,0,Math.PI*2);
    ctx.fill();

    $("progressInfo").innerHTML =
        `Через ${months} мес цель будет достигнута

         Текущий прогресс: ${(curSum/target*100).toFixed(1)}%`;
}

// calc
$("calculate").onclick = ()=>{
    const income=parse($("income").value);
    const expenses=parse($("expenses").value);
    const target=parse($("targetAmount").value);
    if(!income||!expenses||!target||income<=expenses) return;

    const monthly=Math.round((income-expenses)*(+aggression.value/100));
    const months=Math.ceil(target/monthly);

    $("planResult").innerHTML=
        `Откладывать <b>${monthly}</b> ₽ / мес
Срок <b>${months} мес</b>`;

    drawChart(monthly,target);
    openScreen("progress");
};

openScreen("calc");
