const $=id=>document.getElementById(id);

/* ===== STORIES ===== */
let storyIndex=0;
const stories=$("stories");
const track=$("storyTrack");

function showStories(){
  if(!localStorage.getItem("protocol_stories_done")){
    stories.style.display="block";
  }
}
function closeStories(){
  localStorage.setItem("protocol_stories_done","1");
  stories.style.display="none";
}
stories.addEventListener("touchstart",e=>{
  startX=e.touches[0].clientX;
});
stories.addEventListener("touchend",e=>{
  let dx=e.changedTouches[0].clientX-startX;
  if(dx<-40 && storyIndex<2){storyIndex++}
  if(dx>40 && storyIndex>0){storyIndex--}
  track.style.transform=`translateX(-${storyIndex*100}%)`;
});

/* ===== STATE ===== */
let state=JSON.parse(localStorage.getItem("protocol_state")||"{}");
let monthly=state.monthly||0;
let contributions=state.contributions||[];

function save(){
  localStorage.setItem("protocol_state",JSON.stringify({monthly,contributions}));
}

/* ===== TABS ===== */
const screens=document.querySelectorAll(".screen");
document.querySelectorAll(".tabs button").forEach(b=>{
  b.onclick=()=>{
    screens.forEach(s=>s.classList.remove("active"));
    document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
    $("screen-"+b.dataset.screen).classList.add("active");
    b.classList.add("active");
    draw();
  };
});

/* ===== INPUT FORMAT ===== */
["income","expenses"].forEach(id=>{
  $(id).oninput=e=>{
    e.target.value=e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  };
});
const parse=v=>Number(v.replace(/\./g,""));

/* ===== CALC ===== */
$("calculate").onclick=()=>{
  const income=parse($("income").value);
  const expenses=parse($("expenses").value);
  if(!income||income<=expenses)return;
  monthly=Math.round((income-expenses)*0.5);
  save();
  document.querySelector('[data-screen="progress"]').click();
};

/* ===== GRAPH ===== */
function draw(){
  const c=$("chart");
  if(!c||!monthly)return;
  const ctx=c.getContext("2d");
  const w=c.width=c.offsetWidth;
  const h=c.height=c.offsetHeight;
  ctx.clearRect(0,0,w,h);

  const pad=24;
  const max=monthly*6;

  // plan
  ctx.strokeStyle="#4f7cff";
  ctx.lineWidth=3;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const x=pad+(i/5)*(w-pad*2);
    const y=h-pad-(monthly*i/max)*(h-pad*2);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();

  // fact
  if(contributions.length){
    ctx.strokeStyle="#fff";
    ctx.lineWidth=2;
    ctx.beginPath();
    let sum=0;
    contributions.forEach((v,i)=>{
      sum+=v;
      const x=pad+(i/5)*(w-pad*2);
      const y=h-pad-(sum/max)*(h-pad*2);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      ctx.beginPath();
      ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle="#fff";
      ctx.fill();
    });
    ctx.stroke();
  }
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded",()=>{
  showStories();
  draw();
});
