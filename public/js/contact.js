// Contact
loadContent().then((data) => {
  setText("contactEyebrow", data.contact?.heading || "Contact");
  document.getElementById("contactMessage").innerHTML = highlight(data.contact?.message || "");

  const links = [];
  if (data.contact?.email)
    links.push(`<a href="mailto:${esc(data.contact.email)}">✉&nbsp; ${esc(data.contact.email)}</a>`);
  if (data.contact?.phone)
    links.push(`<a href="tel:${esc(data.contact.phone.replace(/[^0-9+]/g, ""))}">☎&nbsp; ${esc(data.contact.phone)}</a>`);
  if (data.contact?.github)
    links.push(`<a href="${esc(data.contact.github)}" target="_blank" rel="noopener">GitHub ↗</a>`);
  document.getElementById("contactLinks").innerHTML = links.join("");

  initMotion();
});
