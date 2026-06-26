// About: 소개 + 전문분야 칩 + Skills&Tools + 경력 + 자격/어학
loadContent().then((data) => {
  setText("aboutHeading", data.about?.heading || "소개");
  setText("aboutBody", data.about?.body);

  // 전문 분야 칩
  const expertise = (data.about?.expertise || []).filter(Boolean);
  document.getElementById("expertise").innerHTML = expertise
    .map((e) => `<span class="chip">${esc(e)}</span>`)
    .join("");

  // Skills & Tools (도구 카드: 아이콘 + 숙련도 + 설명)
  if (visible(data.tools) && (data.tools.items || []).some((t) => !t.hidden)) {
    setText("toolsHeading", data.tools.heading || "Skills & Tools");
    document.getElementById("toolsList").innerHTML = data.tools.items
      .filter((t) => !t.hidden)
      .map((t) => toolCard(t))
      .join("");
  } else removeSection("sec-tools");

  // Experience
  if (visible(data.experience) && (data.experience.items || []).some((e) => !e.hidden)) {
    setText("experienceHeading", data.experience.heading || "Experience");
    document.getElementById("experienceList").innerHTML = data.experience.items
      .filter((e) => !e.hidden)
      .map(
        (e) => `
        <div class="exp reveal">
          <div class="exp__period">${esc(e.period)}</div>
          <div>
            <div class="exp__org">${esc(e.org)}</div>
            <div class="exp__role">${esc(e.role)}</div>
            <div class="exp__desc">${esc(e.desc)}</div>
          </div>
        </div>`
      )
      .join("");
  } else removeSection("sec-exp");

  // Certifications / Languages (공개: 날짜 + 이름)
  const certOn = visible(data.certifications) && (data.certifications.items || []).some((c) => !c.hidden);
  const langOn = visible(data.languages) && (data.languages.items || []).some((c) => !c.hidden);
  if (certOn) {
    setText("certHeading", data.certifications.heading || "자격증");
    document.getElementById("certList").innerHTML = credHTML(data.certifications.items);
  } else removeSection("sec-cert");
  if (langOn) {
    setText("langHeading", data.languages.heading || "어학");
    document.getElementById("langList").innerHTML = credHTML(data.languages.items);
  } else removeSection("sec-lang");
  if (!certOn && !langOn) removeSection("sec-cred");

  initMotion();
});

function credHTML(items) {
  return (items || [])
    .filter((c) => !c.hidden)
    .map((c) => `<div class="cred reveal"><span class="cred__date">${esc(c.date)}</span><span class="cred__name">${esc(c.name)}</span></div>`)
    .join("");
}

function removeSection(id) {
  document.getElementById(id)?.remove();
}
