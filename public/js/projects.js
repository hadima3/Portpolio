// Projects: 회사별·업무별 필터 + 카드 그리드
loadContent().then((data) => {
  setText("worksHeading", data.works?.heading || "프로젝트");
  mountProjectGrid("worksList", data.works?.items || [], "works");
  initMotion();
});
