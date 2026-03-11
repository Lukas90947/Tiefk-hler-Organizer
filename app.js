const STORAGE_KEY = "smart-freezer-v3";

const defaultData = {
  currentHousehold: "Zuhause",
  selectedFreezer: "",
  households: {
    Zuhause: {
      freezers: ["Keller"],
      inventory: [],
      shopping: []
    }
  }
};

let state = loadState();

const householdSelect = document.getElementById("householdSelect");
const itemForm = document.getElementById("itemForm");
const shoppingForm = document.getElementById("shoppingForm");
const householdForm = document.getElementById("householdForm");
const freezerForm = document.getElementById("freezerForm");
const qrForm = document.getElementById("qrForm");
const searchInput = document.getElementById("searchInput");
const inventoryFreezerFilter = document.getElementById("inventoryFreezerFilter");
const resetFreezerFilterBtn = document.getElementById("resetFreezerFilterBtn");

const inventoryList = document.getElementById("inventoryList");
const shoppingList = document.getElementById("shoppingList");
const smartList = document.getElementById("smartList");
const smartSummary = document.getElementById("smartSummary");
const recipeList = document.getElementById("recipeList");
const mealPlan = document.getElementById("mealPlan");
const statsList = document.getElementById("statsList");
const qrOutput = document.getElementById("qrOutput");
const dashboardCards = document.getElementById("dashboardCards");
const freezerCards = document.getElementById("freezerCards");
const sectionOverview = document.getElementById("sectionOverview");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    const parsed = JSON.parse(raw);
    if (!parsed.households || !parsed.currentHousehold) return structuredClone(defaultData);
    if (typeof parsed.selectedFreezer !== "string") parsed.selectedFreezer = "";
    return parsed;
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentData() {
  return state.households[state.currentHousehold];
}

function daysOld(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyScore(item) {
  const age = daysOld(item.date);
  let score = 0;
  if (age >= 120) score += 5;
  else if (age >= 90) score += 3;
  else if (age >= 60) score += 1;
  if (item.amount >= 3) score += 1;
  return score;
}

function getItemStatusClass(item) {
  const age = daysOld(item.date);
  if (age >= 120) return "old";
  if (age >= 90) return "warning";
  return "good";
}

function formatMeta(item) {
  const age = daysOld(item.date);
  return `${item.freezer} • ${item.section} • Menge: ${item.amount} • Eingefroren: ${item.date} • ${age} Tage alt`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqueSectionsForSelectedFreezer() {
  const items = currentData().inventory.filter((item) => {
    if (!state.selectedFreezer) return true;
    return item.freezer === state.selectedFreezer;
  });

  const map = {};
  items.forEach((item) => {
    if (!map[item.section]) {
      map[item.section] = { count: 0, amount: 0 };
    }
    map[item.section].count += 1;
    map[item.section].amount += Number(item.amount || 0);
  });
  return map;
}

function renderHouseholds() {
  householdSelect.innerHTML = "";
  Object.keys(state.households).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === state.currentHousehold) option.selected = true;
    householdSelect.appendChild(option);
  });
}

function renderInventoryFreezerFilter() {
  const data = currentData();
  inventoryFreezerFilter.innerHTML = '<option value="">Alle Gefrierschränke</option>';

  data.freezers.forEach((freezer) => {
    const option = document.createElement("option");
    option.value = freezer;
    option.textContent = freezer;
    if (freezer === state.selectedFreezer) option.selected = true;
    inventoryFreezerFilter.appendChild(option);
  });
}

function renderDashboard() {
  const data = currentData();
  const totalEntries = data.inventory.length;
  const totalUnits = data.inventory.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const urgentCount = data.inventory.filter((item) => urgencyScore(item) >= 3).length;
  const shoppingCount = data.shopping.length;

  dashboardCards.innerHTML = `
    <div class="dashboard-card">
      <strong>${totalEntries}</strong>
      <span>Einträge</span>
    </div>
    <div class="dashboard-card">
      <strong>${totalUnits}</strong>
      <span>Mengen gesamt</span>
    </div>
    <div class="dashboard-card">
      <strong>${urgentCount}</strong>
      <span>Dringend essen</span>
    </div>
    <div class="dashboard-card">
      <strong>${shoppingCount}</strong>
      <span>Einkaufsliste</span>
    </div>
  `;
}

function renderFreezerCards() {
  const data = currentData();
  freezerCards.innerHTML = "";

  if (!data.freezers.length) {
    freezerCards.innerHTML = '<div class="empty">Noch keine Gefrierschränke vorhanden.</div>';
    return;
  }

  data.freezers.forEach((freezer) => {
    const count = data.inventory.filter((item) => item.freezer === freezer).length;
    const el = document.createElement("button");
    el.className = "freezer-card" + (state.selectedFreezer === freezer ? " active" : "");
    el.type = "button";
    el.dataset.freezer = freezer;
    el.innerHTML = `
      <strong>${escapeHtml(freezer)}</strong>
      <span>${count} Einträge</span>
    `;
    freezerCards.appendChild(el);
  });
}

function renderSectionOverview() {
  const sections = uniqueSectionsForSelectedFreezer();
  sectionOverview.innerHTML = "";

  const entries = Object.entries(sections);

  if (!entries.length) {
    sectionOverview.innerHTML = '<div class="empty">Keine Fächer für die Auswahl vorhanden.</div>';
    return;
  }

  entries
    .sort((a, b) => a[0].localeCompare(b[0], "de"))
    .forEach(([section, info]) => {
      const el = document.createElement("div");
      el.className = "section-card";
      el.innerHTML = `
        <strong>${escapeHtml(section)}</strong>
        <span>${info.count} Einträge • ${info.amount} Stück insgesamt</span>
      `;
      sectionOverview.appendChild(el);
    });
}

function renderInventory() {
  const query = searchInput.value.trim().toLowerCase();
  const freezerFilter = inventoryFreezerFilter.value || state.selectedFreezer || "";

  const items = currentData().inventory
    .slice()
    .sort((a, b) => daysOld(b.date) - daysOld(a.date))
    .filter((item) => {
      if (freezerFilter && item.freezer !== freezerFilter) return false;
      if (!query) return true;
      return [item.food, item.freezer, item.section].some((value) =>
        value.toLowerCase().includes(query)
      );
    });

  inventoryList.innerHTML = "";

  if (!items.length) {
    inventoryList.innerHTML = '<div class="empty">Keine passenden Einträge gefunden.</div>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = `item ${getItemStatusClass(item)}`;
    el.innerHTML = `
      <div class="item-title">${escapeHtml(item.food)}</div>
      <div class="item-meta">${escapeHtml(formatMeta(item))}</div>
      <div class="item-actions">
        <button data-action="consume" data-id="${item.id}">1 verbraucht</button>
        <button data-action="delete" data-id="${item.id}">Löschen</button>
      </div>
    `;
    inventoryList.appendChild(el);
  });
}

function renderShopping() {
  const items = currentData().shopping;
  shoppingList.innerHTML = "";

  if (!items.length) {
    shoppingList.innerHTML = '<div class="empty">Einkaufsliste ist leer.</div>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${escapeHtml(item.name)}</div>
      <div class="item-actions">
        <button data-action="shopping-done" data-id="${item.id}">Erledigt</button>
      </div>
    `;
    shoppingList.appendChild(el);
  });
}

function renderSmart() {
  const urgent = currentData().inventory
    .slice()
    .map((item) => ({ ...item, age: daysOld(item.date), score: urgencyScore(item) }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || b.age - a.age);

  smartSummary.innerHTML = "";
  smartList.innerHTML = "";

  const summary = [
    `Dringende Produkte: ${urgent.length}`,
    `Ältestes Produkt: ${urgent[0] ? `${urgent[0].food} (${urgent[0].age} Tage)` : "keins"}`,
    `Empfehlung: ${urgent.length ? "Zuerst alte Produkte verbrauchen" : "Alles im grünen Bereich"}`
  ];

  summary.forEach((text) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="item-meta">${escapeHtml(text)}</div>`;
    smartSummary.appendChild(el);
  });

  if (!urgent.length) {
    smartList.innerHTML = '<div class="empty">Aktuell ist nichts dringend.</div>';
    return;
  }

  urgent.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item old";
    el.innerHTML = `
      <div class="item-title">${escapeHtml(item.food)}</div>
      <div class="item-meta">Dringend essen • ${item.age} Tage alt • ${escapeHtml(item.freezer)} • ${escapeHtml(item.section)} • Menge ${item.amount}</div>
    `;
    smartList.appendChild(el);
  });
}

function recipeIdeas(foods) {
  const lower = foods.map((f) => f.toLowerCase());
  const ideas = [];

  if (lower.some((f) => f.includes("pizza"))) ideas.push("Pizza-Abend");
  if (lower.some((f) => f.includes("gemüse")) && lower.some((f) => f.includes("reis"))) ideas.push("Gemüse-Reis-Pfanne");
  if (lower.some((f) => f.includes("hähnchen")) || lower.some((f) => f.includes("chicken"))) ideas.push("Hähnchen-Pfanne");
  if (lower.some((f) => f.includes("fisch"))) ideas.push("Fisch mit Gemüse");
  if (lower.some((f) => f.includes("hack"))) ideas.push("Hackfleisch-Pfanne");
  if (lower.some((f) => f.includes("beeren"))) ideas.push("Beeren-Dessert");
  if (lower.some((f) => f.includes("brot"))) ideas.push("Brotzeit");
  if (lower.some((f) => f.includes("erbsen"))) ideas.push("Erbsen-Beilage");
  if (lower.some((f) => f.includes("kartoffel"))) ideas.push("Kartoffel-Pfanne");

  if (!ideas.length) {
    ideas.push("Reste-Pfanne", "Suppenabend", "Ofengemüse", "Gemischtes Pfannengericht");
  }

  return ideas.slice(0, 7);
}

function renderRecipes() {
  const foods = currentData().inventory.map((item) => item.food);
  const ideas = recipeIdeas(foods);

  recipeList.innerHTML = "";
  ideas.forEach((idea) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="item-title">🍳 ${escapeHtml(idea)}</div>`;
    recipeList.appendChild(el);
  });
}

function renderMealPlan() {
  const urgentFoods = currentData().inventory
    .slice()
    .sort((a, b) => daysOld(b.date) - daysOld(a.date))
    .map((item) => item.food);

  const ideas = recipeIdeas(urgentFoods);
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  mealPlan.innerHTML = "";

  days.forEach((day, i) => {
    const recipe = ideas[i % ideas.length] || "Reste-Essen";
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${day}</div>
      <div class="item-meta">${escapeHtml(recipe)}</div>
    `;
    mealPlan.appendChild(el);
  });
}

function renderStats() {
  const data = currentData();
  const inventory = data.inventory;
  const totalEntries = inventory.length;
  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const oldCount = inventory.filter((item) => daysOld(item.date) >= 120).length;

  const byFreezer = {};
  inventory.forEach((item) => {
    byFreezer[item.freezer] = (byFreezer[item.freezer] || 0) + 1;
  });

  statsList.innerHTML = `
    <div class="item">
      <div class="item-title">Gesamt</div>
      <div class="item-meta">Einträge: ${totalEntries}<br>Mengen insgesamt: ${totalUnits}<br>Gefrierschränke: ${data.freezers.length}<br>Ältere Produkte: ${oldCount}</div>
    </div>
  `;

  Object.entries(byFreezer).forEach(([name, count]) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${escapeHtml(name)}</div>
      <div class="item-meta">${count} Einträge</div>
    `;
    statsList.appendChild(el);
  });

  if (!inventory.length) {
    statsList.innerHTML = '<div class="empty">Noch keine Statistik vorhanden.</div>';
  }
}

function renderAll() {
  renderHouseholds();
  renderInventoryFreezerFilter();
  renderDashboard();
  renderFreezerCards();
  renderSectionOverview();
  renderInventory();
  renderShopping();
  renderSmart();
  renderRecipes();
  renderMealPlan();
  renderStats();
  saveState();
}

function addInventoryItem({ freezer, section, food, amount, date }) {
  const data = currentData();
  const freezerName = freezer.trim();

  if (!data.freezers.includes(freezerName)) {
    data.freezers.push(freezerName);
  }

  data.inventory.push({
    id: crypto.randomUUID(),
    freezer: freezerName,
    section: section.trim(),
    food: food.trim(),
    amount: Number(amount),
    date
  });

  if (!state.selectedFreezer) {
    state.selectedFreezer = freezerName;
  }

  renderAll();
}

function addShoppingItem(name) {
  currentData().shopping.push({
    id: crypto.randomUUID(),
    name: name.trim()
  });
  renderAll();
}

function consumeOne(id) {
  const data = currentData();
  const item = data.inventory.find((entry) => entry.id === id);
  if (!item) return;

  item.amount -= 1;

  if (item.amount <= 0) {
    data.shopping.push({
      id: crypto.randomUUID(),
      name: item.food
    });
    data.inventory = data.inventory.filter((entry) => entry.id !== id);
  }

  renderAll();
}

function deleteInventoryItem(id) {
  currentData().inventory = currentData().inventory.filter((item) => item.id !== id);
  renderAll();
}

function deleteShoppingItem(id) {
  currentData().shopping = currentData().shopping.filter((item) => item.id !== id);
  renderAll();
}

function selectFreezer(name) {
  state.selectedFreezer = name || "";
  renderAll();
}

document.querySelectorAll(".navbtn").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    document.querySelectorAll(".navbtn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((section) => section.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");
  });
});

householdSelect.addEventListener("change", (event) => {
  state.currentHousehold = event.target.value;
  state.selectedFreezer = "";
  renderAll();
});

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();

  addInventoryItem({
    freezer: document.getElementById("freezerInput").value,
    section: document.getElementById("sectionInput").value,
    food: document.getElementById("foodInput").value,
    amount: document.getElementById("amountInput").value,
    date: document.getElementById("dateInput").value
  });

  itemForm.reset();
});

shoppingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addShoppingItem(document.getElementById("shoppingInput").value);
  shoppingForm.reset();
});

householdForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("newHouseholdInput").value.trim();
  if (!name) return;

  if (!state.households[name]) {
    state.households[name] = {
      freezers: [],
      inventory: [],
      shopping: []
    };
  }

  state.currentHousehold = name;
  state.selectedFreezer = "";
  householdForm.reset();
  renderAll();
});

freezerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const freezerName = document.getElementById("newFreezerInput").value.trim();
  if (!freezerName) return;

  const data = currentData();
  if (!data.freezers.includes(freezerName)) {
    data.freezers.push(freezerName);
  }

  if (!state.selectedFreezer) {
    state.selectedFreezer = freezerName;
  }

  freezerForm.reset();
  renderAll();
});

qrForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    household: state.currentHousehold,
    freezer: document.getElementById("qrFreezerInput").value.trim(),
    section: document.getElementById("qrSectionInput").value.trim()
  };

  qrOutput.textContent = JSON.stringify(payload, null, 2);
});

inventoryList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === "consume") consumeOne(id);
  if (action === "delete") deleteInventoryItem(id);
});

shoppingList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.action === "shopping-done") {
    deleteShoppingItem(target.dataset.id);
  }
});

searchInput.addEventListener("input", renderInventory);

inventoryFreezerFilter.addEventListener("change", (event) => {
  state.selectedFreezer = event.target.value;
  renderAll();
});

resetFreezerFilterBtn.addEventListener("click", () => {
  state.selectedFreezer = "";
  renderAll();
});

freezerCards.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-freezer]");
  if (!btn) return;
  selectFreezer(btn.dataset.freezer);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

renderAll();
