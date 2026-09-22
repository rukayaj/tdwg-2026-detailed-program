(function () {
  "use strict";

  const app = document.querySelector(".programme-app");
  if (!app) return;

  const schedule = app.querySelector("[data-programme-schedule]");
  const status = app.querySelector("[data-programme-status]");
  const dayList = app.querySelector("[data-programme-days]");
  const search = app.querySelector("[data-programme-search]");
  const dialog = app.querySelector("[data-programme-dialog]");
  const closeButton = app.querySelector("[data-programme-close]");
  let data;
  let selectedDay;
  let previousFocus;
  let talkById = new Map();
  const starredTalksKey = "tdwg-2026-starred-talks";
  let starredTalks = loadStarredTalks();

  const trackColours = [
    [/AI|ROBOT/i, ["#dceDEA", "#205a51"]],
    [/LITERATURE|PUBLISH|COMMUNICATION/i, ["#f3e6d8", "#76512c"]],
    [/COLLECTION|DIGIT/i, ["#e8e2f2", "#574675"]],
    [/COMMUNITY|REGIONAL/i, ["#f2e2e7", "#7b3e52"]],
    [/DARWIN|STANDARD|SEMANTIC/i, ["#dfe9f4", "#355c7d"]],
    [/RESILIENCE|INFRASTRUCTURE|GOVERNANCE/i, ["#e4ecd9", "#52683e"]],
    [/TWIN|EMERGING/i, ["#e0edf0", "#35656e"]],
    [/EARTH|GEOLOG|MINERAL/i, ["#eee7d6", "#6e5b34"]],
    [/TAXON|FRESHWATER/i, ["#e4eee2", "#44623f"]],
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function loadStarredTalks() {
    try {
      const saved = JSON.parse(localStorage.getItem(starredTalksKey) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : []);
    } catch (error) {
      console.warn("Could not load starred program talks", error);
      return new Set();
    }
  }

  function saveStarredTalks() {
    try {
      localStorage.setItem(starredTalksKey, JSON.stringify([...starredTalks]));
    } catch (error) {
      console.warn("Could not save starred program talks", error);
    }
  }

  function setStarState(row, button, item) {
    const isStarred = starredTalks.has(item.id);
    row.classList.toggle("programme-talk-starred", isStarred);
    button.setAttribute("aria-pressed", String(isStarred));
    button.setAttribute("aria-label", `${isStarred ? "Remove star from" : "Star"} ${item.title}`);
    button.title = isStarred ? "Remove from starred talks" : "Add to starred talks";
  }

  function time24(value) {
    const match = value.match(/(\d+):(\d+)\s+(AM|PM)/);
    if (!match) return value;
    let hour = Number(match[1]) % 12;
    if (match[3] === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  }

  function timeRange(start, end) {
    return `${time24(start)}–${time24(end)}`;
  }

  function minutes(value) {
    const match = value.match(/(\d+):(\d+)\s+(AM|PM)/);
    if (!match) return 0;
    let hour = Number(match[1]) % 12;
    if (match[3] === "PM") hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function shortDay(day) {
    return day.replace(/\s+September$/, " Sep");
  }

  function roomRank(room) {
    const normalized = room.toLocaleUpperCase();
    const order = ["SAL A", "SAL B", "SAL C", "SAL D", "ODIN", "FORUM", "BALDER", "MØTEROM", "MEETING ROOM", "AULA"];
    const index = order.findIndex((name) => normalized.includes(name));
    return index === -1 ? order.length : index;
  }

  function sessionColours(session) {
    const value = `${session.track} ${session.title}`;
    const found = trackColours.find(([pattern]) => pattern.test(value));
    return found ? found[1] : ["#eceDEF", "#555b63"];
  }

  function matches(item, session, query) {
    if (!query) return true;
    const haystack = [
      item.title,
      item.speakers.join(" "),
      item.abstract,
      session.code,
      session.title,
      session.room,
      session.track,
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(query);
  }

  function renderDays() {
    dayList.replaceChildren();
    data.days.forEach((day) => {
      const button = element("button", "programme-day", shortDay(day));
      button.type = "button";
      button.role = "tab";
      button.dataset.day = day;
      button.setAttribute("aria-selected", String(day === selectedDay));
      button.addEventListener("click", () => {
        selectedDay = day;
        renderDays();
        renderSchedule();
      });
      dayList.append(button);
    });
  }

  function renderTalk(item) {
    const row = element("li", "programme-talk");
    row.append(element("span", "programme-talk-time", timeRange(item.start, item.end)));

    const details = element("div");
    const link = element("a", "programme-talk-link", item.title);
    link.href = `#${item.id}`;
    link.dataset.talkId = item.id;
    details.append(link);
    if (item.virtual) details.append(element("span", "programme-badge", "Virtual"));
    if (item.cancelled) details.append(element("span", "programme-badge programme-badge-cancelled", "Cancelled"));
    details.append(element("span", "programme-talk-speakers", item.speakers.join(", ") || "Presenter not listed"));
    const star = element("button", "programme-talk-star", "★");
    star.type = "button";
    setStarState(row, star, item);
    star.addEventListener("click", () => {
      if (starredTalks.has(item.id)) starredTalks.delete(item.id);
      else starredTalks.add(item.id);
      saveStarredTalks();
      setStarState(row, star, item);
    });
    row.append(details, star);
    return row;
  }

  function renderSession(session, items) {
    const card = element("article", "programme-session");
    const [background, ink] = sessionColours(session);
    card.style.setProperty("--track-bg", background);
    card.style.setProperty("--track-ink", ink);

    const head = element("header", "programme-session-head");
    const label = element("p", "programme-session-label");
    label.append(element("span", "", session.code));
    label.append(element("span", "", session.room));
    head.append(label, element("h3", "", session.title));
    card.append(head);

    const list = element("ul", "programme-talks");
    items.forEach((item) => list.append(renderTalk(item)));
    card.append(list);
    return card;
  }

  function renderAdmin(event) {
    const location = event.room && !["Outside", "1st Floor"].includes(event.room) ? ` · ${event.room}` : "";
    return element("div", "programme-admin", `${timeRange(event.start, event.end)} · ${event.title}${location}`);
  }

  function renderSchedule() {
    const query = search.value.trim().toLocaleLowerCase();
    let sessions = data.sessions
      .filter((session) => session.day === selectedDay)
      .map((session) => ({
        ...session,
        visibleItems: session.items.filter((item) => matches(item, session, query)),
      }))
      .filter((session) => session.visibleItems.length);
    const admin = query ? [] : data.admin.filter((item) => item.day === selectedDay);

    // Monday is represented as one plenary source session, but breaks and lunch
    // still need to appear at their actual positions in the on-screen timeline.
    if (!query && selectedDay === "Monday 21 September") {
      sessions = sessions.flatMap((session) => {
        const orderedItems = [...session.visibleItems].sort((left, right) => minutes(left.start) - minutes(right.start));
        const groups = [];
        orderedItems.forEach((item) => {
          const previous = groups.at(-1)?.at(-1);
          const interrupted = previous && admin.some((event) =>
            minutes(event.start) >= minutes(previous.end) && minutes(event.end) <= minutes(item.start)
          );
          if (!groups.length || interrupted) groups.push([]);
          groups.at(-1).push(item);
        });
        return groups.map((items, index) => ({
          ...session,
          id: `${session.id}-${index + 1}`,
          start: items[0].start,
          end: items.at(-1).end,
          visibleItems: items,
        }));
      });
    }

    const starts = [...new Set([...sessions.map((item) => item.start), ...admin.map((item) => item.start)])]
      .sort((left, right) => minutes(left) - minutes(right));

    schedule.replaceChildren();
    if (!sessions.length && !admin.length) {
      schedule.append(element("p", "programme-empty", "No program items match this search on the selected day."));
      status.textContent = "No matching talks";
      return;
    }

    starts.forEach((start) => {
      admin.filter((item) => item.start === start).forEach((item) => schedule.append(renderAdmin(item)));
      const slotSessions = sessions
        .filter((item) => item.start === start)
        .sort((left, right) => roomRank(left.room) - roomRank(right.room));
      if (!slotSessions.length) return;
      const slot = element("section", "programme-slot");
      const heading = element("div", "programme-slot-heading");
      heading.append(element("h2", "", timeRange(start, slotSessions[0].end)));
      heading.append(element("span", "", slotSessions.length === 1 ? "1 session" : `${slotSessions.length} parallel sessions`));
      const grid = element("div", "programme-grid");
      grid.style.setProperty("--session-count", slotSessions.length);
      slotSessions.forEach((session) => grid.append(renderSession(session, session.visibleItems)));
      slot.append(heading, grid);
      schedule.append(slot);
    });

    const talkCount = sessions.reduce((total, session) => total + session.visibleItems.length, 0);
    status.textContent = `${talkCount} program ${talkCount === 1 ? "item" : "items"} shown for ${selectedDay}`;
  }

  function addMeta(term, description) {
    const meta = app.querySelector("[data-dialog-meta]");
    meta.append(element("dt", "", term), element("dd", "", description));
  }

  function openTalk(id, updateHistory) {
    const item = talkById.get(id);
    if (!item) return;
    previousFocus = document.activeElement;
    app.querySelector("[data-dialog-kicker]").textContent = `${item.sessionCode} · ${item.sessionTitle}`;
    app.querySelector("[data-dialog-title]").textContent = item.title;
    app.querySelector("[data-dialog-speakers]").textContent = item.speakers.join(", ") || "Presenter not listed";
    app.querySelector("[data-dialog-meta]").replaceChildren();
    addMeta("When", `${item.day}, ${timeRange(item.start, item.end)}`);
    addMeta("Where", item.room);
    if (item.virtual) addMeta("Format", "Virtual presentation");
    if (item.cancelled) addMeta("Status", "Cancelled");

    const note = app.querySelector("[data-dialog-note]");
    note.textContent = item.note;
    note.hidden = !item.note;

    const abstract = app.querySelector("[data-dialog-abstract]");
    abstract.replaceChildren();
    const paragraphs = item.abstract ? item.abstract.split(/\n\s*\n/) : ["No abstract was supplied in the source programme."];
    paragraphs.forEach((paragraph) => abstract.append(element("p", "", paragraph)));

    if (!dialog.open) dialog.showModal();
    if (updateHistory && window.location.hash !== `#${id}`) history.pushState({ talk: id }, "", `#${id}`);
  }

  function closeDialog(updateHistory) {
    if (dialog.open) dialog.close();
    if (updateHistory && window.location.hash) history.pushState({}, "", window.location.pathname + window.location.search);
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
  }

  function handleHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (talkById.has(id)) openTalk(id, false);
    else if (dialog.open) closeDialog(false);
  }

  app.addEventListener("click", (event) => {
    const link = event.target.closest("[data-talk-id]");
    if (!link) return;
    event.preventDefault();
    openTalk(link.dataset.talkId, true);
  });
  closeButton.addEventListener("click", () => closeDialog(true));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(true);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(true);
  });
  window.addEventListener("popstate", handleHash);
  window.addEventListener("storage", (event) => {
    if (event.key !== starredTalksKey) return;
    starredTalks = loadStarredTalks();
    renderSchedule();
  });
  search.addEventListener("input", renderSchedule);

  const programme = window.TDWG_2026_PROGRAMME;
  if (!programme) {
    status.textContent = "The program could not be loaded. Please try again later.";
    status.classList.add("alert", "alert-danger");
    console.error("TDWG program data script did not load");
    return;
  }

  data = programme;
  selectedDay = data.days.find((day) => data.sessions.some((session) => session.day === day)) || data.days[0];
  data.sessions.forEach((session) => session.items.forEach((item) => talkById.set(item.id, item)));
  renderDays();
  renderSchedule();
  handleHash();
})();
