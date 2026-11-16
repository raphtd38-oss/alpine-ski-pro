import { COURSES, EQUIPMENT } from "../game/course";
import { formatTime } from "../game/race";
import type { Progress } from "../game/storage";
import type { Discipline, Quality, Weather, Result } from "../game/types";
const launchIcon =
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const checkIcon =
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 12 5 5L20 6"/></svg>';
export interface Settings {
  course: Discipline;
  equipment: Discipline;
  quality: Quality;
  autoPerformance: boolean;
  weather: Weather;
  sound: boolean;
  ghost: boolean;
  edges: boolean;
  suit: string;
}
export class UI {
  start: (training: boolean) => void = () => {};
  pause: () => void = () => {};
  resume: () => void = () => {};
  restart: () => void = () => {};
  home: () => void = () => {};
  replay: () => void = () => {};
  settingsChanged: () => void = () => {};
  hud: HTMLElement;
  modal: HTMLElement;
  menu: HTMLElement;
  toastTimer = 0;
  constructor(
    public el: HTMLElement,
    public settings: Settings,
    public progress: Progress,
  ) {
    el.innerHTML = `<div class="vignette"></div><header id="header"><a class="brand" href="#" aria-label="Accueil Alpine Ski Pro"><svg viewBox="0 0 48 40"><path d="m2 33 17-27 10 16 6-9 11 20H2Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="m13 16 6 4 5-5" fill="none" stroke="#fa6846" stroke-width="3"/></svg><span>ALPINE <b>SKI PRO</b><small>THE MOUNTAIN IS YOURS</small></span></a><nav><button data-nav="play" class="active">Jouer</button><button data-nav="courses">Courses</button><button data-nav="career">Carrière</button><button data-nav="gear">Équipement</button></nav><button class="icon-button" data-nav="settings" aria-label="Paramètres"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#142e3f"/><circle cx="16" cy="17" r="3" fill="#142e3f"/></svg></button></header>
  <main id="menu"><section class="hero"><div class="eyebrow"><i></i> SAISON 01 · LES ALPES</div><h1>LA MONTAGNE.<br>VOTRE <em>LIGNE.</em></h1><p>Le silence au départ. La morsure des carres.<br>Trouvez votre rythme, laissez votre trace.</p><div class="hero-actions"><button class="primary" id="play">PRENDRE LE DÉPART <span>${launchIcon}</span></button><button class="secondary" id="train">S’entraîner</button></div><div class="hint"><span class="key">A</span><span class="key">D</span> pour carver <span class="separator">/</span> <span class="key">W</span> pour la vitesse</div></section>
  <aside class="course-preview"><div class="preview-top"><span>VOTRE PROCHAINE DESCENTE</span><span class="live-dot">●</span></div><div class="course-title"><div><small id="discipline-label">SLALOM / SL</small><h2 id="course-name">Les Aiguilles</h2></div><svg class="route-art" viewBox="0 0 70 105"><path d="M45 5C-5 22 75 30 27 47S70 70 22 90" stroke="#f96c48" fill="none" stroke-width="2" stroke-dasharray="4 3"/><circle cx="45" cy="5" r="4" fill="white"/><circle cx="22" cy="90" r="4" fill="#f96c48"/></svg></div><div class="course-stats"><div><strong id="course-gates">22</strong><small>PORTES</small></div><div><strong id="course-length">570 <small>m</small></strong><small>DISTANCE</small></div><div><strong id="course-drop">140 <small>m</small></strong><small>DÉNIVELÉ</small></div></div><button class="course-link" data-nav="courses">Choisir une autre piste <span>→</span></button></aside>
  <footer><span><i class="status-dot"></i> ALPINE SKI PRO V1 · SLALOM JOUABLE <b>·</b> 100 % NAVIGATEUR</span><button data-nav="leaderboard">VOS RECORDS <span>${launchIcon}</span></button><span id="renderer-info">PLAYCANVAS ENGINE</span></footer></main>
  <section id="hud" hidden><div class="race-top"><div class="race-brand">ALPINE <b>SKI PRO</b><small id="hud-course">LES AIGUILLES · SL</small></div><div class="timing"><small>TEMPS DE COURSE</small><strong id="time">00:00.00</strong><span id="split">À vous de tracer la ligne</span></div><button id="pause" class="icon-button" aria-label="Pause"><span class="pause-bars"></span></button></div><div id="countdown" aria-live="polite"></div><div id="race-message"></div><div class="race-bottom"><div class="speed"><strong id="speed">0</strong><span>KM/H</span><div class="speed-bar"><i id="speed-bar"></i></div></div><div class="race-instruments"><div class="gate-info"><span>PORTES <strong id="gates">0 / 22</strong></span><span id="race-status">EN PISTE</span></div><div class="course-progress"><i id="progress"></i></div><div class="edge-info"><span id="equipment-label">PRECISION 165</span><span id="edge-label">CARRES 0°</span><span id="surface-label">NEIGE DAMÉE</span></div><div class="race-keys"><span id="fps-meter" aria-label="Images par seconde">FPS —</span><span> A / D &nbsp; DIRECTION <b>·</b> W &nbsp; VITESSE <b>·</b> S &nbsp; FREIN <b>·</b> ESPACE &nbsp; IMPULSION <b>·</b> C &nbsp; CAMÉRA <b>·</b> R &nbsp; RECOMMENCER</span></div></div><div class="altitude"><small>RESTANT</small><strong id="remaining">570</strong><span>MÈTRES</span></div></div><div id="touch-controls"><button data-touch="left" aria-label="Tourner à gauche"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m6 12 12-8v16Z"/></svg></button><button data-touch="brake">FREIN</button><button data-touch="right" aria-label="Tourner à droite"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m18 12-12-8v16Z"/></svg></button></div></section>
  <div id="modal" class="modal-backdrop" hidden></div><div id="toast" role="status"></div>`;
    this.menu = el.querySelector("#menu")!;
    this.hud = el.querySelector("#hud")!;
    this.modal = el.querySelector("#modal")!;
    el.querySelector("#play")!.addEventListener("click", () =>
      this.start(false),
    );
    el.querySelector("#train")!.addEventListener("click", () =>
      this.start(true),
    );
    el.querySelector("#pause")!.addEventListener("click", () => this.pause());
    el.querySelector(".brand")!.addEventListener("click", (e) => {
      e.preventDefault();
      this.close();
      this.home();
    });
    el.querySelectorAll<HTMLElement>("[data-nav]").forEach((b) =>
      b.addEventListener("click", () => this.open(b.dataset.nav!)),
    );
    this.updateCourse();
  }
  text(id: string, text: string) {
    const el = this.el.querySelector("#" + id);
    if (el) el.textContent = text;
  }
  updateCourse() {
    const c = COURSES[this.settings.course];
    this.text("course-name", c.name);
    this.text(
      "discipline-label",
      { SL: "SLALOM", GS: "GÉANT", SG: "SUPER-G", DH: "DESCENTE" }[c.id] +
        " / " +
        c.id,
    );
    this.text("course-gates", String(c.gates.length));
    this.text("course-length", c.length + " m");
    this.text("course-drop", Math.round(c.length * c.grade) + " m");
    this.text("hud-course", c.name.toUpperCase() + " · " + c.id);
    this.text(
      "equipment-label",
      EQUIPMENT[this.settings.equipment].name.toUpperCase(),
    );
  }
  setRace(on: boolean) {
    this.menu.hidden = on;
    this.el.querySelector<HTMLElement>(".vignette")!.hidden = on;
    this.hud.hidden = !on;
    this.el.querySelector<HTMLElement>("#header")!.hidden = on;
    this.el.classList.toggle("in-race", on);
    this.close();
  }
  close() {
    this.modal.hidden = true;
    this.modal.innerHTML = "";
  }
  panel(title: string, body: string) {
    this.modal.innerHTML = `<section class="panel" role="dialog" aria-modal="true" aria-label="${title}"><div class="panel-header"><div><small>ALPINE SKI PRO</small><h2>${title}</h2></div><button class="close icon-button" aria-label="Fermer">×</button></div>${body}</section>`;
    this.modal.hidden = false;
    this.modal.querySelector(".close")!.addEventListener("click", () => {
      this.close();
      if (!this.hud.hidden) this.resume();
    });
    this.modal.querySelector<HTMLButtonElement>("button")?.focus();
  }
  open(view: string) {
    if (view === "play") {
      this.close();
      return;
    }
    if (view === "courses") {
      this.panel(
        "Choisissez votre ligne",
        `<p class="panel-intro">Quatre tracés, quatre rythmes. Le slalom est le parcours de référence de cette version.</p><div class="course-grid">${Object.values(
          COURSES,
        )
          .map(
            (c, i) =>
              `<button class="course-card ${this.settings.course === c.id ? "selected" : ""}" data-course="${c.id}"><span class="course-number">0${i + 1}</span><span class="badge">${c.id}</span><h3>${c.name}</h3><p>${c.subtitle}</p><div>${c.length} m <b>·</b> ${c.gates.length} portes <b>·</b> ${Math.round(c.length * c.grade)} m D−</div></button>`,
          )
          .join(
            "",
          )}</div><p class="footnote">Tracés originaux générés. Aucun classement mondial dans cette version.</p>`,
      );
      this.modal.querySelectorAll<HTMLElement>("[data-course]").forEach(
        (b) =>
          (b.onclick = () => {
            this.settings.course = b.dataset.course as Discipline;
            this.settings.equipment = this.settings.course;
            this.updateCourse();
            this.settingsChanged();
            this.close();
          }),
      );
    } else if (view === "settings") {
      this.panel(
        "À votre mesure",
        `<div class="settings-grid"><label>Qualité graphique<select id="quality">${(["low", "medium", "high", "ultra"] as Quality[]).map((q, i) => `<option value="${q}" ${q === this.settings.quality ? "selected" : ""}>${["Faible", "Moyen", "Élevé", "Ultra"][i]}</option>`).join("")}</select></label><label>Conditions<select id="weather">${(["clear", "overcast", "snow"] as Weather[]).map((q, i) => `<option value="${q}" ${q === this.settings.weather ? "selected" : ""}>${["Grand beau", "Ciel couvert", "Brume neigeuse"][i]}</option>`).join("")}</select></label></div><div class="toggles">${[
          ["sound", "Ambiance sonore"],
          ["ghost", "Fantôme du meilleur chrono"],
          ["edges", "Télémétrie des carres"],
          ["autoPerformance", "Fluidité automatique (FPS maximum sans sacrifier les décors)"],
        ]
          .map(
            ([id, name]) =>
              `<label>${name}<input type="checkbox" id="${id}" ${this.settings[id as "sound" | "ghost" | "edges" | "autoPerformance"] ? "checked" : ""}></label>`,
          )
          .join(
            "",
          )}</div><p class="footnote">Musique, impacts et public créés avec <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">ElevenLabs</a>. La fluidité automatique ajuste légèrement la résolution et les ombres uniquement si nécessaire, sans limiter les FPS ; les décors et les animations restent visibles. Le choix Élevé ou Ultra détermine le niveau graphique maximal. La brume réduit la visibilité et l’adhérence. Une course en cours recommence si le rendu est reconstruit.</p><button id="apply" class="primary">APPLIQUER <span>${checkIcon}</span></button>`,
      );
      this.modal.querySelector("#apply")!.addEventListener("click", () => {
        this.settings.quality = (
          this.modal.querySelector("#quality") as HTMLSelectElement
        ).value as Quality;
        this.settings.weather = (
          this.modal.querySelector("#weather") as HTMLSelectElement
        ).value as Weather;
        for (const k of ["sound", "ghost", "edges", "autoPerformance"] as const)
          this.settings[k] = (
            this.modal.querySelector("#" + k) as HTMLInputElement
          ).checked;
        this.settingsChanged();
        this.close();
      });
    } else if (view === "gear") {
      this.panel(
        "L’outil de votre trajectoire",
        `<div class="gear-grid">${Object.values(EQUIPMENT)
          .map(
            (e) =>
              `<button class="gear-card ${e.id === this.settings.equipment ? "selected" : ""}" data-gear="${e.id}"><div class="ski-illustration"><i></i><i></i></div><small>${e.id} / RACE SERIES</small><h3>${e.name}</h3><p>${Math.round(e.length * 100)} cm <b>·</b> Rayon ${e.radius} m</p><label>Accroche <meter min="0" max="1.2" value="${e.grip}"></meter></label><label>Réactivité <meter min="0" max="7" value="${e.response}"></meter></label><label>Stabilité <meter min="0" max="1" value="${e.stability}"></meter></label></button>`,
          )
          .join(
            "",
          )}</div><div class="suit-options">Combinaison ${["#eb552d", "#1688b0", "#e2c95e", "#e9f0ec"].map((hex) => `<button class="swatch" data-color="${hex}" style="background:${hex}" aria-label="Combinaison ${hex}"></button>`).join("")}</div><p class="footnote">Longueur, rayon, rigidité, accroche et réactivité influencent réellement la conduite. Casque, chaussures et bâtons : modèle unique pour cette version.</p>`,
      );
      this.modal.querySelectorAll<HTMLElement>("[data-gear]").forEach(
        (b) =>
          (b.onclick = () => {
            this.settings.equipment = b.dataset.gear as Discipline;
            this.updateCourse();
            this.settingsChanged();
            this.close();
          }),
      );
      this.modal.querySelectorAll<HTMLElement>("[data-color]").forEach(
        (b) =>
          (b.onclick = () => {
            this.settings.suit = b.dataset.color!;
            this.settingsChanged();
            this.close();
          }),
      );
    } else if (view === "leaderboard") {
      const rows = this.progress.data.records[this.settings.course] ?? [];
      this.panel(
        "Vos records",
        `<p class="panel-intro">${COURSES[this.settings.course].name} · Classement local sur ce navigateur, toutes conditions et tous skis.</p><div class="leaderboard">${rows.length ? rows.map((r, i) => `<div><span class="rank">${String(i + 1).padStart(2, "0")}</span><span>${r.equipment}<small>${new Date(r.date).toLocaleDateString("fr-FR")}</small></span><strong>${formatTime(r.time)}</strong></div>`).join("") : '<div class="empty-state">Votre première ligne reste à tracer.<br><small>Terminez une course sans manquer de porte pour inscrire votre temps.</small></div>'}</div><p class="footnote">Les performances locales ne sont pas vérifiées par un serveur.</p>`,
      );
    } else if (view === "career") {
      this.panel(
        "Votre ascension",
        `<div class="career-head"><div class="level">${this.progress.level}<small>NIVEAU</small></div><div><h3 id="athlete-name"></h3><p>${this.progress.data.completed} course(s) validée(s) sur ce navigateur · ${this.progress.data.xp} XP</p><progress max="500" value="${this.progress.data.xp % 500}"></progress></div></div><label class="name-label">Nom du skieur<input id="skier-name" maxlength="32" placeholder="Votre nom"></label><button class="secondary" id="save-name">Enregistrer le profil</button><div class="milestones"><div><span>${this.progress.data.completed > 0 ? checkIcon : "01"}</span><h3>La première trace</h3><p>Terminer une course sans porte manquée.</p></div><div><span>${this.progress.data.completed >= 5 ? checkIcon : "02"}</span><h3>Trouver son rythme</h3><p>Terminer 5 courses. +100 XP par course, +50 pour un record.</p></div><div><span>${this.progress.level >= 3 ? checkIcon : "03"}</span><h3>Prendre de l’altitude</h3><p>Atteindre le niveau 3.</p></div></div><p class="footnote">Profil et progression locale fonctionnels. Championnats, récompenses et équipement à débloquer restent à développer.</p>`,
      );
      this.modal.querySelector("#athlete-name")!.textContent =
        this.progress.data.name;
      (this.modal.querySelector("#skier-name") as HTMLInputElement).value =
        this.progress.data.name;
      this.modal.querySelector("#save-name")!.addEventListener("click", () => {
        this.progress.data.name =
          (this.modal.querySelector("#skier-name") as HTMLInputElement).value
            .trim()
            .slice(0, 32) || "Athlète";
        this.progress.save();
        this.open("career");
      });
    }
  }
  paused() {
    this.panel(
      "Une respiration.",
      `<p class="panel-intro">La montagne peut attendre. Le chronomètre est arrêté.</p><div class="pause-buttons"><button id="continue" class="primary">REPRENDRE <span>→</span></button><button id="restart" class="secondary">Recommencer</button><button id="home" class="text-button">Retour au menu</button></div>`,
    );
    this.modal.querySelector("#continue")!.addEventListener("click", () => {
      this.close();
      this.resume();
    });
    this.modal
      .querySelector("#restart")!
      .addEventListener("click", () => this.restart());
    this.modal
      .querySelector("#home")!
      .addEventListener("click", () => this.home());
  }
  results(r: Result, best: boolean, training: boolean) {
    this.panel(
      r.valid ? "La ligne est à vous." : "Jusqu’au bout.",
      `<div class="result-badge ${r.valid ? "" : "invalid"}">${training ? "ENTRAÎNEMENT" : r.valid ? (best ? "NOUVEAU RECORD PERSONNEL" : "COURSE TERMINÉE") : "DISQUALIFIÉ · PORTE(S) MANQUÉE(S)"}</div><div class="result-time">${formatTime(r.time)}</div><div class="result-stats"><div><strong>${COURSES[r.course].gates.length - r.missed} / ${COURSES[r.course].gates.length}</strong><small>PORTES VALIDÉES</small></div><div><strong>${EQUIPMENT[r.equipment].name}</strong><small>ÉQUIPEMENT</small></div></div>${r.splits.length ? `<div class="splits">${r.splits.map((t, i) => `<span>INTER ${i + 1}<b>${formatTime(t)}</b></span>`).join("")}</div>` : ""}<p class="footnote">${training ? "Les entraînements ne modifient pas les records." : r.valid ? (this.progress.available ? "Résultat et progression enregistrés sur ce navigateur." : "Stockage indisponible : résultat conservé uniquement pour cette session.") : "Le temps est affiché à titre indicatif et ne compte pas au classement."}</p><div class="result-actions"><button id="again" class="primary">UNE AUTRE DESCENTE <span>${launchIcon}</span></button><button id="replay" class="secondary">Voir le replay</button><button id="home" class="text-button">Menu</button></div>`,
    );
    this.modal
      .querySelector("#again")!
      .addEventListener("click", () => this.restart());
    this.modal.querySelector("#replay")!.addEventListener("click", () => {
      this.close();
      this.replay();
    });
    this.modal
      .querySelector("#home")!
      .addEventListener("click", () => this.home());
  }
  toast(message: string) {
    this.text("toast", message);
    const el = this.el.querySelector("#toast")!;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => el.classList.remove("show"),
      2600,
    );
  }
}
