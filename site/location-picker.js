const KDLocationPicker = (() => {
  function locationKey(location) {
    return `${Number(location.latitude).toFixed(4)}:${Number(location.longitude).toFixed(4)}`;
  }

  function uniqueLocations(locations) {
    const seen = new Set();
    return (locations || []).filter((location) => {
      const key = locationKey(location);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getSearchOutcome(locations, { quickPick = false } = {}) {
    const normalized = uniqueLocations(locations);
    if (quickPick && normalized.length === 1) return { kind: "select", location: normalized[0] };
    return { kind: "choices", locations: normalized };
  }

  function formatLocationMeta(location) {
    return [...new Set([location.admin2, location.admin1, location.country].filter(Boolean))].join(" · ");
  }

  function createLocationPicker({ input, form, results, status, currentName, currentMeta, popular, search, onSelect }) {
    let requestId = 0;
    let searchTimer;
    let choices = [];

    function setStatus(message, mode = "") {
      status.textContent = message;
      status.dataset.mode = mode;
    }

    function clearResults() {
      choices = [];
      results.replaceChildren();
    }

    function renderChoices(locations) {
      clearResults();
      choices = locations;
      const fragment = document.createDocumentFragment();
      locations.forEach((location, index) => {
        const button = document.createElement("button");
        const name = document.createElement("strong");
        const meta = document.createElement("small");
        button.type = "button";
        button.className = "location-result";
        button.dataset.location = String(index);
        button.setAttribute("role", "option");
        name.textContent = location.name;
        meta.textContent = formatLocationMeta(location);
        button.append(name, meta);
        fragment.append(button);
      });
      results.append(fragment);
    }

    async function choose(location) {
      setStatus(`正在更新 ${location.name}`, "loading");
      const saved = await onSelect(location);
      if (!saved) {
        setStatus("城市更新失败", "error");
        return;
      }
      input.value = "";
      clearResults();
      setStatus(`${location.name} 已更新`, "success");
    }

    async function runSearch(query, { quickPick = false } = {}) {
      const normalized = String(query || "").trim();
      const currentRequest = ++requestId;
      if (Array.from(normalized).length < 2) {
        clearResults();
        setStatus("");
        return;
      }
      setStatus("正在查找城市", "loading");
      try {
        const locations = await search(normalized);
        if (currentRequest !== requestId) return;
        const outcome = getSearchOutcome(locations, { quickPick });
        if (outcome.kind === "select") {
          await choose(outcome.location);
          return;
        }
        renderChoices(outcome.locations);
        setStatus(outcome.locations.length ? `${outcome.locations.length} 个候选城市` : "未找到匹配城市", outcome.locations.length ? "" : "error");
      } catch (error) {
        if (currentRequest !== requestId) return;
        clearResults();
        setStatus(error.message || "城市搜索失败", "error");
      }
    }

    input.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(input.value), 350);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearTimeout(searchTimer);
      runSearch(input.value);
    });
    results.addEventListener("click", (event) => {
      const button = event.target.closest("[data-location]");
      if (!button) return;
      const location = choices[Number(button.dataset.location)];
      if (location) choose(location);
    });
    popular.addEventListener("click", (event) => {
      const button = event.target.closest("[data-city]");
      if (!button) return;
      clearTimeout(searchTimer);
      runSearch(button.dataset.city, { quickPick: true });
    });

    return {
      sync(location) {
        currentName.textContent = location.name;
        currentMeta.textContent = formatLocationMeta(location) || location.timezone;
        popular.querySelectorAll("[data-city]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.city === location.name);
          button.setAttribute("aria-pressed", String(button.dataset.city === location.name));
        });
      },
    };
  }

  return { createLocationPicker, formatLocationMeta, getSearchOutcome, uniqueLocations };
})();

if (typeof module !== "undefined" && module.exports) module.exports = KDLocationPicker;
else window.KDLocationPicker = KDLocationPicker;
