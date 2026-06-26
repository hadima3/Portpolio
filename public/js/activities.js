// Activities: 대외활동 (필터 + 카드 그리드)
loadContent().then((data) => {
  setText("actHeading", data.activities?.heading || "대외활동");
  mountProjectGrid("actList", data.activities?.items || [], "activities");
  initMotion();
});
