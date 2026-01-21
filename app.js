const tg = window.Telegram?.WebApp;
tg?.expand();

// helpers
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

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
    btn.onclick = ()=>openScreen(btn.dataset.screen);
});

// Hi-DPI canvas
function prepareCanvas(canvas){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return ctx;
}

function drawChart(monthly,target){
    const canvas = $("progressChart");
    const ctx = prepareCanvas(canvas);

    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    ctx.clearRect(0,0,w,h);

    const pad = 24;
    const months = Math.ceil(target/monthly);

    // axes
    ctx.strokeStyle="#333";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(pad,pad);
    ctx.lineTo(pad,h-pad);
    ctx.lineTo(w-pad,h-pad);
    ctx.stroke();

    // labels
    ctx.fillStyle="#888";
    ctx.font="14px system-ui";
    ctx.fillText("0%",4,h-pad);
    ctx.fillText("100%",4,pad+12);

    // line
    ctx.strokeStyle="#4f7cff";
    ctx.lineWidth=3;
    ctx.beginPath();

    let sum=0;
    for(let i=0;i<=months;i++){
        const x = pad + (i/months)*(w-pad*2);
        const y = h-pad - (sum/target)*(h-pad*2);
        if(i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
        sum+=monthly;
    }
    ctx.stroke();
}

// calc
$("calculate").onclick = ()=>{
    const income=parse($("income").value);
    const expenses=parse($("expenses").value);
    const target=parse($("targetAmount").value);
    if(!income||!expenses||!target||income<=expenses) return;

    const monthly=Math.round((income-expenses)*(+aggression.value/100));
    const months=Math.ceil(target/monthly);

    $("planResult").innerHTML =
        `Откладывать <b>${monthly}</b> ₽ / мес
Срок <b>${months} мес</b>`;

    drawChart(monthly,target);
    openScreen("progress");
};

openScreen("calc");
