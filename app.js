const tg = window.Telegram?.WebApp;
tg?.expand();
tg?.MainButton.hide();

// ===== HELPERS =====
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

// ===== ONBOARDING =====
const onboarding = $("onboarding");
const track = document.querySelector(".story-track");
const dots = document.querySelectorAll(".dot");
let storyIndex = 0;
let startX = 0;

if (localStorage.getItem("onboarding_done")) {
    onboarding.style.display = "none";
}

function updateStory() {
    track.style.transform = `translateX(-${storyIndex * window.innerWidth}px)`;
    dots.forEach((d,i)=>d.classList.toggle("active",i===storyIndex));
}

track.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
});
track.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -50 && storyIndex < 2) storyIndex++;
    if (dx > 50 && storyIndex > 0) storyIndex--;
    updateStory();
});

$("startApp").onclick = () => {
    localStorage.setItem("onboarding_done","true");
    onboarding.style.display = "none";
};

// ===== INPUTS =====
["income","expenses","targetAmount"].forEach(id => {
    $(id).oninput = e => e.target.value = format(e.target.value);
});

// ===== SLIDER =====
const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");
const aggrPercent = $("aggressionPercent");

function updateAgg() {
    const v = +aggression.value;
    aggrPercent.textContent = v + "%";
    aggrLabel.textContent =
        v <= 40 ? "Комфортно" :
        v <= 60 ? "Умеренно" :
        "Агрессивно";
}
aggression.oninput = updateAgg;
updateAgg();

// ===== TABS =====
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name) {
    screens.forEach(s =>
        s.classList.toggle("active", s.id === "screen-" + name)
    );
    tabs.forEach(b =>
        b.classList.toggle("active", b.dataset.screen === name)
    );
}
tabs.forEach(btn => {
    btn.addEventListener("touchstart", e => {
        e.preventDefault();
        openScreen(btn.dataset.screen);
    }, { passive:false });
});

// ===== GRAPH =====
function drawChart(monthly, target) {
    const canvas = $("progressChart");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const months = Math.ceil(target / monthly);
    const max = target;
    const stepX = canvas.width / months;

    ctx.strokeStyle = "#4f7cff";
    ctx.lineWidth = 3;
    ctx.beginPath();

    let sum = 0;
    for (let i=0;i<=months;i++) {
        const x = i * stepX;
        const y = canvas.height - (sum / max) * canvas.height;
        if (i === 0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
        sum += monthly;
    }
    ctx.stroke();
}

// ===== CALC =====
$("calculate").onclick = () => {
    const income = parse($("income").value);
    const expenses = parse($("expenses").value);
    const target = parse($("targetAmount").value);
    if (!income || !expenses || !target || income <= expenses) return;

    const monthly = Math.round((income - expenses) * (+aggression.value / 100));
    const months = Math.ceil(target / monthly);

    $("planResult").innerHTML =
        `Откладывать <b>${monthly}</b> ₽ / мес
Срок <b>${months} мес</b>`;

    drawChart(monthly, target);
    openScreen("plan");
};

// DEFAULT
openScreen("calc");
updateStory();
