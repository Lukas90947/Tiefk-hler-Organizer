const STORAGE_KEY = "smart-freezer-v2";

const defaultData = {
  currentHousehold: "Zuhause",
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

const inventoryList = document.getElementById("inventoryList");
const shoppingList = document.getElementById("shoppingList");
const smartList = document.getElementById("smartList");
const recipeList = document.getElementById("recipeList");
const mealPlan = document.getElementById("mealPlan");
const statsList = document.getElementById("statsList");
const qrOutput = document.getElementById("qrOutput");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    const parsed = JSON.parse(raw);
    if (!parsed.households || !parsed.currentHousehold) return structuredClone(defaultData);
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

function renderInventory() {
  const query = searchInput.value.trim().toLowerCase();
  const items = currentData().inventory
    .slice()
    .sort((a, b) => daysOld(b.date) - daysOld(a.date))
    .filter((item) => {
      if (!query) return true;
      return [
        item.food,
        item.freezer,
        item.section
      ].some((value) => value.toLowerCase().includes(query));
    });

  inventoryList.innerHTML = "";

  if (!items.length) {
    inventoryList.innerHTML = '<div class="empty">Keine passenden Einträge gefunden.</div>';
    return;
  }

  items.forEach((item) => {
    const cls = daysOld(item.date) >= 120 ? "item old" : "item good";
    const el = document.createElement("div");
    el.className = cls;
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

  smartList.innerHTML = "";

  if (!urgent.length) {
    smartList.innerHTML = '<div class="empty">Aktuell ist nichts dringend.</div>';
    return;
  }

  urgent.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item old";
    el.innerHTML = `
      <div class="item-title">${escapeHtml(item.food)}</div>
      <div class="item-meta">Dringend essen • ${item.age} Tage alt • ${escapeHtml(item.freezer)} • ${escapeHtml(item.section)}</div>
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
  const ideas = recipeIdeas(currentData().inventory.map((item) => item.food));
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
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const byFreezer = {};
  inventory.forEach((item) => {
    byFreezer[item.freezer] = (byFreezer[item.freezer] || 0) + 1;
  });

  statsList.innerHTML = "";

  const first = document.createElement("div");
  first.className = "item";
  first.innerHTML = `
    <div class="item-title">Gesamt</div>
    <div class="item-meta">Einträge: ${totalItems}<br>Mengen insgesamt: ${totalUnits}<br>Gefrierschränke: ${data.freezers.length}</div>
  `;
  statsList.appendChild(first);

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

  if (!data.freezers.includes(freezer.trim())) {
    data.freezers.push(freezer.trim());
  }

  data.inventory.push({
    id: crypto.randomUUID(),
    freezer: freezer.trim(),
    section: section.trim(),
    food: food.trim(),
    amount: Number(amount),
    date
  });

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

searchInput.addEventListener("input", () => {
  renderInventory();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

renderAll();
