// 상세 페이지: works / activities 공용. 구성: 개요 → 진행 과정 → 주요 성과 → 미디어
loadContent().then((data) => {
  const params = new URLSearchParams(location.search);
  const type = params.get("type") === "activities" ? "activities" : "works";
  const id = Number(params.get("id"));
  const items = data[type]?.items || [];
  const w = items[id];
  const root = document.getElementById("detail");

  const backHref = type === "activities" ? "/activities" : "/projects";
  const backLabel = type === "activities" ? "대외활동 목록" : "프로젝트 목록";

  if (!w || w.hidden) {
    root.innerHTML = `<a class="detail__back" href="${backHref}"><span class="arrow">←</span> ${backLabel}</a>
      <p style="margin-top:2rem">해당 항목을 찾을 수 없습니다.</p>`;
    return;
  }

  document.title = `${w.title} · ${data.site?.title || "포트폴리오"}`;

  const meta = [];
  if (w.org) meta.push(`<span class="org">${esc(w.org)}</span>`);
  if (w.period) meta.push(`<span class="period">${esc(w.period)}</span>`);
  if (w.contribution) meta.push(`<span class="contrib">${esc(w.contribution)}</span>`);
  const metaHTML = meta.join('<span class="dot">·</span>');

  const cover = w.cover || w.image;
  const coverHTML = cover ? `<img class="detail__cover reveal" src="${esc(cover)}" alt="${esc(w.title)}" />` : "";
  const summaryHTML = w.summary ? `<p class="detail__summary reveal">${esc(w.summary)}</p>` : "";

  const block = (label, inner) => `<div class="detail__block reveal"><h2>${label}</h2>${inner}</div>`;

  const overviewHTML = w.description ? block("개요", `<p class="detail__desc">${esc(w.description)}</p>`) : "";
  const approachHTML = w.approach ? block("진행 과정 &amp; 접근", `<p class="detail__desc">${esc(w.approach)}</p>`) : "";

  const results = (w.results || []).map((r) => `<li>${esc(r)}</li>`).join("");
  const resultsHTML = results ? block("주요 성과", `<ul class="detail__results">${results}</ul>`) : "";

  const video = videoEmbed(w.video);
  const videoHTML = video ? block("영상", video) : "";

  const gallery = (w.gallery || []).filter(Boolean);
  const galleryHTML = gallery.length
    ? block("갤러리", `<div class="gallery">${gallery.map((g) => `<img src="${esc(g)}" alt="${esc(w.title)} 이미지" data-zoom loading="lazy" />`).join("")}</div>`)
    : "";

  const links = (w.links || []).filter((l) => l && l.url);
  const linksHTML = links.length
    ? block("관련 링크", `<div class="detail__links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)} <span class="arrow">↗</span></a>`).join("")}</div>`)
    : "";

  const tags = (w.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const tagsHTML = tags ? `<div class="detail__tags">${tags}</div>` : "";

  root.innerHTML = `
    <a class="detail__back" href="${backHref}"><span class="arrow">←</span> ${backLabel}</a>
    <div class="detail__meta reveal">${metaHTML}</div>
    <h1 class="detail__title reveal">${esc(w.title)}</h1>
    ${summaryHTML}
    ${coverHTML}
    ${overviewHTML}
    ${approachHTML}
    ${resultsHTML}
    ${videoHTML}
    ${galleryHTML}
    ${linksHTML}
    ${tagsHTML}`;

  root.querySelectorAll("[data-zoom]").forEach((img, i) => {
    img.addEventListener("click", () => openLightbox(gallery, i));
  });

  initMotion();
});
