const tg = window.Telegram?.WebApp;
tg?.expand();

const haptic = () => {
  try { tg.HapticFeedback.impactOccurred("light"); } catch {}
};

const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-btn");
const indicator = document.querySelector(".nav-indicator");

function openScreen(name, btn) {
  screens.forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");

  buttons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const rect = btn.getBoundingClientRect();
  const parent = btn.parentElement.getBoundingClientRect();

  indicator.style.transform =
    `translateX(${rect.left - parent.left}px)`;

  haptic();
}

buttons.forEach(btn => {
  btn.onclick = () => openScreen(btn.dataset.screen, btn);
});

/* onboarding */
const seen = localStorage.getItem("onboarding_seen");
if (!seen) {
  onboarding.classList.remove("hidden");
  let i = 0;
  const stories = document.querySelectorAll(".story");
  onboarding.onclick = () => {
    if (i < stories.length - 1) {
      stories[i].classList.remove("active");
      stories[++i].classList.add("active");
    }
  };
  startApp.onclick = e => {
    e.stopPropagation();
    localStorage.setItem("onboarding_seen","1");
    onboarding.classList.add("hidden");
    app.classList.remove("hidden");
  };
} else {
  app.classList.remove("hidden");
}