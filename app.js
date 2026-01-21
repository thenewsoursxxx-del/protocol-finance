(){
  if($("contributionInput")) return;
  const box=document.createElement("div");
  box.innerHTML=`
    <label>Внёс</label>
    <input id="contributionInput" placeholder="20.000">
    <button id="addContribution">Применить</button>
  `;
  $("screen-progress").prepend(box);
  $("contributionInput").oninput=e=>e.target.value=format(e.target.value);

  $("addContribution").onclick=()=>{
    let amount=parse($("contributionInput").value);
    if(!amount) return;

    const p = modeParams(autoMode);
    const toGoal=Math.round(amount*p.goal);
    const toBuffer=amount-toGoal;

    bufferBalance+=toBuffer;
    goals[0].balance+=toGoal;
    contributions.push({amount:toGoal,date:Date.now()});

    $("contributionInput").value="";
    saveState();
    drawChart();
  };
}

/* ================= CALC ================= */
$("calculate").onclick=()=>{
  const income=parse($("income").value);
  const expenses=parse($("expenses").value);
  if(!income||!expenses||income<=expenses) return;

  monthly=Math.round((income-expenses)*0.5);
  autoMode = decideAutoMode(income, expenses);
  saveState();

  openScreen("progress");
  requestAnimationFrame(()=>{
    injectContributionUI();
    drawChart();
  });
};

/* ================= INIT ================= */
openScreen("calc");
drawChart(); injectContributionUI
