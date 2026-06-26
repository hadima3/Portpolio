// ════════ 관리자 대시보드 ════════
const TOKEN_KEY = "portfolio_token";
let data = null;
let activeKey = "hero";
const token = () => localStorage.getItem(TOKEN_KEY);

// ── DOM 헬퍼 ──
function elt(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function field(labelText, value, oninput, opts = {}) {
  const label = elt("label", "field");
  label.appendChild(document.createTextNode(labelText));
  if (opts.hint) label.appendChild(elt("span", "hint", opts.hint));
  const input = opts.textarea ? elt("textarea") : elt("input");
  if (opts.type) input.type = opts.type;
  if (opts.rows) input.rows = opts.rows;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  input.value = value ?? "";
  input.addEventListener("input", () => oninput(input.value));
  label.appendChild(input);
  return label;
}
function row2(a, b) {
  const r = elt("div", "row2");
  r.appendChild(a);
  r.appendChild(b);
  return r;
}
// 공개/숨김 스위치 (getVal: true=공개)
function switchToggle(getVal, setVal, onChange) {
  const btn = elt("button", "switch");
  btn.type = "button";
  function paint() {
    const on = getVal();
    btn.classList.toggle("on", on);
    btn.innerHTML = `<span class="switch__track"></span><span>${on ? "공개" : "숨김"}</span>`;
  }
  btn.addEventListener("click", () => {
    setVal(!getVal());
    paint();
    onChange && onChange();
  });
  paint();
  return btn;
}

// ── 파일 업로드 ──
async function uploadFile(file) {
  const res = await fetch("/api/upload?name=" + encodeURIComponent(file.name), {
    method: "POST",
    headers: { Authorization: "Bearer " + token(), "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "업로드 실패");
  }
  return (await res.json()).url;
}
function fileField(labelText, getVal, setVal, accept) {
  const wrap = elt("label", "field");
  wrap.appendChild(document.createTextNode(labelText));
  const urlInput = elt("input");
  urlInput.value = getVal() ?? "";
  urlInput.placeholder = "URL 직접 입력 또는 업로드 →";
  const btn = elt("button", "upload-btn", "📎 업로드");
  btn.type = "button";
  const fileInput = elt("input");
  fileInput.type = "file";
  fileInput.accept = accept || "";
  fileInput.style.display = "none";
  const preview = elt("div", "file-preview");

  function updatePreview(v) {
    // v를 직접 받거나, urlInput.value 사용
    const val = v !== undefined ? v : urlInput.value;
    preview.innerHTML = "";
    if (!val) return;
    if (/\.(mp4|webm|ogg|mov)$/i.test(val)) {
      const vid = elt("video");
      vid.src = val;
      vid.controls = true;
      vid.style.maxWidth = "100%";
      preview.appendChild(vid);
    } else if (!/youtube|youtu\.be|vimeo/i.test(val)) {
      const img = elt("img");
      img.src = val;
      img.style.maxWidth = "100%";
      img.style.borderRadius = "8px";
      img.style.marginTop = "0.5rem";
      preview.appendChild(img);
    }
  }

  urlInput.addEventListener("input", () => {
    setVal(urlInput.value);
    updatePreview(urlInput.value);
  });
  btn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files[0]) return;
    btn.textContent = "업로드 중...";
    btn.disabled = true;
    try {
      const url = await uploadFile(fileInput.files[0]);
      urlInput.value = url;
      setVal(url);
      updatePreview(url);
    } catch (e) {
      alert(e.message);
    }
    btn.textContent = "📎 업로드";
    btn.disabled = false;
    fileInput.value = "";
  });
  const controls = elt("div", "file-controls");
  controls.appendChild(urlInput);
  controls.appendChild(btn);
  wrap.appendChild(controls);
  wrap.appendChild(fileInput);
  wrap.appendChild(preview);
  updatePreview(getVal());
  return wrap;
}
function galleryField(item) {
  item.gallery = item.gallery || [];
  const wrap = elt("div", "gallery-field");
  wrap.appendChild(elt("div", "subhead", "갤러리 이미지 (여러 장 가능)"));
  const grid = elt("div", "gallery-grid");
  function rerender() {
    grid.innerHTML = "";
    item.gallery.forEach((url, gi) => {
      const cell = elt("div", "gallery-cell");
      const img = elt("img");
      img.src = url;
      const del = elt("button", "gallery-del", "×");
      del.type = "button";
      del.addEventListener("click", () => {
        item.gallery.splice(gi, 1);
        rerender();
      });
      cell.appendChild(img);
      cell.appendChild(del);
      grid.appendChild(cell);
    });
  }
  const addBtn = elt("button", "upload-btn", "📎 이미지 추가");
  addBtn.type = "button";
  const fi = elt("input");
  fi.type = "file";
  fi.accept = "image/*";
  fi.multiple = true;
  fi.style.display = "none";
  addBtn.addEventListener("click", () => fi.click());
  fi.addEventListener("change", async () => {
    addBtn.textContent = "업로드 중...";
    addBtn.disabled = true;
    for (const f of fi.files) {
      try {
        item.gallery.push(await uploadFile(f));
      } catch (e) {
        alert(e.message);
      }
    }
    rerender();
    addBtn.textContent = "📎 이미지 추가";
    addBtn.disabled = false;
    fi.value = "";
  });
  rerender();
  wrap.appendChild(grid);
  wrap.appendChild(addBtn);
  wrap.appendChild(fi);
  return wrap;
}
function linksField(item) {
  item.links = item.links || [];
  const wrap = elt("div", "links-field");
  wrap.appendChild(elt("div", "subhead", "관련 링크 (노션/공고/영상 등)"));
  const list = elt("div");
  function rerender() {
    list.innerHTML = "";
    item.links.forEach((lnk, li) => {
      const r = elt("div", "link-row");
      const a = elt("input");
      a.placeholder = "라벨";
      a.value = lnk.label || "";
      a.addEventListener("input", () => (lnk.label = a.value));
      const b = elt("input");
      b.placeholder = "https://";
      b.value = lnk.url || "";
      b.addEventListener("input", () => (lnk.url = b.value));
      const del = elt("button", "icon-btn icon-btn--del", "🗑");
      del.type = "button";
      del.addEventListener("click", () => {
        item.links.splice(li, 1);
        rerender();
      });
      r.appendChild(a);
      r.appendChild(b);
      r.appendChild(del);
      list.appendChild(r);
    });
  }
  const add = elt("button", "add-btn", "+ 링크 추가");
  add.addEventListener("click", () => {
    item.links.push({ label: "", url: "" });
    rerender();
  });
  rerender();
  wrap.appendChild(list);
  wrap.appendChild(add);
  return wrap;
}

// 프로젝트/활동 공용 빌더
function projectDef() {
  return { title: "새 항목", org: "", category: "", period: "", contribution: "", summary: "", description: "", approach: "", results: [], tags: [], cover: "", gallery: [], video: "", links: [] };
}
function buildProject(box, it, isActivity = false) {
  box.appendChild(field("제목", it.title, (v) => (it.title = v)));
  box.appendChild(row2(
    field(isActivity ? "소속" : "소속/기관", it.org, (v) => (it.org = v)),
    field("기간", it.period, (v) => (it.period = v))
  ));
  box.appendChild(row2(
    field(isActivity ? "분야" : "업무 카테고리", it.category, (v) => (it.category = v), { 
      placeholder: isActivity ? "예: 채용 브랜딩 / 조직문화" : "채용 / 평가 / 조직문화", 
      hint: isActivity ? "사이트 ‘분야’ 필터 기준" : "사이트 ‘업무’ 필터 기준" 
    }),
    field("기여도/역할", it.contribution, (v) => (it.contribution = v), { placeholder: "기여도 90% / 팀장" })
  ));
  box.appendChild(field("카드 요약 (목록에 보일 한 줄)", it.summary, (v) => (it.summary = v), { textarea: true, rows: 2 }));
  box.appendChild(field("개요 (상세 페이지)", it.description, (v) => (it.description = v), { textarea: true, rows: 3 }));
  box.appendChild(field("진행 과정 & 접근 (상세 페이지)", it.approach, (v) => (it.approach = v), { textarea: true, rows: 4, hint: "어떤 문제를, 어떻게 풀었는지 (상황→전략→실행)" }));
  box.appendChild(field("주요 성과 (한 줄에 하나씩)", (it.results || []).join("\n"),
    (v) => (it.results = v.split("\n").map((s) => s.trim()).filter(Boolean)), { textarea: true, rows: 4 }));
  box.appendChild(field("태그 (쉼표로 구분)", (it.tags || []).join(", "),
    (v) => (it.tags = v.split(",").map((t) => t.trim()).filter(Boolean)), { hint: isActivity ? "대외활동 태그로 사이트에서 필터됩니다." : "업무별 태그로 사이트에서 필터됩니다. 예: 채용, 평가, 조직문화" }));
  box.appendChild(fileField("커버 이미지", () => it.cover || it.image, (v) => (it.cover = v), "image/*"));
  box.appendChild(fileField("영상 (YouTube/Vimeo URL 또는 파일)", () => it.video, (v) => (it.video = v), "video/*"));
  box.appendChild(galleryField(it));
  box.appendChild(linksField(it));
}

// ════════ 섹션 정의 ════════
const SECTIONS = [
  { key: "hero", label: "기본 정보", type: "hero" },
  { key: "about", label: "소개", type: "simple", toggle: true },
  {
    key: "tools", label: "Skills & Tools", type: "list", toggle: true, addLabel: "+ 도구 추가",
    title: (it) => it.name || "(이름 없음)",
    def: () => ({ icon: "", name: "새 도구", desc: "", level: 3 }),
    build: (box, it) => {
      box.appendChild(fileField("아이콘 (로고 이미지)", () => it.icon, (v) => (it.icon = v), "image/*"));
      box.appendChild(row2(
        field("도구/스킬 이름", it.name, (v) => (it.name = v)),
        field("숙련도 (1~5)", Number(it.level) || 0, (v) => (it.level = Math.max(0, Math.min(5, Number(v)))), { type: "number" })
      ));
      box.appendChild(field("설명 (어떻게 활용하는지)", it.desc, (v) => (it.desc = v)));
    },
  },
  {
    key: "experience", label: "경력", type: "list", toggle: true, addLabel: "+ 경력 추가",
    title: (it) => it.org || "(회사 없음)",
    def: () => ({ period: "", org: "새 경력", role: "", desc: "" }),
    build: (box, it) => {
      box.appendChild(row2(
        field("기간", it.period, (v) => (it.period = v), { placeholder: "2025.10 ~ 재직중" }),
        field("회사/조직", it.org, (v) => (it.org = v))
      ));
      box.appendChild(field("직무/역할", it.role, (v) => (it.role = v)));
      box.appendChild(field("설명", it.desc, (v) => (it.desc = v), { textarea: true, rows: 2 }));
    },
  },
  {
    key: "works", label: "프로젝트", type: "list", toggle: true, addLabel: "+ 프로젝트 추가",
    title: (it) => it.title || "(제목 없음)",
    def: projectDef,
    build: buildProject,
  },
  {
    key: "activities", label: "대외활동", type: "list", toggle: true, addLabel: "+ 활동 추가",
    title: (it) => it.title || "(제목 없음)",
    def: projectDef,
    build: (box, it) => buildProject(box, it, true),
  },
  {
    key: "education", label: "교육", type: "list", toggle: true, addLabel: "+ 교육 추가",
    title: (it) => it.title || "(제목 없음)",
    def: () => ({ title: "새 교육", provider: "", category: "", period: "", points: [], image: "", gallery: [], links: [] }),
    build: (box, it) => {
      box.appendChild(field("교육명", it.title, (v) => (it.title = v)));
      box.appendChild(row2(
        field("업체명 (기관 / 제공처)", it.provider, (v) => (it.provider = v)),
        field("분야", it.category || "", (v) => (it.category = v), { placeholder: "예: HRM / AI 채용 / 데이터분석", hint: "사이트 ‘분야’ 필터 기준" })
      ));
      box.appendChild(field("기간", it.period, (v) => (it.period = v), { placeholder: "2025.01 ~ 2025.03" }));
      box.appendChild(field("세부 내용 (한 줄에 하나씩)", (it.points || []).join("\n"),
        (v) => (it.points = v.split("\n").map((s) => s.trim()).filter(Boolean)), { textarea: true, rows: 4 }));
      box.appendChild(fileField("대표 사진 (수료증·강의 등)", () => it.image, (v) => (it.image = v), "image/*"));
      box.appendChild(galleryField(it));
      box.appendChild(linksField(it));
    },
  },
  {
    key: "certifications", label: "자격증", type: "list", toggle: true, addLabel: "+ 자격증 추가",
    title: (it) => it.name || "(이름 없음)",
    def: () => ({ date: "", name: "새 자격증", number: "" }),
    build: (box, it) => {
      box.appendChild(field("자격증명", it.name, (v) => (it.name = v)));
      box.appendChild(row2(
        field("취득 년월일", it.date, (v) => (it.date = v), { placeholder: "2025.09.26" }),
        field("자격번호 / 발급번호", it.number, (v) => (it.number = v), { placeholder: "예: 2025-1234567" })
      ));
      box.appendChild(elt("p", "hint", "※ 공개 사이트에는 ‘취득 년월일 + 자격증명’만 표시됩니다. 자격번호는 관리자 보관용."));
    },
  },
  {
    key: "languages", label: "어학", type: "list", toggle: true, addLabel: "+ 어학 추가",
    title: (it) => it.name || "(이름 없음)",
    def: () => ({ date: "", name: "새 어학 성적", number: "" }),
    build: (box, it) => {
      box.appendChild(field("어학 성적", it.name, (v) => (it.name = v)));
      box.appendChild(row2(
        field("취득 년월일", it.date, (v) => (it.date = v), { placeholder: "2025.09.12" }),
        field("성적표 번호 / 등록번호", it.number, (v) => (it.number = v), { placeholder: "예: 12345678" })
      ));
      box.appendChild(elt("p", "hint", "※ 공개 사이트에는 ‘취득 년월일 + 성적’만 표시됩니다. 번호는 관리자 보관용."));
    },
  },
  { key: "contact", label: "연락처", type: "simple", toggle: true },
  { key: "theme", label: "테마 & 사이트", type: "theme" },
  { key: "password", label: "비밀번호", type: "password" },
];
const sectionByKey = (k) => SECTIONS.find((s) => s.key === k);

// ════════ 로그인 ════════
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("password").value }),
    });
    const json = await res.json();
    if (!res.ok) return (errEl.textContent = json.error || "로그인 실패");
    localStorage.setItem(TOKEN_KEY, json.token);
    startEditing();
  } catch {
    errEl.textContent = "서버에 연결할 수 없습니다.";
  }
});
document.getElementById("logoutBtn").addEventListener("click", () => showLogin());

// 편집 화면을 닫고 로그인으로 (토큰 제거)
function showLogin(message) {
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById("app").hidden = true;
  document.getElementById("loginView").hidden = false;
  const pw = document.getElementById("password");
  if (pw) pw.value = "";
  document.getElementById("loginError").textContent = message || "";
}

// ════════ 편집 시작 ════════
async function startEditing() {
  // 토큰이 유효할 때만 편집 화면 진입 (만료 시 저장이 실패하던 문제 방지)
  try {
    const v = await fetch("/api/verify", { headers: { Authorization: "Bearer " + token() } });
    if (!v.ok) return showLogin("세션이 만료되었습니다. 다시 로그인해 주세요.");
  } catch {
    return showLogin("서버에 연결할 수 없습니다.");
  }

  data = await (await fetch("/api/content")).json();
  ["tools", "experience", "works", "activities", "education", "certifications", "languages"].forEach((k) => {
    data[k] = data[k] || { items: [] };
    data[k].items = data[k].items || [];
  });
  data.about = data.about || {};
  data.contact = data.contact || {};
  data.theme = data.theme || {};
  data.hero = data.hero || {};
  data.site = data.site || {};
  // 프로필 사진: 단일 photo → photos 배열로 마이그레이션
  data.hero.photos = data.hero.photos || [];
  if (data.hero.photo && !data.hero.photos.length) data.hero.photos.push(data.hero.photo);
  delete data.hero.photo;
  delete data.skills; // 스킬은 Skills & Tools 로 통합

  document.getElementById("loginView").hidden = true;
  document.getElementById("app").hidden = false;
  renderSidebar();
  selectSection(activeKey);
}

function renderSidebar() {
  const nav = document.getElementById("sidebarNav");
  nav.innerHTML = "";
  SECTIONS.forEach((s) => {
    const btn = elt("button", "side-link" + (s.key === activeKey ? " active" : ""));
    btn.appendChild(document.createTextNode(s.label));
    // 배지: 리스트 항목 수 / 숨김 표시
    let badge = "";
    if (s.type === "list") {
      const n = (data[s.key].items || []).filter((it) => !it.hidden).length;
      badge = `<span class="side-link__badge">${n}</span>`;
    }
    if (s.toggle && data[s.key]?.hidden) badge = `<span class="side-link__badge off">숨김</span>`;
    if (badge) btn.insertAdjacentHTML("beforeend", badge);
    btn.addEventListener("click", () => selectSection(s.key));
    nav.appendChild(btn);
  });
}

function selectSection(key) {
  activeKey = key;
  renderSidebar();
  const sec = sectionByKey(key);
  const panel = document.getElementById("panel");
  panel.innerHTML = "";
  panel.scrollTo?.(0, 0);
  window.scrollTo(0, 0);

  const head = elt("div", "panel__head");
  const titleBox = elt("div");
  titleBox.appendChild(elt("div", "panel__title", sec.label));
  head.appendChild(titleBox);
  // 섹션 공개/숨김 스위치
  if (sec.toggle) {
    head.appendChild(
      switchToggle(
        () => !data[key].hidden,
        (v) => (data[key].hidden = !v),
        renderSidebar
      )
    );
  }
  panel.appendChild(head);

  if (sec.type === "hero") renderHero(panel);
  else if (sec.type === "simple") renderSimple(panel, key);
  else if (sec.type === "list") renderList(panel, sec);
  else if (sec.type === "theme") renderTheme(panel);
  else if (sec.type === "password") renderPassword(panel);
}

// ── 기본 정보 ──
function renderHero(panel) {
  const f = elt("div", "fields");
  f.appendChild(field("이름 (한글)", data.hero.name, (v) => (data.hero.name = v)));
  f.appendChild(field("이름 (영문)", data.hero.nameEn, (v) => (data.hero.nameEn = v)));
  f.appendChild(field("한 줄 소개 / 슬로건", data.hero.role, (v) => (data.hero.role = v), {
    textarea: true, rows: 2, hint: "*별표* 로 감싸면 강조색, 줄바꿈 가능",
  }));
  f.appendChild(field("해시태그 (공백으로 구분)", data.hero.tagline, (v) => (data.hero.tagline = v), { placeholder: "#주도성 #사람중심" }));
  f.appendChild(field("홈 도형 글자 (사진이 없을 때 표시되는 모노그램)", data.hero.monogram, (v) => (data.hero.monogram = v), { placeholder: "예: 허 / HM (비우면 영문 이니셜)" }));
  panel.appendChild(f);
  panel.appendChild(photosField(data.hero.photos));
}

// 프로필 사진: 여러 장 업로드 + 순서/메인 지정
function photosField(arr) {
  const wrap = elt("div", "photos-field");
  wrap.appendChild(elt("div", "subhead", "프로필 사진 (여러 장 가능 · 첫 번째가 메인)"));
  const grid = elt("div", "photos-grid");
  function rerender() {
    grid.innerHTML = "";
    arr.forEach((url, i) => {
      const cell = elt("div", "photo-cell" + (i === 0 ? " is-main" : ""));
      const img = elt("img");
      img.src = url;
      cell.appendChild(img);
      if (i === 0) cell.appendChild(elt("span", "photo-main", "메인"));
      const ctr = elt("div", "photo-ctr");
      if (i !== 0) {
        const main = elt("button", "mini-btn", "메인으로");
        main.type = "button";
        main.addEventListener("click", () => { arr.splice(0, 0, arr.splice(i, 1)[0]); rerender(); });
        ctr.appendChild(main);
      }
      const del = elt("button", "mini-btn mini-btn--del", "삭제");
      del.type = "button";
      del.addEventListener("click", () => { arr.splice(i, 1); rerender(); });
      ctr.appendChild(del);
      cell.appendChild(ctr);
      grid.appendChild(cell);
    });
  }
  const addBtn = elt("button", "upload-btn", "📎 사진 추가");
  addBtn.type = "button";
  const fi = elt("input");
  fi.type = "file";
  fi.accept = "image/*";
  fi.multiple = true;
  fi.style.display = "none";
  addBtn.addEventListener("click", () => fi.click());
  fi.addEventListener("change", async () => {
    addBtn.textContent = "업로드 중...";
    addBtn.disabled = true;
    for (const file of fi.files) {
      try { arr.push(await uploadFile(file)); } catch (e) { alert(e.message); }
    }
    rerender();
    addBtn.textContent = "📎 사진 추가";
    addBtn.disabled = false;
    fi.value = "";
  });
  rerender();
  wrap.appendChild(grid);
  wrap.appendChild(addBtn);
  wrap.appendChild(fi);
  return wrap;
}

// ── 소개 / 연락처 ──
function renderSimple(panel, key) {
  const f = elt("div", "fields");
  if (key === "about") {
    f.appendChild(field("섹션 제목", data.about.heading, (v) => (data.about.heading = v)));
    f.appendChild(field("소개 본문", data.about.body, (v) => (data.about.body = v), { textarea: true, rows: 6 }));
    f.appendChild(field("전문 분야 키워드 (쉼표로 구분)", (data.about.expertise || []).join(", "),
      (v) => (data.about.expertise = v.split(",").map((s) => s.trim()).filter(Boolean)),
      { hint: "소개 아래 칩으로 표시됩니다. 예: 채용, 평가제도 설계, 조직문화 기획" }));
  } else {
    f.appendChild(field("섹션 제목", data.contact.heading, (v) => (data.contact.heading = v)));
    f.appendChild(field("안내 문구", data.contact.message, (v) => (data.contact.message = v), {
      textarea: true, rows: 3, hint: "*별표* 강조, 줄바꿈 가능",
    }));
    f.appendChild(field("이메일", data.contact.email, (v) => (data.contact.email = v)));
    f.appendChild(field("전화번호", data.contact.phone, (v) => (data.contact.phone = v)));
    f.appendChild(field("GitHub URL (선택)", data.contact.github, (v) => (data.contact.github = v)));
  }
  panel.appendChild(f);
}

// ── 리스트 섹션 ──
function renderList(panel, sec) {
  const arr = data[sec.key].items;
  // 섹션 제목 편집
  const f = elt("div", "fields");
  f.appendChild(field("섹션 제목", data[sec.key].heading, (v) => (data[sec.key].heading = v)));
  panel.appendChild(f);

  const list = elt("div", "ed-list");
  panel.appendChild(list);

  function rerender() {
    list.innerHTML = "";
    arr.forEach((item, i) => {
      const card = elt("div", "ed-item" + (item.hidden ? " hidden-item" : ""));
      const bar = elt("div", "ed-item__bar");
      const name = elt("div", "ed-item__name", esc(sec.title(item)));
      const actions = elt("div", "ed-item__actions");
      actions.appendChild(
        switchToggle(() => !item.hidden, (v) => (item.hidden = !v), () => {
          card.classList.toggle("hidden-item", !!item.hidden);
          renderSidebar();
        })
      );
      const up = elt("button", "icon-btn", "↑");
      up.type = "button";
      up.disabled = i === 0;
      up.title = "위로";
      up.addEventListener("click", () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; rerender(); });
      const down = elt("button", "icon-btn", "↓");
      down.type = "button";
      down.disabled = i === arr.length - 1;
      down.title = "아래로";
      down.addEventListener("click", () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; rerender(); });
      const del = elt("button", "icon-btn icon-btn--del", "🗑");
      del.type = "button";
      del.title = "삭제";
      del.addEventListener("click", () => {
        if (confirm("이 항목을 삭제할까요?")) { arr.splice(i, 1); rerender(); renderSidebar(); }
      });
      actions.append(up, down, del);
      bar.appendChild(name);
      bar.appendChild(actions);

      const fields = elt("div", "ed-item__fields");
      sec.build(fields, item);
      fields.addEventListener("input", () => (name.textContent = sec.title(item)));

      card.appendChild(bar);
      card.appendChild(fields);
      list.appendChild(card);
    });
  }
  rerender();

  const add = elt("button", "add-btn", sec.addLabel);
  add.addEventListener("click", () => { arr.push(sec.def()); rerender(); renderSidebar(); });
  panel.appendChild(add);
}

// ── 테마 & 사이트 ──
function renderTheme(panel) {
  const f = elt("div", "fields");
  f.appendChild(field("상단 좌측 로고 (사이트 이름)", data.site.logo, (v) => (data.site.logo = v), { placeholder: "허민영", hint: "모든 페이지 네비게이션 왼쪽에 표시 (비우면 이름 사용)" }));
  f.appendChild(field("사이트 제목 (브라우저 탭)", data.site.title, (v) => (data.site.title = v)));
  f.appendChild(field("파비콘 이모지", data.site.favicon, (v) => (data.site.favicon = v), { placeholder: "🌿" }));
  const grid = elt("div", "row2");
  grid.appendChild(field("강조색", data.theme.primary || "#c2453b", (v) => (data.theme.primary = v), { type: "color" }));
  grid.appendChild(field("배경색", data.theme.background || "#f4ece4", (v) => (data.theme.background = v), { type: "color" }));
  f.appendChild(grid);
  const grid2 = elt("div", "row2");
  grid2.appendChild(field("카드색", data.theme.surface || "#fbf6f1", (v) => (data.theme.surface = v), { type: "color" }));
  grid2.appendChild(field("글자색", data.theme.text || "#2c2825", (v) => (data.theme.text = v), { type: "color" }));
  f.appendChild(grid2);
  panel.appendChild(f);
}

// ── 비밀번호 ──
function renderPassword(panel) {
  const f = elt("div", "fields");
  let cur = "", next = "";
  f.appendChild(field("현재 비밀번호", "", (v) => (cur = v), { type: "password" }));
  f.appendChild(field("새 비밀번호 (4자 이상)", "", (v) => (next = v), { type: "password" }));
  const err = elt("p", "error");
  const btn = elt("button", "tb-btn tb-btn--primary", "비밀번호 변경");
  btn.style.alignSelf = "flex-start";
  btn.addEventListener("click", async () => {
    err.textContent = "";
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ current: cur, next }),
      });
      const json = await res.json();
      if (!res.ok) return (err.textContent = json.error || "변경 실패");
      alert("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    } catch {
      err.textContent = "서버 오류";
    }
  });
  f.appendChild(btn);
  f.appendChild(err);
  panel.appendChild(f);
}

// ════════ 저장 ════════
document.getElementById("saveBtn").addEventListener("click", async () => {
  const status = document.getElementById("saveStatus");
  status.className = "topbar__status";
  status.textContent = "저장 중...";
  try {
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      showLogin("세션이 만료되어 저장하지 못했습니다. 다시 로그인 후 저장해 주세요.");
      return;
    }
    if (!res.ok) throw new Error();
    status.className = "topbar__status ok";
    status.textContent = "✓ 저장 완료";
    setTimeout(() => (status.textContent = ""), 3000);
  } catch {
    status.className = "topbar__status err";
    status.textContent = "저장 실패 — 네트워크를 확인해 주세요.";
  }
});

// HTML 이스케이프(사이드바/항목명용)
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 자동 로그인 (토큰 있으면 유효성 확인 후 편집 화면 진입)
if (token()) startEditing().catch(() => showLogin());
