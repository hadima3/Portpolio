// 공통 모듈: 데이터 로드(캐시), 테마, 네비/푸터, 모션, 헬퍼

let _contentPromise = null;
function loadContent() {
  if (!_contentPromise) _contentPromise = fetch("/api/content").then((r) => r.json());
  return _contentPromise;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// *강조* → <span class="hl">강조</span>
function highlight(s) {
  return esc(s).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function visible(obj) {
  return obj && !obj.hidden;
}

function applyTheme(theme = {}) {
  const root = document.documentElement.style;
  if (theme.primary) root.setProperty("--primary", theme.primary);
  if (theme.background) root.setProperty("--bg", theme.background);
  if (theme.surface) root.setProperty("--surface", theme.surface);
  if (theme.text) {
    root.setProperty("--text", theme.text);
    root.setProperty("--ink", theme.text);
  }
}

function setFavicon(emoji) {
  if (!emoji) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = "data:image/svg+xml," + encodeURIComponent(svg);
}

// 네비게이션 (숨김 섹션은 메뉴에서도 제외)
function navHTML(active, data) {
  const name = data.site?.logo || data.hero?.name || "Portfolio";
  const hasItems = (s) => visible(data[s]) && (data[s].items || []).some((x) => !x.hidden);
  const items = [["/", "Home"]];
  items.push(["/about", "About"]);
  if (hasItems("works")) items.push(["/projects", "Projects"]);
  if (hasItems("activities")) items.push(["/activities", "Activities"]);
  if (hasItems("education")) items.push(["/education", "Education"]);
  if (visible(data.contact)) items.push(["/contact", "Contact"]);
  const links = items
    .map(([href, label]) => `<a href="${href}" class="${active === label ? "is-active" : ""}">${label}</a>`)
    .join("");
  return `
    <div class="nav__inner">
      <a href="/" class="nav__logo">${esc(name)}</a>
      <nav class="nav__links">${links}<a href="/admin" class="nav__admin">관리자</a></nav>
    </div>`;
}

// 프로젝트/활동 카드. i = 원본 인덱스, type = works|activities
function projectCard(w, i, type = "works") {
  const cover = w.cover || w.image;
  const media = cover
    ? `<img src="${esc(cover)}" alt="${esc(w.title)}" loading="lazy" />`
    : "";
  const num = String(i + 1).padStart(2, "0");
  const meta = [];
  if (w.org) meta.push(`<span class="work__org">${esc(w.org)}</span>`);
  if (w.period) meta.push(`<span class="work__period">${esc(w.period)}</span>`);
  const tags = (w.tags || [])
    .slice(0, 3)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join("");
  const desc = w.summary || w.description || "";
  return `
    <a class="work reveal" href="/project?type=${type}&id=${i}">
      <div class="work__media"><span class="work__num">${num}</span>${media}</div>
      <div class="work__body">
        <div class="work__meta">${meta.join("")}</div>
        <h3 class="work__title">${esc(w.title)}</h3>
        <p class="work__desc">${esc(desc)}</p>
        <span class="work__more">자세히 보기 <span class="arrow">→</span></span>
        <div class="work__tags">${tags}</div>
      </div>
    </a>`;
}

// 필터 가능한 카드 그리드 (회사별 · 업무별 태그)
function mountProjectGrid(gridId, items, type) {
  const grid = document.getElementById(gridId);
  const filterEl = document.getElementById(gridId + "-filter");
  const indexed = (items || []).map((w, i) => [w, i]).filter(([w]) => !w.hidden);

  const companies = [...new Set(indexed.map(([w]) => w.org).filter(Boolean))];
  const categories = [...new Set(indexed.map(([w]) => w.category).filter(Boolean))];

  let activeCompany = "all";
  let activeCat = "all";

  function chip(label, value, cur, group) {
    return `<button class="filter-chip ${cur === value ? "is-on" : ""}" data-group="${group}" data-value="${esc(value)}">${esc(label)}</button>`;
  }

  function renderFilter() {
    if (!filterEl) return;
    let html = "";
    if (companies.length > 1) {
      const labelText = type === "activities" ? "소속" : "회사";
      html += `<div class="filter-row"><span class="filter-label">${labelText}</span><div class="filter-chips">`;
      html += chip("전체", "all", activeCompany, "company");
      html += companies.map((c) => chip(c, c, activeCompany, "company")).join("");
      html += `</div></div>`;
    }
    if (categories.length > 1) {
      const labelText = type === "activities" ? "분야" : "업무";
      html += `<div class="filter-row"><span class="filter-label">${labelText}</span><div class="filter-chips">`;
      html += chip("전체", "all", activeCat, "cat");
      html += categories.map((c) => chip(c, c, activeCat, "cat")).join("");
      html += `</div></div>`;
    }
    filterEl.innerHTML = html;
    filterEl.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.value;
        if (btn.dataset.group === "company") activeCompany = v;
        else activeCat = v;
        renderFilter();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const filtered = indexed.filter(([w]) => {
      const okC = activeCompany === "all" || w.org === activeCompany;
      const okT = activeCat === "all" || w.category === activeCat;
      return okC && okT;
    });
    grid.innerHTML = filtered.length
      ? filtered.map(([w, i]) => projectCard(w, i, type)).join("")
      : `<p class="empty-note">해당 조건의 항목이 없습니다.</p>`;
    initMotion();
  }

  renderFilter();
  renderGrid();
}

function videoEmbed(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `<div class="embed"><iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe></div>`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `<div class="embed"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" allowfullscreen></iframe></div>`;
  return `<video class="detail__video" src="${esc(url)}" controls></video>`;
}

// 도구 숙련도 점(5단계)
function levelDots(level) {
  const n = Math.max(0, Math.min(5, Number(level) || 0));
  let dots = "";
  for (let i = 1; i <= 5; i++) dots += `<span class="dot ${i <= n ? "on" : ""}"></span>`;
  return `<span class="tool__dots" title="숙련도 ${n}/5">${dots}</span>`;
}

// 도구 카드 (아이콘 + 이름 + 숙련도 + 설명)
function toolCard(t) {
  const icon = t.icon
    ? `<img class="tool__icon" src="${esc(t.icon)}" alt="${esc(t.name)}" loading="lazy" />`
    : `<span class="tool__icon tool__icon--ph">${esc((t.name || "·").charAt(0))}</span>`;
  return `
    <div class="tool reveal">
      ${icon}
      <div class="tool__body">
        <div class="tool__top"><span class="tool__name">${esc(t.name)}</span>${levelDots(t.level)}</div>
        <div class="tool__desc">${esc(t.desc)}</div>
      </div>
    </div>`;
}

// ── 라이트박스 (여러 장 넘겨보기) ──
function openLightbox(images, start = 0) {
  images = (images || []).filter(Boolean);
  if (!images.length) return;
  let idx = Math.max(0, Math.min(images.length, start));
  const box = document.createElement("div");
  box.className = "lightbox";
  const multi = images.length > 1;
  box.innerHTML = `
    <button class="lb__close" aria-label="닫기">✕</button>
    ${multi ? '<button class="lb__nav lb__prev" aria-label="이전">‹</button>' : ""}
    <figure class="lb__stage"><img class="lb__img" alt="" /></figure>
    ${multi ? '<button class="lb__nav lb__next" aria-label="다음">›</button>' : ""}
    ${multi ? `<div class="lb__count"></div>` : ""}
    ${multi ? `<div class="lb__thumbs"></div>` : ""}`;
  const imgEl = box.querySelector(".lb__img");
  const countEl = box.querySelector(".lb__count");
  const thumbsEl = box.querySelector(".lb__thumbs");
  if (multi) {
    thumbsEl.innerHTML = images.map((s, i) => `<img src="${esc(s)}" data-i="${i}" alt="" />`).join("");
  }
  function paint() {
    imgEl.src = images[idx];
    if (multi) {
      countEl.textContent = `${idx + 1} / ${images.length}`;
      thumbsEl.querySelectorAll("img").forEach((t, i) => t.classList.toggle("on", i === idx));
    }
  }
  const go = (d) => { idx = (idx + d + images.length) % images.length; paint(); };
  const close = () => { box.remove(); document.removeEventListener("keydown", onKey); };
  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" && multi) go(-1);
    else if (e.key === "ArrowRight" && multi) go(1);
  }
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.classList.contains("lb__stage")) close();
    else if (e.target.classList.contains("lb__close")) close();
    else if (e.target.classList.contains("lb__prev")) go(-1);
    else if (e.target.classList.contains("lb__next")) go(1);
    else if (e.target.dataset.i != null) { idx = Number(e.target.dataset.i); paint(); }
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(box);
  paint();
}

// ── 모션: 스크롤 리빌 + 스킬바 ──
let _io;
function initMotion() {
  if (!_io) {
    _io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            const fill = e.target.querySelector?.("[data-fill]");
            if (fill) fill.style.width = fill.dataset.fill + "%";
            if (e.target.hasAttribute?.("data-fill")) e.target.style.width = e.target.dataset.fill + "%";
            _io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }
  document.querySelectorAll(".reveal:not(.in), [data-fill]").forEach((el) => _io.observe(el));
  // 리빌에 순차 지연(stagger)
  document.querySelectorAll(".stagger > .reveal").forEach((el, i) => {
    el.style.transitionDelay = Math.min(i * 0.07, 0.5) + "s";
  });
}

// 페이지 공통 초기화
loadContent()
  .then((data) => {
    const base = data.site?.title || "포트폴리오";
    const sub = document.body.dataset.subtitle;
    document.title = sub ? `${sub} · ${base}` : base;
    applyTheme(data.theme);
    setFavicon(data.site?.favicon);

    const nav = document.querySelector("[data-nav]");
    if (nav) nav.innerHTML = navHTML(document.body.dataset.page, data);

    const footer = document.querySelector("[data-footer]");
    if (footer) {
      footer.innerHTML = `
        <div class="footer__inner">
          <span>© ${new Date().getFullYear()} ${esc(data.hero?.name || "")}</span>
          <span>${esc(data.hero?.role || "")}</span>
        </div>`;
    }

    // 네비 스크롤 상태
    const navEl = document.querySelector(".nav");
    if (navEl) {
      const onScroll = () => navEl.classList.toggle("scrolled", window.scrollY > 20);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    initMotion();
  })
  .catch(() => {});
