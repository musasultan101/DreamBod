let maintenance = 0;
let foodEaten = 0;
let workoutBurned = 0;
let foodItems = [];
let history = []; 

const MET = {
  running: 9.8, cycling: 7.5, weightlifting: 3.5, swimming: 6.0, walking: 3.5
};

const FOODS = {
  rice: 130, chicken: 165, banana: 89, egg: 155, broccoli: 34, salmon: 208
};

function saveData() {
  let data = {
    maintenance: maintenance,
    foodEaten: foodEaten,
    workoutBurned: workoutBurned,
    foodItems: foodItems,
    history: history,
    age: document.getElementById("age").value,
    sex: document.getElementById("sex").value,
    weight: document.getElementById("weight").value,
    height: document.getElementById("height").value,
    activity: document.getElementById("activity").value
  };
  localStorage.setItem("dreambod", JSON.stringify(data));
}

function loadData() {
  let saved = localStorage.getItem("dreambod");
  if (!saved) return;

  let data = JSON.parse(saved);
  maintenance = data.maintenance || 0;
  foodEaten = data.foodEaten || 0;
  workoutBurned = data.workoutBurned || 0;
  foodItems = data.foodItems || [];
  history = data.history || [];

  if (data.age) document.getElementById("age").value = data.age;
  if (data.sex) document.getElementById("sex").value = data.sex;
  if (data.weight) document.getElementById("weight").value = data.weight;
  if (data.height) document.getElementById("height").value = data.height;
  if (data.activity) document.getElementById("activity").value = data.activity;

  // redraw saved food list
  for (let item of foodItems) {
    let li = document.createElement("li");
    li.innerHTML = "<span>" + item.label + "</span><span>" + item.kcal + " kcal</span>";
    document.getElementById("foodList").appendChild(li);
  }

  if (maintenance > 0) {
    document.getElementById("result").classList.remove("muted");
    document.getElementById("result").textContent = "Maintenance: " + maintenance + " kcal/day";
  }
  if (foodEaten > 0) {
    document.getElementById("foodResult").classList.remove("muted");
    document.getElementById("foodResult").textContent = "Total food so far: " + foodEaten + " kcal";
  }
  if (workoutBurned > 0) {
    document.getElementById("burnResult").classList.remove("muted");
    document.getElementById("burnResult").textContent = "Total burned: " + workoutBurned + " kcal";
  }

  renderHistory();
  updateLedger();
}

window.onload = loadData;

function calcTDEE() {
  let age = Number(document.getElementById("age").value);
  let weightLbs = Number(document.getElementById("weight").value);
  let heightInches = Number(document.getElementById("height").value);
  let sex = document.getElementById("sex").value;
  let activity = Number(document.getElementById("activity").value);
  let kg = weightLbs / 2.205;
  let cm = heightInches * 2.54;
  let bmr;
  if (sex === "male") {
    bmr = 10 * kg + 6.25 * cm - 5 * age + 5;
  } else {
    bmr = 10 * kg + 6.25 * cm - 5 * age - 161;
  }
  let tdee = bmr * activity;
  maintenance = Math.round(tdee);
  document.getElementById("result").classList.remove("muted");
  document.getElementById("result").textContent =
    "Maintenance: " + maintenance + " kcal/day";
  updateLedger();
  saveData();
}

function calcWorkout() {
  let type = document.getElementById("workoutType").value;
  let minutes = Number(document.getElementById("minutes").value);
  let weightLbs = Number(document.getElementById("bodyWeight").value);
  let kg = weightLbs / 2.205;
  let hrs = minutes / 60;
  let kcal = MET[type] * kg * hrs;
  workoutBurned = workoutBurned + Math.round(kcal);
  document.getElementById("burnResult").classList.remove("muted");
  document.getElementById("burnResult").textContent =
    "Burned " + Math.round(kcal) + " kcal  ·  total burned " + workoutBurned;
  updateLedger();
  saveData();
}

async function searchFood() {
  let food = document.getElementById("foodName").value;
  let grams = Number(document.getElementById("grams").value);
  let apiKey = "JTCNCAVrOnlP1O1a7YrUo3W85IWUCWod7Y5MrilL";

  document.getElementById("foodResult").classList.remove("muted");
  document.getElementById("foodResult").textContent = "Searching…";

  let per100;
  try {
    let url = "https://api.nal.usda.gov/fdc/v1/foods/search?query=" + food + "&pageSize=1&api_key=" + apiKey;
    let res = await fetch(url);
    let data = await res.json();
    let item = data.foods[0];
    let energy = item.foodNutrients.find(n => n.nutrientName === "Energy" && n.unitName === "KCAL");
    per100 = energy.value;
  } catch (e) {
    per100 = FOODS[food.toLowerCase()];
  }

  if (per100 === undefined) {
    document.getElementById("foodResult").textContent =
      "Couldn't find that food. Try another name.";
    return;
  }

  let total = Math.round((grams / 100) * per100);
  foodEaten = foodEaten + total;

  let label = grams + "g " + food;
  foodItems.push({ label: label, kcal: total });

  let li = document.createElement("li");
  li.innerHTML = "<span>" + label + "</span><span>" + total + " kcal</span>";
  document.getElementById("foodList").appendChild(li);

  document.getElementById("foodResult").textContent =
    "Total food so far: " + foodEaten + " kcal";
  document.getElementById("foodName").value = "";
  updateLedger();
  saveData();
}

function calcDeficit() {
  let deficit = maintenance - foodEaten + workoutBurned;
  let el = document.getElementById("deficitResult");
  el.classList.remove("muted");
  if (deficit > 0) {
    el.textContent = "You're in a " + deficit + " kcal deficit — on track to lose weight.";
  } else if (deficit < 0) {
    el.textContent = "You're in a " + Math.abs(deficit) + " kcal surplus — on track to gain weight.";
  } else {
    el.textContent = "You're right at maintenance.";
  }
  updateLedger();
}

function resetDay() {

  if (foodEaten > 0 || workoutBurned > 0) {
    let deficit = maintenance - foodEaten + workoutBurned;
    let today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    history.push({
      date: today,
      deficit: deficit,
      food: foodEaten,
      burned: workoutBurned
    });
    renderHistory();
  }

  foodEaten = 0;
  workoutBurned = 0;
  foodItems = [];
  document.getElementById("foodList").innerHTML = "";
  document.getElementById("foodResult").textContent = "Search a food to log its calories";
  document.getElementById("foodResult").classList.add("muted");
  document.getElementById("burnResult").textContent = "Estimated burn appears here";
  document.getElementById("burnResult").classList.add("muted");
  document.getElementById("deficitResult").textContent = "Day reset — start fresh.";
  updateLedger();
  saveData();
}

function renderHistory() {
  let list = document.getElementById("historyList");
  list.innerHTML = "";
  if (history.length > 0) {
    document.getElementById("historyEmpty").style.display = "none";
  }
  for (let day of history) {
    let isDeficit = day.deficit >= 0;
    let word = isDeficit ? "deficit" : "surplus";
    let li = document.createElement("li");
    li.innerHTML =
      "<span class='day-date'>" + day.date + "</span>" +
      "<span class='day-result " + word + "'>" + Math.abs(day.deficit) + " " + word + "</span>" +
      "<span class='day-meta'>Food " + day.food + " · Burned " + day.burned + "</span>";
    list.appendChild(li);
  }
}

function updateLedger() {
  document.getElementById("statMaint").textContent = maintenance;
  document.getElementById("statFood").textContent = foodEaten;
  document.getElementById("statBurn").textContent = workoutBurned;

  let net = maintenance - foodEaten + workoutBurned;
  let nv = document.getElementById("netValue");
  let ns = document.getElementById("netSub");
  if (maintenance === 0) {
    nv.textContent = "—"; nv.className = "net-value muted";
    ns.textContent = "Calculate maintenance, then log food & workouts";
    return;
  }
  nv.textContent = (net >= 0 ? "-" : "+") + Math.abs(net);
  nv.className = "net-value " + (net >= 0 ? "pos" : "neg");
  ns.textContent = net >= 0 ? "calorie deficit today" : "calorie surplus today";
}