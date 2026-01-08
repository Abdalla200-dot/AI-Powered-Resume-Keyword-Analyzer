// === PDF text extraction using pdf.js ===
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let textContent = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const text = await page.getTextContent();
    const pageText = text.items.map(item => item.str).join(" ");
    textContent += " " + pageText;
  }
  return textContent;
}

// === Text + keyword helpers ===
function cleanText(str) {
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9+#+]/g, " ");
  str = str.replace(/\s+/g, " ").trim();
  return str;
}

function extractKeywordsFromJD(jdClean) {
  const multiPhrases = [
    "machine learning",
    "deep learning",
    "data analysis",
    "project management",
    "natural language processing",
    "sql server",
    "visual studio"
  ];

  let jdLower = jdClean.toLowerCase();
  const foundPhrases = new Set();

  multiPhrases.forEach(p => {
    if (jdLower.includes(p)) foundPhrases.add(p);
  });

  foundPhrases.forEach(p => {
    jdLower = jdLower.replace(p, " ");
  });

  const tokens = jdLower.split(" ").filter(t => t.length > 2);
  const set = new Set(tokens);
  foundPhrases.forEach(p => set.add(p));

  return Array.from(set).sort();
}

function findPresentAndMissing(resumeText, jdKeywords) {
  const present = new Set();
  const missing = new Set();
  const resumeLower = resumeText.toLowerCase();

  jdKeywords.forEach(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("\\b" + escaped + "\\b", "i");
    if (pattern.test(resumeLower)) {
      present.add(kw);
    } else {
      missing.add(kw);
    }
  });

  return { present, missing };
}

// === UI helpers ===
function setScore(score) {
  const bar = document.getElementById("scoreBarInner");
  bar.style.width = Math.max(0, Math.min(100, score)) + "%";
}

function setList(elementId, items) {
  const el = document.getElementById(elementId);
  if (!items.size) {
    el.textContent = "(none)";
    return;
  }
  el.textContent = Array.from(items).sort().join(", ");
}

function buildTips(score, missingCount, seniority) {
  const tips = [];
  if (score < 40) {
    tips.push("Your match score is low. Re‑read the job description and add skills you actually have.");
  } else if (score < 70) {
    tips.push("Your match score is decent. Try to naturally include a few more missing keywords.");
  } else {
    tips.push("Your match score is strong. Focus on clarity and achievements.");
  }

  if (missingCount > 0) {
    tips.push("Pick 3–5 missing keywords that genuinely describe you and add them to your bullet points.");
  }

  if (seniority === "junior") {
    tips.push("For junior roles, highlight projects and coursework that use these technologies.");
  } else if (seniority === "senior") {
    tips.push("For senior roles, emphasize leadership, ownership, and impact, not just tools.");
  }

  return tips;
}

function renderTips(tips) {
  const list = document.getElementById("tipsList");
  list.innerHTML = "";
  tips.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  });
}

// === Main click handler ===
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("resumeFile");
  const jdTextArea = document.getElementById("jobDesc");
  const seniority = document.getElementById("seniority").value;

  if (!fileInput.files[0]) {
    alert("Please upload a resume PDF first.");
    return;
  }
  if (!jdTextArea.value.trim()) {
    alert("Please paste a job description.");
    return;
  }

  document.getElementById("summary").textContent = "Analyzing résumé and job description…";
  setScore(0);
  document.getElementById("present").textContent = "";
  document.getElementById("missing").textContent = "";
  renderTips([]);

  try {
    const resumeRaw = await extractTextFromPDF(fileInput.files[0]);
    const jdRaw = jdTextArea.value;

    const resumeClean = cleanText(resumeRaw);
    const jdClean = cleanText(jdRaw);

    const jdKeywords = extractKeywordsFromJD(jdClean);
    const { present, missing } = findPresentAndMissing(resumeClean, jdKeywords);

    const total = jdKeywords.length || 1;
    const score = Math.round((present.size * 10000) / total) / 100;

    document.getElementById("summary").textContent =
      `Match score: ${score}% · JD keywords: ${jdKeywords.length} · Present: ${present.size} · Missing: ${missing.size}`;

    setScore(score);
    setList("present", present);
    setList("missing", missing);

    const tips = buildTips(score, missing.size, seniority);
    renderTips(tips);
  } catch (err) {
    console.error(err);
    document.getElementById("summary").textContent =
      "Error reading PDF. Open the console to see details.";
  }
});
