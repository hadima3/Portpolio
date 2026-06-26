// Home: 히어로 + 대표 프로젝트
loadContent().then((data) => {
  setText("heroName", data.hero?.name);
  setText("heroNameEn", data.hero?.nameEn);
  document.getElementById("heroRole").innerHTML = highlight(data.hero?.role || "");

  const tags = (data.hero?.tagline || "").split(/\s+/).map((t) => t.trim()).filter(Boolean);
  document.getElementById("heroTags").innerHTML = tags
    .map((t) => `<span class="hero__tag">${esc(t)}</span>`)
    .join("");

  // 히어로 비주얼: 사진(여러 장 가능). 메인=첫 장, 클릭 시 라이트박스로 전체 보기
  const visualEl = document.getElementById("heroVisual");
  const photos = (data.hero?.photos || []).filter(Boolean);
  if (!photos.length && data.hero?.photo) photos.push(data.hero.photo); // 구버전 호환
  if (photos.length) {
    const more = photos.length > 1 ? `<span class="hero__more">+${photos.length - 1}</span>` : "";
    visualEl.innerHTML = `
      <button class="hero__portrait-btn" aria-label="사진 ${photos.length}장 보기">
        <img class="hero__portrait" src="${esc(photos[0])}" alt="${esc(data.hero.name)}" />
        ${more}
        <span class="hero__zoom">⤢ 사진 ${photos.length}장</span>
      </button>`;
    visualEl.querySelector(".hero__portrait-btn").addEventListener("click", () => openLightbox(photos, 0));
  } else {
    const fallback = (data.hero?.nameEn || data.hero?.name || "").trim().charAt(0).toUpperCase() || "·";
    const mono = (data.hero?.monogram || "").trim() || fallback;
    visualEl.innerHTML = `<div class="hero__visual--empty"><span class="mono">${esc(mono)}</span></div>`;
  }

  // 숨기지 않은 프로젝트만, 상위 3개
  const items = (data.works?.items || []).map((w, i) => [w, i]).filter(([w]) => !w.hidden);
  document.getElementById("featured-list").innerHTML = items
    .slice(0, 3)
    .map(([w, i]) => projectCard(w, i))
    .join("");

  initMotion();
});
