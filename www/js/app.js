document.addEventListener("DOMContentLoaded", () => {
  const API_ROOT = "/api";

  /* =========================
     APP STATE
     ========================= */
  const appState = {
    mode: "learn",
    hintsEnabled: true, // 🔑 new
  };

  let TOPICS = [];
  let activeTopic = null;
  let spots = [];
  let found = 0;
  let popupCount = 0;

  const RESOURCE_COLORS = {
    iron_ore: "#455A64", // steel grey
    bauxite: "#8D4B2D", // reddish brown
    mica: "#B0BEC5", // light silver
    copper: "#FF6F00", // orange
    coal_lignite: "#212121", // black
    petroleum_gas: "#1E3A8A", // deep blue
    thermal_power: "#D84315", // fiery orange
    nuclear_power: "#4CAF50", // green
    // hydro_power: "#2196F3", // blue
    airports: "#FDD835", // yellow
    ports: "#00ACC1", // cyan
  };

  /* =========================
     DOM REFERENCES
     ========================= */
  const img = document.getElementById("indiaMap");
  const topicSelect = document.getElementById("topicSelect");
  const mapWrap = document.getElementById("mapWrap");
  const infoPanel = document.getElementById("infoPanel");
  const progressBox = document.getElementById("progressBox");
  // const questionOverlay = document.getElementById("questionOverlay");

  /* =========================
     MODE HANDLING
     ========================= */
  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      setMode(e.target.value);
    });
  });

  function setMode(mode) {
    appState.mode = mode;
    onModeChange(mode);
    if (mode === "exam") {
      enableExamMode();
    } else {
      enableLearnMode();
      hideMapHint(); // ✅ hide any leftover exam hints
    }

    reload();
  }

  function enableExamMode() {
    // placeholder for future tightening
  }

  function enableLearnMode() {
    // placeholder for future loosening
  }

  /* =========================
     LOAD TOPICS
     ========================= */
  fetch(API_ROOT)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load topics");
      return res.json();
    })
    .then((json) => {
      TOPICS = json.data;
      populateTopics();
    })
    .catch(() => {
      infoPanel.innerHTML = "<h3>Error</h3><p>Backend not reachable.</p>";
    });

  function populateTopics() {
    topicSelect.innerHTML = `<option value="">-- Select Topic --</option>`;
    TOPICS.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.label;
      topicSelect.appendChild(opt);
    });
  }

  /* =========================
     TOPIC CHANGE
     ========================= */
  topicSelect.addEventListener("change", () => {
    const tid = topicSelect.value;
    clearAll();

    if (!tid) {
      activeTopic = null;
      activeTopic.color = RESOURCE_COLORS[activeTopic.id] || "#4CAF50";
      renderIdle();
      return;
    }

    // infoPanel.innerHTML = "<h3>Loading...</h3>";
    // questionOverlay.style.display = "none";

    fetch(`${API_ROOT}/learn?topic=${tid}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load topic");
        return res.json();
      })
      .then((json) => {
        activeTopic = json;
        activeTopic = {
          ...json,
          id: tid,
        };
        reload();
      })
      .catch(() => {
        // infoPanel.innerHTML = "<h3>Error</h3><p>Could not load topic data.</p>";
      });
  });

  /* =========================
     MAIN RENDER
     ========================= */
  function reload() {
    clearAll();

    if (!activeTopic) {
      renderIdle();
      return;
    }

    if (img.clientWidth === 0 || img.clientHeight === 0) {
      setTimeout(reload, 50);
      return;
    }

    // questionOverlay.textContent = `Locate on the map: ${activeTopic.label}`;
    // questionOverlay.style.display = "block";

    // const rect = img.getBoundingClientRect();

    activeTopic.spots.forEach((s) => {
      const spotState = { ...s, found: false };

      const hs = document.createElement("div");
      hs.className = "hotspot";

      const topicColor = RESOURCE_COLORS[activeTopic.id] || "#4CAF50";
      hs.style.setProperty("background-color", topicColor, "important");

      const imgRect = img.getBoundingClientRect();
      const wrapRect = mapWrap.getBoundingClientRect();

      const offsetX = imgRect.left - wrapRect.left;
      const offsetY = imgRect.top - wrapRect.top;

      hs.style.left = offsetX + s.x * imgRect.width + "px";
      hs.style.top = offsetY + s.y * imgRect.height + "px";
      hs.style.display = appState.mode === "learn" ? "block" : "none";

      hs.addEventListener("click", (e) => {
        e.stopPropagation();
        if (appState.mode === "learn") reveal(spotState, hs);
      });

      spotState.hs = hs;
      mapWrap.appendChild(hs);
      spots.push(spotState);
    });

    updateProgress();
  }

  /* =========================
     EXAM MODE CLICK
     ========================= */
  mapWrap.addEventListener("click", (e) => {
    if (appState.mode !== "exam" || !activeTopic) return;

    const rect = img.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    let correct = false;

    spots.forEach((s) => {
      if (!s.found && Math.abs(mx - s.x) < 0.03 && Math.abs(my - s.y) < 0.03) {
        s.found = true;
        found++;
        correct = true;
        s.hs.style.display = "block";
        s.hs.classList.add("locked");
        showPlacePopup(s.hs, s.name);
        celebrateAt(s.hs);
      }
    });
    ``;

    if (correct) {
      hideMapHint();
    } else {
      const target = spots.find((s) => !s.found);
      if (target) {
        showMapHint(directionHint(mx, my, target));
      }
    }

    updateProgress();
  });

  function directionHint(mx, my, s) {
    let dx = s.x - mx;
    let dy = s.y - my;

    let vertical = "";
    let horizontal = "";

    if (Math.abs(dy) > 0.01) {
      vertical = dy > 0 ? "South" : "North";
    }

    if (Math.abs(dx) > 0.01) {
      horizontal = dx > 0 ? "East" : "West";
    }

    const direction =
      vertical && horizontal
        ? `${vertical}-${horizontal}`
        : vertical || horizontal;

    const arrowMap = {
      North: "↑",
      South: "↓",
      East: "→",
      West: "←",
      "North-East": "↗",
      "North-West": "↖",
      "South-East": "↘",
      "South-West": "↙",
    };

    return `${arrowMap[direction] || ""} Move ${direction}`;
  }

  /* =========================
     LEARN MODE REVEAL
     ========================= */
  function reveal(s, hs) {
    // 🔁 REVISIT (Learn mode)
    if (s.found) {
      showPlacePopup(hs, s.name);
      renderLearningContext(s.mapContext, s.name);
      return;
    }

    // 🟢 FIRST VISIT
    s.found = true;
    found++;

    hs.classList.add("locked");
    hs.style.display = "block";

    showPlacePopup(hs, s.name);
    celebrateAt(hs);
    renderLearningContext(s.mapContext, s.name);

    updateProgress();
  }

  // function renderInfo(s) {
  //   infoPanel.innerHTML = `<h3>${s.name}</h3>
  //     <p>${s.desc || ""}</p>
  //     <hr>
  //     <b>CBSE:</b> ${s.exam || ""}`;
  // }

  function renderIdle() {
    infoPanel.innerHTML =
      "<h3>CBSE Geography Map Learning</h3><p>Select a topic.</p>";
    // questionOverlay.style.display = "none";
  }

  function hasCollision(testRect) {
    // Check against existing legends
    for (const el of document.querySelectorAll(".place-popup")) {
      if (el.classList.contains("fading")) continue;

      const r = el.getBoundingClientRect();
      if (overlaps(testRect, r)) return true;
    }

    // Check against dots
    for (const dot of document.querySelectorAll(".hotspot")) {
      const r = dot.getBoundingClientRect();
      if (overlaps(testRect, r)) return true;
    }

    return false;
  }

  function overlaps(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  /* =========================
     HELPERS
     ========================= */
  function clearAll() {
    document.querySelectorAll(".hotspot").forEach((h) => h.remove());
    document.querySelectorAll(".place-popup").forEach((p) => p.remove());
    document.querySelectorAll(".celebrate").forEach((c) => c.remove());

    spots = [];
    found = 0;
    popupCount = 0; // 👈 reset stacking
    // progressBox.textContent = "";
  }

  function updateProgress() {
    const total = spots.length || 0;
    const percent = total ? (found / total) * 100 : 0;

    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    const count = document.getElementById("progressCount");

    fill.style.width = percent + "%";
    count.textContent = `${found} / ${total}`;

    if (percent < 40) {
      fill.style.background = "linear-gradient(90deg, #e53935, #f9a825)";
      label.textContent = "Explore locations";
      label.style.color = "#263238"; // dark text for light bg
    } else if (percent < 80) {
      fill.style.background = "linear-gradient(90deg, #f9a825, #7cb342)";
      label.textContent = "Look for patterns";
      label.style.color = "#263238"; // still dark
    } else if (percent < 100) {
      fill.style.background = "linear-gradient(90deg, #7cb342, #43a047)";
      label.textContent = "Almost covered";
      label.style.color = "#ffffff"; // white on green
    } else {
      fill.style.background = "#43a047";
      label.textContent = "Map covered — revise freely";
      label.style.color = "#ffffff";
    }
  }

  function celebrateAt(hs) {
    const c = document.createElement("div");
    c.className = "celebrate";

    const size = 18; // sparkle size

    c.style.left = hs.offsetLeft + hs.offsetWidth / 2 - size / 2 + "px";
    c.style.top = hs.offsetTop + hs.offsetHeight / 2 - size / 2 + "px";

    mapWrap.appendChild(c);

    setTimeout(() => c.remove(), 700);
  }

  function showMapHint(text) {
    if (!appState.hintsEnabled) return;

    const box = document.getElementById("mapHintBox");
    box.innerHTML = `
    <div class="hint-text">💡 ${text}</div>
    <div class="hint-disable" id="disableHints">
      No hints please
    </div>
  `;
    box.style.display = "block";

    document.getElementById("disableHints").onclick = () => {
      appState.hintsEnabled = false;
      hideMapHint();
    };
  }

  function hideMapHint() {
    document.getElementById("mapHintBox").style.display = "none";
  }

  function fadeOutOldPopups() {
    document.querySelectorAll(".place-popup").forEach((p) => {
      p.classList.add("fading");

      // remove after fade completes
      setTimeout(() => {
        p.remove();
      }, 250);
    });
  }

  function showPlacePopup(hs, name) {
    fadeOutOldPopups();

    const p = document.createElement("div");
    p.className = "place-popup";
    p.textContent = name;

    mapWrap.appendChild(p); // needed for measurement

    const baseLeft = hs.offsetLeft + hs.offsetWidth / 2 + 6;
    const aboveTop = hs.offsetTop - p.offsetHeight - 4;
    const belowTop = hs.offsetTop + hs.offsetHeight + 4;

    // Test ABOVE position
    p.style.left = baseLeft + "px";
    p.style.top = aboveTop + "px";

    const testRect = p.getBoundingClientRect();

    if (hasCollision(testRect)) {
      // 🔄 flip below
      p.style.top = belowTop + "px";
    }
  }

  const learningDock = document.getElementById("learningDock");
  const dockContent = document.getElementById("dockContent");

  function showLearningDock() {
    learningDock.classList.remove("hidden");
    renderIdleDock();
  }

  function hideLearningDock() {
    learningDock.classList.add("hidden");
  }
  function renderIdleDock() {
    dockContent.innerHTML = `
    <div class="dock-idle">
      Tap a place on the map<br />
      to understand why it exists
    </div>
  `;
  }

  function getLegendOffset(hs) {
    const THRESHOLD = 40; // px radius
    let count = 0;

    document.querySelectorAll(".place-popup").forEach((p) => {
      const dx = p.offsetLeft - hs.offsetLeft;
      const dy = p.offsetTop - hs.offsetTop;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < THRESHOLD) count++;
    });

    return count;
  }

  function renderLearningContext(mapContext, titleText = "") {
    if (!mapContext) return;

    const whyList = (mapContext.whyHere || [])
      .slice(0, 2)
      .map((item) => `<li>${item}</li>`)
      .join("");

    dockContent.innerHTML = `
    ${
      titleText
        ? `<div class="dock-title"><strong>${titleText} 📖</strong></div>`
        : ""
    }

    <div class="dock-ncert">
       ${mapContext.ncertLine || ""}
    </div>

    ${
      whyList
        ? `
      <div>
        Why here?
        <ul class="dock-why">
          ${whyList}
        </ul>
      </div>
    `
        : ""
    }
  `;
  }

  function onModeChange(mode) {
    if (mode === "learn") {
      showLearningDock();
    } else {
      hideLearningDock();
    }
  }

  // questionOverlay.style.display = "none";
  onModeChange(appState.mode);
});
