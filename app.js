const fileInput = document.getElementById("fileInput");
const reader = document.getElementById("reader");
const tocEl = document.getElementById("toc");
const metaEl = document.getElementById("meta");
const searchInput = document.getElementById("searchInput");

const toggleThemeBtn = document.getElementById("toggleTheme");
const fontPlusBtn = document.getElementById("fontPlus");
const fontMinusBtn = document.getElementById("fontMinus");

let fullText = "";
let sections = []; // {title, startIndex, endIndex}
let activeIndex = -1;

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

/**
 * قرارداد فهرست:
 * هر خطی که با # شروع شود، عنوان بخش است.
 */
function parseSections(text){
  const lines = text.split(/\r?\n/);
  const titles = [];
  let idx = 0;

  for (let i=0; i<lines.length; i++){
    const line = lines[i];
    if (line.trim().startsWith("#")){
      const title = line.replace(/^#+\s*/, "").trim() || "بدون عنوان";
      titles.push({ title, pos: idx }); // pos = offset in whole text
    }
    idx += line.length + 1; // + newline
  }

  if (titles.length === 0){
    // اگر عنوانی نبود، یک بخش کلی بساز
    return [{ title: "متن", startIndex: 0, endIndex: text.length }];
  }

  const out = [];
  for (let i=0; i<titles.length; i++){
    const start = titles[i].pos;
    const end = (i < titles.length - 1) ? titles[i+1].pos : text.length;
    out.push({ title: titles[i].title, startIndex: start, endIndex: end });
  }
  return out;
}

function renderTOC(){
  tocEl.innerHTML = "";
  sections.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "item" + (i === activeIndex ? " active" : "");
    div.textContent = s.title;
    div.onclick = () => showSection(i);
    tocEl.appendChild(div);
  });
}

function setMeta(name){
  const size = fullText ? `${Math.round(fullText.length/1024)} KB` : "";
  metaEl.textContent = name ? `فایل: ${name}  •  اندازه متن: ${size}` : "";
}

function showSection(i){
  activeIndex = i;
  renderTOC();

  const s = sections[i];
  const raw = fullText.slice(s.startIndex, s.endIndex).trim();

  // تبدیل عنوان‌های # به تیتر نمایشی
  const html = escapeHtml(raw).replace(/^#\s*(.*)$/gm, "<h2>$1</h2>");
  reader.innerHTML = html;

  // ذخیره آخرین بخش
  localStorage.setItem("lastSectionIndex", String(i));

  // اسکرول به بالا
  reader.scrollTop = 0;

  // اعمال جستجو (اگر چیزی تایپ شده)
  if (searchInput.value.trim()) highlightSearch(searchInput.value.trim());
}

function highlightSearch(q){
  // برای سادگی: روی HTML تولیدشده کار می‌کنیم
  // (اگر متن خیلی بزرگ باشد، بهتر است روش بهینه‌تر استفاده شود)
  const term = q.trim();
  if (!term){
    // بازگردانی همان بخش بدون highlight
    showSection(activeIndex >= 0 ? activeIndex : 0);
    return;
  }

  // فقط در بخش فعلی هایلایت کن
  const s = sections[activeIndex >= 0 ? activeIndex : 0];
  const raw = fullText.slice(s.startIndex, s.endIndex).trim();
  let html = escapeHtml(raw).replace(/^#\s*(.*)$/gm, "<h2>$1</h2>");

  // highlight ساده (حساس به حروف نیست، ولی فارسی معمولاً تفاوت ندارد)
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "g");
  html = html.replace(re, (m) => `<mark>${m}</mark>`);

  reader.innerHTML = html;
}

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  fullText = text;

  sections = parseSections(fullText);

  setMeta(file.name);
  localStorage.setItem("lastFileName", file.name);

  // آخرین بخش خوانده شده
  const saved = parseInt(localStorage.getItem("lastSectionIndex") || "0", 10);
  const idx = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), sections.length-1) : 0;

  showSection(idx);
});

searchInput.addEventListener("input", () => {
  if (!fullText) return;
  if (activeIndex < 0) activeIndex = 0;
  highlightSearch(searchInput.value);
});

// theme
function loadTheme(){
  const t = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", t === "dark");
}
toggleThemeBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
loadTheme();

// font size
function setFontSize(px){
  px = Math.max(14, Math.min(px, 32));
  document.documentElement.style.setProperty("--fontSize", px + "px");
  localStorage.setItem("fontSize", String(px));
}
function loadFont(){
  const px = parseInt(localStorage.getItem("fontSize") || "18", 10);
  setFontSize(px);
}
fontPlusBtn.addEventListener("click", () => {
  const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--fontSize"));
  setFontSize(current + 2);
});
fontMinusBtn.addEventListener("click", () => {
  const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--fontSize"));
  setFontSize(current - 2);
});
loadFont();
