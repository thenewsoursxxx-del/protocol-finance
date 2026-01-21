const tg = window.Telegram?.WebApp;
tg?.expand();
tg?.MainButton.hide();

// ===== STORY ONBOARDING =====
const onboarding = document.getElementById("onboarding");
const track = document.querySelector(".story-track");
const dots = document.querySelectorAll(".dot");
let index = 0;
let startX = 0;

if (localStorage.getItem("onboarding_done")) {
    onboarding.style.display = "none";
}

function updateStory() {
    track.style.transform = `translateX(-${index * window.innerWidth}px)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
}

track.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
});

track.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -50 && index < 2) index++;
    if (dx > 50 && index > 0) index--;
    updateStory();
});

document.getElementById("startApp").onclick = () => {
    localStorage.setItem("onboarding_done", "true");
    onboarding.style.display = "none";
};

// ===== APP =====
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

["income","expenses","targetAmount"].forEach(id => {
    $(id).oninput = e => e.target.value = format(e.target.value);
});

const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");
aggression.oninput = () => {
    const v = +aggression.value;
    aggrLabel.textContent =
        v <= 40 ? "Комфортно" :
        v <= 60 ? "Умеренно" :
        "Агрессивно";
};
aggression.oninput();

// tabs
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
    }, { passive: false });
});

$("calculate").onclick = () => {
    const income = parse($("income").value);
    const expenses = parse($("expenses").value);
    const target = parse($("targetAmount").value);
    if (!income || !expenses || !target || income <= expenses) return;

    const monthly = Math.round((income - expenses) * (+aggression.value / 100));
    const months = Math.ceil(target / monthly);

    openScreen("plan");
    $("planResult").innerHTML =
        `Откладывать <b>${monthly}</b> ₽ / мес
Срок <b>${months} мес</b>`;
};

openScreen("calc");
updateStory();
