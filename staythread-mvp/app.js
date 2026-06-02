const dimensions = [
  "Goal clarity",
  "Startup ability",
  "Consistency",
  "Anti-distraction",
  "Recovery ability",
  "Foundational energy",
  "Planning ability"
];

const questions = [
  ["Goal clarity", "I can clearly state the one long-term goal I should focus on this week."],
  ["Goal clarity", "My current goal has a visible next milestone."],
  ["Goal clarity", "I know what success would look like in the next seven days."],
  ["Goal clarity", "I am not trying to pursue too many important goals at once."],
  ["Startup ability", "When I know what to do, I can begin within five minutes."],
  ["Startup ability", "I can start before I feel fully motivated."],
  ["Startup ability", "A tiny first action usually helps me enter the task."],
  ["Startup ability", "I rarely delay the first step after choosing a task."],
  ["Consistency", "I can keep a small daily action going for at least seven days."],
  ["Consistency", "Busy days do not usually make me abandon the plan."],
  ["Consistency", "I can repeat a useful action even when it feels ordinary."],
  ["Consistency", "I track progress without needing dramatic results every day."],
  ["Anti-distraction", "Short videos, feeds, games, or entertainment rarely pull me away from important work."],
  ["Anti-distraction", "I can notice when I am drifting into instant-reward loops."],
  ["Anti-distraction", "I can return to a meaningful task after a short distraction."],
  ["Anti-distraction", "Low-stimulation work such as reading or writing still feels tolerable."],
  ["Recovery ability", "If I miss one day, I can return the next day without restarting the entire plan."],
  ["Recovery ability", "I can choose a smaller task instead of dropping the goal."],
  ["Recovery ability", "A missed day does not usually become a missed week."],
  ["Recovery ability", "I can recover without blaming myself."],
  ["Foundational energy", "My current sleep, body, and energy support focused work or training."],
  ["Foundational energy", "My daily schedule has enough room for a small action."],
  ["Foundational energy", "My body feels ready for light movement or focused work most days."],
  ["Foundational energy", "I can lower intensity when energy is low."],
  ["Planning ability", "I can break a large goal into a realistic task for today."],
  ["Planning ability", "I know which process metrics matter for my current goal."],
  ["Planning ability", "I can tell the difference between planning and actually moving forward."],
  ["Planning ability", "I can choose the next action without redesigning the whole plan."],
  ["Consistency", "I can accept slow progress if the process is clearly accumulating."],
  ["Recovery ability", "A minimum action still feels like a valid way to keep the goal alive."]
];

const stateOptions = [
  { name: "Ready", detail: "standard tasks", mode: 0 },
  { name: "Busy", detail: "easy tasks", mode: 1 },
  { name: "Tired", detail: "minimum line", mode: 2 },
  { name: "Recovering", detail: "restart only", mode: 2 }
];

const taskData = [
  {
    title: "Reading base training",
    meta: "Low-stimulation focus",
    tiers: [
      "Read 30 minutes and capture 3 notes.",
      "Read 10 minutes and mark one useful passage.",
      "Open the book and read 2 pages."
    ]
  },
  {
    title: "SEO growth goal",
    meta: "Independent builder template",
    tiers: [
      "Cluster 20 keywords around one search intent.",
      "Review 5 keywords and mark difficulty.",
      "Write down one keyword opportunity."
    ]
  },
  {
    title: "Daily review",
    meta: "Recovery capacity",
    tiers: [
      "Write a 6-line review with blocker and next action.",
      "Answer the 3 review prompts.",
      "Mark state and choose tomorrow's minimum action."
    ]
  }
];

const goals = [
  {
    type: "SEO",
    title: "Grow an independent site",
    progress: 42,
    stage: "Week 2, intent clustering",
    metric: "12 / 40 keywords mapped",
    today: "Cluster 5 terms around focus recovery.",
    assets: "keywords, briefs, internal links"
  },
  {
    type: "Writing",
    title: "Publish a weekly essay",
    progress: 55,
    stage: "Draft loop",
    metric: "2 / 4 essays shipped",
    today: "Outline one section from yesterday's note.",
    assets: "drafts, outlines, shipped posts"
  },
  {
    type: "Movement",
    title: "Rebuild walking habit",
    progress: 70,
    stage: "Base capacity",
    metric: "6-day line intact",
    today: "Walk 15 minutes after dinner.",
    assets: "walks, minutes, comfort notes"
  }
];

const modules = [
  {
    name: "Reading",
    depth: "D1-D3",
    copy: "Rebuild tolerance for slow, low-stimulation attention.",
    standard: "Read 30 minutes with 3 notes.",
    easy: "Read 10 minutes.",
    minimum: "Read 2 pages."
  },
  {
    name: "Movement",
    depth: "D1-D3",
    copy: "Support energy without turning movement into punishment.",
    standard: "Walk or train 30 minutes at comfortable effort.",
    easy: "Walk 15 minutes.",
    minimum: "Stand up and walk 5 minutes."
  },
  {
    name: "Writing",
    depth: "D1-D4",
    copy: "Convert consumption and thinking into visible output.",
    standard: "Write 800 words or finish a section.",
    easy: "Write 200 words.",
    minimum: "Write 3 thoughts."
  },
  {
    name: "Daily review",
    depth: "D1-D4",
    copy: "Train recovery by closing the day with a tiny feedback loop.",
    standard: "Answer all prompts and plan tomorrow.",
    easy: "Answer the 3 prompts.",
    minimum: "Choose tomorrow's minimum action."
  }
];

const appState = {
  route: "landing",
  questionIndex: 0,
  answers: Array(questions.length).fill(3),
  taskMode: 1,
  activeGoal: 0,
  result: {
    stage: "L2 Starter",
    depth: "D1 Recovery",
    bottleneck: "Startup ability"
  },
  assets: {
    pages: 24,
    notes: 8,
    keywords: 12,
    reviews: 5
  }
};

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("active");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("active"), 2200);
}

function navigate(route) {
  appState.route = route;
  qsa(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${route}`));
  qsa("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  document.body.classList.toggle("public-mode", ["landing", "auth", "assessment"].includes(route));
  window.location.hash = route;
}

function renderStateGrid() {
  qs("#stateGrid").innerHTML = stateOptions.map((state) => `
    <button class="state-card ${state.mode === appState.taskMode ? "active" : ""}" data-state-mode="${state.mode}">
      <strong>${state.name}</strong>
      <span>${state.detail}</span>
    </button>
  `).join("");

  qsa("[data-state-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.taskMode = Number(button.dataset.stateMode);
      qs("#stateRecommendation").textContent = ["Standard recommended", "Easy recommended", "Minimum recommended"][appState.taskMode];
      renderStateGrid();
      renderTasks();
    });
  });
}

function renderTasks() {
  qs("#taskStack").innerHTML = taskData.map((task, taskIndex) => `
    <article class="task-card">
      <header>
        <div>
          <h3>${task.title}</h3>
          <p>${task.meta}</p>
        </div>
        <span class="badge ${taskIndex === 0 ? "badge-blue" : ""}">${taskIndex === 0 ? "Recommended" : "Open"}</span>
      </header>
      <div class="tiers">
        ${task.tiers.map((tier, tierIndex) => `
          <button class="tier ${tierIndex === appState.taskMode ? "active" : ""}" data-task="${taskIndex}" data-tier="${tierIndex}">
            <strong>${["Standard", "Easy", "Minimum"][tierIndex]}</strong>
            <span>${tier}</span>
          </button>
        `).join("")}
      </div>
    </article>
  `).join("");

  qsa("[data-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const tier = Number(button.dataset.tier);
      appState.taskMode = tier;
      appState.assets.reviews += tier === 2 ? 0 : 1;
      showToast(`${["Standard", "Easy", "Minimum"][tier]} task logged. The chain stays intact.`);
      renderStateGrid();
      renderTasks();
      renderAssets();
    });
  });
}

function renderWeekLine() {
  const days = [
    ["M", "done"],
    ["T", "done"],
    ["W", "done"],
    ["T", "easy"],
    ["F", "done"],
    ["S", "done"],
    ["S", "today"]
  ];
  qs("#weekLine").innerHTML = days.map(([label, state]) => `<span class="week-day ${state}">${label}</span>`).join("");
}

function renderAssets() {
  const rows = [
    [appState.assets.pages, "pages read"],
    [appState.assets.notes, "notes captured"],
    [appState.assets.keywords, "keywords mapped"],
    [appState.assets.reviews, "reviews closed"]
  ];
  qs("#assetGrid").innerHTML = rows.map(([value, label]) => `
    <div class="asset"><strong>${value}</strong><span>${label}</span></div>
  `).join("");
}

function dimensionScores() {
  const grouped = Object.fromEntries(dimensions.map((dimension) => [dimension, []]));
  questions.forEach(([dimension], index) => grouped[dimension].push(appState.answers[index]));
  return Object.fromEntries(Object.entries(grouped).map(([dimension, values]) => {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return [dimension, Math.round((average / 5) * 100)];
  }));
}

function calculateResult() {
  const scores = dimensionScores();
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const lowest = sorted[0];
  const overall = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / dimensions.length);
  let depth = "D4 Challenge";
  if (lowest[1] < 40) depth = "D1 Recovery";
  else if (lowest[1] < 60) depth = "D2 Stability";
  else if (lowest[1] < 80) depth = "D3 Growth";

  let stage = "L5 Compounder";
  if (overall < 45 || scores["Goal clarity"] < 45 || scores["Foundational energy"] < 45) stage = "L1 Overloaded";
  else if (overall < 60 || scores["Startup ability"] < 55) stage = "L2 Starter";
  else if (scores.Consistency < 70 || scores["Recovery ability"] < 70) stage = "L3 Chain Builder";
  else if (overall < 85) stage = "L4 Stable Builder";

  appState.result = {
    stage,
    depth,
    bottleneck: lowest[0],
    secondary: sorted[1][0],
    scores,
    overall
  };
  qs("#sidebarStage").textContent = stage;
  qs("#sidebarDepth").textContent = `${depth} depth`;
  return appState.result;
}

function renderAssessment() {
  const index = appState.questionIndex;
  const [dimension, text] = questions[index];
  qs("#questionCounter").textContent = `${index + 1} / ${questions.length}`;
  qs("#assessmentProgress").style.width = `${((index + 1) / questions.length) * 100}%`;
  qs("#assessmentCard").hidden = false;
  qs("#resultCard").hidden = true;
  qs("#assessmentCard").innerHTML = `
    <span class="badge badge-blue">${dimension}</span>
    <h2 class="question-title">${text}</h2>
    <p>1 means strongly disagree. 5 means strongly agree.</p>
    <div class="scale">
      ${[1, 2, 3, 4, 5].map((value) => `
        <button class="${appState.answers[index] === value ? "active" : ""}" data-score="${value}">${value}</button>
      `).join("")}
    </div>
    <div class="controls">
      <button class="btn btn-secondary" id="prevQuestion" ${index === 0 ? "disabled" : ""}>Back</button>
      <button class="btn btn-primary" id="nextQuestion">${index === questions.length - 1 ? "Show result" : "Next"}</button>
    </div>
  `;

  qsa("[data-score]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.answers[index] = Number(button.dataset.score);
      renderAssessment();
    });
  });
  qs("#prevQuestion").addEventListener("click", () => {
    if (appState.questionIndex > 0) {
      appState.questionIndex -= 1;
      renderAssessment();
    }
  });
  qs("#nextQuestion").addEventListener("click", () => {
    if (appState.questionIndex < questions.length - 1) {
      appState.questionIndex += 1;
      renderAssessment();
    } else {
      renderResult();
    }
  });
}

function renderResult() {
  const result = calculateResult();
  const scoreRows = Object.entries(result.scores).map(([dimension, score]) => `
    <div class="score-row">
      <strong>${dimension}</strong>
      <div class="progress"><span style="width:${score}%"></span></div>
      <span>${score}</span>
    </div>
  `).join("");

  qs("#assessmentCard").hidden = true;
  qs("#resultCard").hidden = false;
  qs("#resultCard").innerHTML = `
    <span class="label">Your result</span>
    <h2 class="question-title">${result.stage}</h2>
    <p>Your primary bottleneck is <strong>${result.bottleneck}</strong>. Recommended starting depth is <strong>${result.depth}</strong>.</p>
    <div class="score-grid" style="margin:24px 0">${scoreRows}</div>
    <div class="plan-grid">
      <article class="plan-card">
        <span class="badge badge-blue">Main focus</span>
        <h3>${result.bottleneck}</h3>
        <p>Protect the weakest dimension before increasing task volume.</p>
      </article>
      <article class="plan-card">
        <span class="badge badge-green">Support focus</span>
        <h3>${result.secondary}</h3>
        <p>Use this as the secondary lens for task sizing.</p>
      </article>
      <article class="plan-card">
        <span class="badge">7-day plan</span>
        <h3>No intensity jump</h3>
        <p>Complete one valid action each day and review after day seven.</p>
      </article>
    </div>
    <div class="controls">
      <button class="btn btn-primary" data-route="auth">Create account to save</button>
      <button class="btn btn-secondary" data-route="today">Preview Today page</button>
      <button class="btn btn-secondary" id="retakeAssessment">Retake</button>
    </div>
  `;
  qs("#retakeAssessment").addEventListener("click", () => {
    appState.questionIndex = 0;
    renderAssessment();
  });
  qsa("#resultCard [data-route]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.route)));
}

function renderGoals() {
  qs("#goalList").innerHTML = goals.map((goal, index) => `
    <button class="goal-item ${index === appState.activeGoal ? "active" : ""}" data-goal="${index}">
      <span class="badge">${goal.type}</span>
      <h3 style="margin:12px 0 8px">${goal.title}</h3>
      <p>${goal.stage}</p>
      <div class="progress" style="margin-top:14px"><span style="width:${goal.progress}%"></span></div>
    </button>
  `).join("");
  qsa("[data-goal]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.activeGoal = Number(button.dataset.goal);
      renderGoals();
    });
  });
  const goal = goals[appState.activeGoal];
  qs("#goalDetail").innerHTML = `
    <span class="badge badge-blue">${goal.type} template</span>
    <h2>${goal.title}</h2>
    <p>${goal.stage}. StayThread tracks ${goal.assets} as process assets.</p>
    <div class="score-grid" style="margin-top:18px">
      <div class="asset"><strong>${goal.progress}%</strong><span>stage progress</span></div>
      <div class="asset"><strong>${goal.metric.split(" ")[0]}</strong><span>${goal.metric}</span></div>
    </div>
    <div class="milestone-list">
      <div class="milestone"><span class="nav-dot"></span><strong>Today</strong><span>${goal.today}</span></div>
      <div class="milestone"><span class="nav-dot nav-dot-green"></span><strong>Easy tier</strong><span>Reduce volume, keep the same intent.</span></div>
      <div class="milestone"><span class="nav-dot nav-dot-warn"></span><strong>Minimum</strong><span>Record one process asset so the line remains intact.</span></div>
    </div>
  `;
}

function renderModules() {
  qs("#moduleGrid").innerHTML = modules.map((module) => `
    <article class="module-card">
      <span class="badge badge-blue">${module.depth}</span>
      <h2>${module.name}</h2>
      <p>${module.copy}</p>
      <div class="milestone-list">
        <div class="milestone"><strong>Standard</strong><span>${module.standard}</span></div>
        <div class="milestone"><strong>Easy</strong><span>${module.easy}</span></div>
        <div class="milestone"><strong>Minimum</strong><span>${module.minimum}</span></div>
      </div>
    </article>
  `).join("");
}

function bindReview() {
  qs("#reviewButton").addEventListener("click", () => {
    const moved = qs("#movedForward").value.trim();
    const interrupted = qs("#interruption").value.trim();
    const minimum = qs("#tomorrowMinimum").value.trim();
    qs("#reviewOutput").innerHTML = `
      <span class="label">Coach feedback</span>
      <h3 style="margin:12px 0">The thread stayed alive today.</h3>
      <p>${moved || "You moved one process asset forward."} ${interrupted ? "The interruption is useful data, not a failure." : ""} Tomorrow, start with: ${minimum || "one minimum action."}</p>
    `;
    showToast("Daily review generated.");
  });
}

function bindAuth() {
  qs("#authForm").addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Signed in for prototype preview.");
    navigate("today");
  });
}

function bindNavigation() {
  qsa("[data-route]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(item.dataset.route);
    });
  });
  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace("#", "") || "today";
    if (qs(`#view-${route}`)) navigate(route);
  });
}

function init() {
  bindNavigation();
  renderStateGrid();
  renderTasks();
  renderWeekLine();
  renderAssets();
  renderAssessment();
  renderGoals();
  renderModules();
  bindReview();
  bindAuth();
  qs("#createGoalButton").addEventListener("click", () => showToast("Goal creation opens the category template form in the production build."));
  const initialRoute = window.location.hash.replace("#", "") || "landing";
  navigate(qs(`#view-${initialRoute}`) ? initialRoute : "landing");
}

init();
