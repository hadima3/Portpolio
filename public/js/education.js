// Education: 교육·세미나 카드 (사진 + 링크 지원 및 필터링)
loadContent().then((data) => {
  setText("eduHeading", data.education?.heading || "교육");
  mountEducationGrid("eduList", data.education?.items || []);
});

function mountEducationGrid(gridId, items) {
  const grid = document.getElementById(gridId);
  const filterEl = document.getElementById(gridId + "-filter");
  const indexed = (items || []).map((e, i) => [e, i]).filter(([e]) => !e.hidden);

  const providers = [...new Set(indexed.map(([e]) => e.provider).filter(Boolean))];
  const categories = [...new Set(indexed.map(([e]) => e.category).filter(Boolean))];

  let activeProvider = "all";
  let activeCat = "all";

  function chip(label, value, cur, group) {
    return `<button class="filter-chip ${cur === value ? "is-on" : ""}" data-group="${group}" data-value="${esc(value)}">${esc(label)}</button>`;
  }

  function renderFilter() {
    if (!filterEl) return;
    let html = "";
    if (providers.length > 1) {
      html += `<div class="filter-row"><span class="filter-label">업체명</span><div class="filter-chips">`;
      html += chip("전체", "all", activeProvider, "provider");
      html += providers.map((p) => chip(p, p, activeProvider, "provider")).join("");
      html += `</div></div>`;
    }
    if (categories.length > 1) {
      html += `<div class="filter-row"><span class="filter-label">분야</span><div class="filter-chips">`;
      html += chip("전체", "all", activeCat, "cat");
      html += categories.map((c) => chip(c, c, activeCat, "cat")).join("");
      html += `</div></div>`;
    }
    filterEl.innerHTML = html;

    filterEl.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.value;
        if (btn.dataset.group === "provider") activeProvider = v;
        else activeCat = v;
        renderFilter();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const filtered = indexed.filter(([e]) => {
      const okP = activeProvider === "all" || e.provider === activeProvider;
      const okC = activeCat === "all" || e.category === activeCat;
      return okP && okC;
    });

    grid.innerHTML = filtered.length
      ? filtered.map(([e, i]) => {
          const points = (e.points || [])
            .filter(Boolean)
            .map((p) => `<li>${esc(p)}</li>`)
            .join("");
          const meta = [e.provider, e.period].filter(Boolean).map(esc).join(" · ");
          const imgs = [e.image, ...(e.gallery || [])].filter(Boolean);
          const thumb = imgs.length
            ? `<button class="edu__thumb" data-edu="${i}" aria-label="사진 보기"><img src="${esc(imgs[0])}" alt="${esc(e.title)}" loading="lazy" />${imgs.length > 1 ? `<span class="edu__more">+${imgs.length - 1}</span>` : ""}</button>`
            : "";
          const links = (e.links || [])
            .filter((l) => l && l.url)
            .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)} ↗</a>`)
            .join("");
          return `
            <article class="edu reveal ${imgs.length ? "edu--media" : ""}">
              ${thumb}
              <div class="edu__content">
                <div class="edu__head">
                  <h3 class="edu__title">${esc(e.title)}</h3>
                  <span class="edu__meta">${meta}</span>
                </div>
                ${points ? `<ul class="edu__points">${points}</ul>` : ""}
                ${links ? `<div class="edu__links">${links}</div>` : ""}
              </div>
            </article>`;
        }).join("")
      : `<p class="empty-note">해당 조건의 항목이 없습니다.</p>`;

    // 썸네일 클릭 → 라이트박스(해당 교육의 사진 전체)
    grid.querySelectorAll(".edu__thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const e = indexed[Number(btn.dataset.edu)][0];
        openLightbox([e.image, ...(e.gallery || [])].filter(Boolean), 0);
      });
    });

    initMotion();
  }

  renderFilter();
  renderGrid();
}
