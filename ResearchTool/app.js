const DEFAULT_DRIVE_SOURCE = "https://drive.google.com/drive/folders/1TQJ9XxopmK39JtSLD1iOrLbSphHA9SdH?usp=sharing";

const stages = [
  { id: "define", label: "Define", description: "Research question, topic refinement, and gap finding." },
  { id: "discover", label: "Discover", description: "Paper search, related work, and citation graph exploration." },
  { id: "read", label: "Read", description: "PDF reading, annotation, summarization, and extraction." },
  { id: "organize", label: "Organize", description: "Reference management, notes, and knowledge base." },
  { id: "collect", label: "Collect", description: "Surveys, interviews, datasets, and field data." },
  { id: "analyze", label: "Analyze", description: "Statistics, qualitative coding, ML, and text analysis." },
  { id: "visualize", label: "Visualize", description: "Charts, scientific figures, maps, and diagrams." },
  { id: "write", label: "Write", description: "Drafting, collaboration, grammar, LaTeX, and editing." },
  { id: "verify", label: "Verify", description: "Citation reliability, integrity checks, and reproducibility." },
  { id: "publish", label: "Publish", description: "Preprints, repositories, profiles, and dissemination." }
];

const finderOptions = [
  { id: "lit-review", title: "Find and review papers", description: "Literature search, paper maps, screening, and citation checking.", stages: ["discover", "read", "organize", "verify"], stack: ["Semantic Scholar", "Connected Papers", "Elicit", "Zotero", "Scite"] },
  { id: "survey", title: "Collect survey data", description: "Build forms, collect responses, export data, and prepare analysis.", stages: ["collect", "analyze"], stack: ["Google Forms", "Qualtrics", "REDCap", "Excel / Google Sheets", "Jamovi"] },
  { id: "stats", title: "Analyze quantitative data", description: "Statistics, modeling, reproducible notebooks, and reporting.", stages: ["analyze", "visualize"], stack: ["RStudio", "Jupyter", "JASP", "Jamovi", "Datawrapper"] },
  { id: "qual", title: "Analyze qualitative data", description: "Transcripts, coding, themes, memoing, and synthesis.", stages: ["analyze", "organize", "write"], stack: ["Whisper", "Taguette", "NVivo", "Obsidian", "Google Docs"] },
  { id: "write-paper", title: "Write a manuscript", description: "Citation management, drafting, editing, and submission preparation.", stages: ["organize", "write", "verify", "publish"], stack: ["Zotero", "NotebookLM", "Overleaf", "Writefull", "OSF"] },
  { id: "integrity", title: "Check credibility", description: "Citation context, retractions, peer discussion, and reproducibility.", stages: ["verify", "publish"], stack: ["Scite", "PubPeer", "Retraction Watch", "OSF", "Zenodo"] }
];

const presets = [
  { id: "general", title: "General Research", description: "Balanced toolkit for most academic workflows.", field: "General" },
  { id: "biomedical", title: "Biomedical", description: "Clinical, biomedical, and life science workflows.", field: "Biomedical" },
  { id: "computer-science", title: "Computer Science", description: "Papers, code, datasets, reproducible notebooks.", field: "Computer Science" },
  { id: "social-science", title: "Social Sciences", description: "Survey, interviews, mixed methods, and statistics.", field: "Social Sciences" },
  { id: "humanities", title: "Humanities", description: "Sources, annotation, archives, qualitative interpretation.", field: "Humanities" },
  { id: "engineering", title: "Engineering", description: "Technical literature, figures, data, and reproducibility.", field: "Engineering" }
];

const stacks = [
  { title: "Starter Literature Review", description: "Nhanh chóng tìm, đọc, lưu và kiểm tra paper.", tools: ["Semantic Scholar", "Connected Papers", "Elicit", "Zotero", "Scite"] },
  { title: "Systematic Review", description: "Screening, extraction, PRISMA flow, and evidence synthesis.", tools: ["PubMed", "Rayyan", "Elicit", "Zotero", "PRISMA Flow Diagram"] },
  { title: "Quantitative Research", description: "Survey to statistical analysis and reporting.", tools: ["Google Forms", "RStudio", "Jamovi", "JASP", "Datawrapper"] },
  { title: "Qualitative Research", description: "Transcribe, code, synthesize themes, and write findings.", tools: ["Whisper", "Taguette", "NVivo", "Obsidian", "Google Docs"] },
  { title: "AI-Assisted Writing", description: "Source-grounded drafting with citation control.", tools: ["Zotero", "NotebookLM", "Overleaf", "Writefull", "Scite"] },
  { title: "Publication Prep", description: "Integrity checks, repositories, DOI, and open science.", tools: ["Scite", "PubPeer", "OSF", "Zenodo", "ORCID"] }
];

const defaultTools = [
  tool("Semantic Scholar", "Search engine", "Free", ["discover"], ["General", "Computer Science", "Biomedical"], "Beginner", "Public web", "https://www.semanticscholar.org/", "AI-powered academic search for papers, authors, citations, and related work.", ["Find relevant papers quickly", "Trace citation trails"], ["Coverage varies by field"], ["Google Scholar", "OpenAlex"], ["Literature", "AI", "Citation"]),
  tool("Google Scholar", "Search engine", "Free", ["discover"], ["General"], "Beginner", "Public web", "https://scholar.google.com/", "Broad scholarly search across articles, books, theses, and citation trails.", ["Broad discovery", "Backward citation search"], ["No rich filtering or public API"], ["Semantic Scholar", "OpenAlex"], ["Literature", "Citation"]),
  tool("PubMed", "Search engine", "Free", ["discover"], ["Biomedical"], "Beginner", "Public web", "https://pubmed.ncbi.nlm.nih.gov/", "Biomedical and life science literature search maintained by the National Library of Medicine.", ["Biomedical literature", "Clinical queries"], ["Domain-specific"], ["Semantic Scholar", "Europe PMC"], ["Biomedical", "Medicine"]),
  tool("OpenAlex", "Research database", "Free", ["discover", "verify"], ["General", "Computer Science"], "Advanced", "Public API", "https://openalex.org/", "Open catalog of scholarly works, authors, institutions, concepts, and sources.", ["Open bibliometric data", "API-based analysis"], ["Needs technical skill for API use"], ["Crossref", "Semantic Scholar"], ["Open data", "API"]),
  tool("Connected Papers", "Citation graph", "Freemium", ["discover"], ["General"], "Beginner", "Public web", "https://www.connectedpapers.com/", "Visual graph for exploring papers related by citation and semantic similarity.", ["Map a research area", "Find seminal papers"], ["Free plan has limits"], ["Research Rabbit", "Litmaps"], ["Graph", "Discovery"]),
  tool("Research Rabbit", "Citation graph", "Free", ["discover"], ["General"], "Beginner", "Account cloud", "https://www.researchrabbit.ai/", "Collection-based discovery tool for mapping papers, authors, and related work.", ["Track paper collections", "Discover related authors"], ["Requires account"], ["Connected Papers", "Litmaps"], ["Graph", "Collections"]),
  tool("Elicit", "AI assistant", "Freemium", ["define", "discover", "read"], ["General", "Social Sciences", "Biomedical"], "Intermediate", "Cloud AI", "https://elicit.com/", "AI assistant for literature review, paper screening, extraction, and evidence synthesis.", ["Screen papers", "Extract study details", "Generate review tables"], ["Check citations manually before relying on outputs"], ["Consensus", "SciSpace"], ["AI", "Review", "Extraction"]),
  tool("Consensus", "AI assistant", "Freemium", ["define", "discover", "verify"], ["General", "Biomedical", "Social Sciences"], "Beginner", "Cloud AI", "https://consensus.app/", "Evidence-focused search that summarizes findings from scientific literature.", ["Answer evidence questions", "Find supporting papers"], ["May oversimplify nuanced findings"], ["Elicit", "Scite"], ["AI", "Evidence"]),
  tool("SciSpace", "AI assistant", "Freemium", ["read", "write"], ["General", "Engineering", "Computer Science"], "Beginner", "Cloud AI", "https://typeset.io/", "Paper reading assistant with explanations, summaries, and academic writing support.", ["Understand difficult papers", "Explain methods"], ["Do not treat explanations as final interpretation"], ["Explainpaper", "NotebookLM"], ["AI", "PDF"]),
  tool("NotebookLM", "AI notebook", "Free", ["read", "organize", "write"], ["General", "Humanities", "Social Sciences"], "Beginner", "Cloud AI", "https://notebooklm.google.com/", "Source-grounded notebook for understanding uploaded materials and generating summaries.", ["Synthesize uploaded sources", "Create briefing notes"], ["Source upload may not fit sensitive data policies"], ["Obsidian", "ChatGPT"], ["AI", "Notes"]),
  tool("Zotero", "Reference manager", "Free", ["organize", "write"], ["General", "Humanities", "Social Sciences"], "Beginner", "Local-first", "https://www.zotero.org/", "Open-source reference manager for collecting, organizing, annotating, and citing sources.", ["Citation management", "PDF annotation", "Word and Docs citations"], ["Cloud storage has quota limits"], ["Mendeley", "EndNote", "JabRef"], ["Citation", "PDF", "Open-source"]),
  tool("Mendeley", "Reference manager", "Freemium", ["organize", "write"], ["General"], "Beginner", "Account cloud", "https://www.mendeley.com/", "Reference manager and academic PDF library with citation tools.", ["PDF library", "Citation workflows"], ["Less open than Zotero"], ["Zotero", "EndNote"], ["Citation", "PDF"]),
  tool("JabRef", "Reference manager", "Open-source", ["organize", "write"], ["Computer Science", "Engineering"], "Intermediate", "Local-first", "https://www.jabref.org/", "BibTeX-focused reference manager for LaTeX-heavy writing workflows.", ["BibTeX libraries", "LaTeX papers"], ["Less beginner-friendly"], ["Zotero", "Paperpile"], ["BibTeX", "Open-source"]),
  tool("Google Forms", "Survey tool", "Free", ["collect"], ["General", "Social Sciences"], "Beginner", "Cloud", "https://forms.google.com/", "Simple survey and form collection for lightweight research data gathering.", ["Quick surveys", "Class projects"], ["Limited advanced survey logic"], ["Microsoft Forms", "Qualtrics"], ["Survey", "Forms"]),
  tool("Qualtrics", "Survey tool", "Paid", ["collect"], ["Social Sciences", "Business", "Biomedical"], "Intermediate", "Cloud", "https://www.qualtrics.com/", "Advanced survey platform for academic, market, and institutional research.", ["Complex surveys", "Panels", "Experimental designs"], ["Often requires institutional license"], ["REDCap", "Google Forms"], ["Survey", "Enterprise"]),
  tool("REDCap", "Data collection", "Institutional", ["collect"], ["Biomedical"], "Intermediate", "Institutional", "https://www.project-redcap.org/", "Secure web platform for research data capture, common in clinical studies.", ["Clinical research", "Sensitive data capture"], ["Institutional access required"], ["Qualtrics", "KoboToolbox"], ["Clinical", "Secure"]),
  tool("KoboToolbox", "Data collection", "Freemium", ["collect"], ["Social Sciences", "Humanities"], "Beginner", "Cloud", "https://www.kobotoolbox.org/", "Data collection platform for field research, humanitarian work, and surveys.", ["Field data collection", "Offline mobile forms"], ["Advanced analysis happens elsewhere"], ["ODK", "Google Forms"], ["Fieldwork", "Survey"]),
  tool("RStudio", "Statistical software", "Free", ["analyze", "visualize"], ["General", "Social Sciences", "Biomedical"], "Advanced", "Local", "https://posit.co/download/rstudio-desktop/", "IDE for R-based statistics, reproducible analysis, modeling, and visualization.", ["Reproducible statistics", "Modeling", "ggplot2 figures"], ["Requires coding skill"], ["JASP", "Jamovi", "Python"], ["R", "Statistics"]),
  tool("Jupyter", "Computational notebook", "Open-source", ["analyze", "visualize"], ["Computer Science", "Engineering", "General"], "Advanced", "Local or cloud", "https://jupyter.org/", "Notebook environment for Python, R, Julia, computation, and reproducible analysis.", ["Python analysis", "ML experiments", "Reproducible notebooks"], ["Notebook discipline required for reproducibility"], ["RStudio", "Google Colab"], ["Python", "Notebook"]),
  tool("Jamovi", "Statistical software", "Free", ["analyze"], ["Social Sciences", "General"], "Beginner", "Local", "https://www.jamovi.org/", "Beginner-friendly statistical software with a spreadsheet-like interface.", ["T-tests", "ANOVA", "Regression"], ["Less flexible than R"], ["JASP", "SPSS"], ["Statistics", "Beginner"]),
  tool("JASP", "Statistical software", "Free", ["analyze"], ["Social Sciences", "General"], "Beginner", "Local", "https://jasp-stats.org/", "Statistical analysis software focused on classical and Bayesian methods.", ["Bayesian analysis", "Common statistics"], ["Not a full programming environment"], ["Jamovi", "RStudio"], ["Statistics", "Bayesian"]),
  tool("NVivo", "Qualitative analysis", "Paid", ["analyze"], ["Social Sciences", "Humanities"], "Intermediate", "Local or cloud", "https://lumivero.com/products/nvivo/", "Qualitative and mixed-methods coding, categorization, and analysis platform.", ["Interview coding", "Thematic analysis"], ["Paid and can be heavy for small projects"], ["Taguette", "ATLAS.ti"], ["Qualitative", "Coding"]),
  tool("Taguette", "Qualitative analysis", "Open-source", ["analyze"], ["Social Sciences", "Humanities"], "Beginner", "Local or self-hosted", "https://www.taguette.org/", "Open-source qualitative coding tool for interviews, notes, and text materials.", ["Small qualitative projects", "Open-source coding"], ["Fewer enterprise features"], ["NVivo", "QualCoder"], ["Qualitative", "Open-source"]),
  tool("Obsidian", "Knowledge base", "Freemium", ["organize", "write"], ["Humanities", "General"], "Intermediate", "Local-first", "https://obsidian.md/", "Markdown-based knowledge base for linked notes, literature notes, and synthesis.", ["Zettelkasten", "Research notes", "Idea synthesis"], ["Citation workflows require plugins"], ["Notion", "Logseq"], ["Notes", "Markdown"]),
  tool("RAWGraphs", "Visualization", "Free", ["visualize"], ["General", "Humanities", "Social Sciences"], "Beginner", "Browser", "https://www.rawgraphs.io/", "Open web tool for turning tabular data into publication-friendly visualizations.", ["Nonstandard charts", "Quick visual exploration"], ["Final polish may need design software"], ["Datawrapper", "Flourish"], ["Charts", "Open-source"]),
  tool("Datawrapper", "Visualization", "Freemium", ["visualize"], ["General", "Social Sciences"], "Beginner", "Cloud", "https://www.datawrapper.de/", "Fast chart, map, and table publishing tool for clear data communication.", ["Charts", "Maps", "Tables"], ["Branding/export limits on free plans"], ["Flourish", "RAWGraphs"], ["Charts", "Maps"]),
  tool("BioRender", "Scientific illustration", "Freemium", ["visualize"], ["Biomedical"], "Beginner", "Cloud", "https://www.biorender.com/", "Scientific figure builder for life sciences, methods diagrams, and graphical abstracts.", ["Life science figures", "Graphical abstracts"], ["Licensing and export limits matter"], ["Inkscape", "Illustrator"], ["Figures", "Biology"]),
  tool("Overleaf", "Writing", "Freemium", ["write", "publish"], ["Computer Science", "Engineering", "General"], "Intermediate", "Cloud", "https://www.overleaf.com/", "Collaborative LaTeX editor for technical papers, theses, and journal submissions.", ["LaTeX manuscripts", "Collaborative writing"], ["Paid plan needed for some collaboration features"], ["Google Docs", "Authorea"], ["LaTeX", "Collaboration"]),
  tool("Google Docs", "Writing", "Free", ["write"], ["General", "Social Sciences", "Humanities"], "Beginner", "Cloud", "https://docs.google.com/", "Collaborative writing environment for drafts, comments, and team editing.", ["Collaborative drafts", "Supervisor feedback"], ["Citation workflows need add-ons"], ["Microsoft Word", "Overleaf"], ["Writing", "Collaboration"]),
  tool("Writefull", "Writing assistant", "Freemium", ["write"], ["General"], "Beginner", "Cloud AI", "https://www.writefull.com/", "Academic language feedback and phrase suggestions trained around scholarly writing.", ["Academic phrasing", "Language improvement"], ["Do not outsource argument quality"], ["Paperpal", "Grammarly"], ["Editing", "Academic"]),
  tool("Paperpal", "Writing assistant", "Freemium", ["write"], ["General"], "Beginner", "Cloud AI", "https://paperpal.com/", "Academic writing assistant for grammar, clarity, manuscript checks, and submission prep.", ["Manuscript checks", "Language editing"], ["May not understand field-specific nuance"], ["Writefull", "Grammarly"], ["Editing", "Manuscript"]),
  tool("Scite", "Citation checker", "Freemium", ["verify", "discover"], ["General", "Biomedical"], "Intermediate", "Cloud", "https://scite.ai/", "Citation context tool that helps identify supporting, contrasting, and mentioning citations.", ["Citation reliability", "Evidence checking"], ["Citation labels are aids, not final judgments"], ["Consensus", "PubPeer"], ["Citation", "Reliability"]),
  tool("PubPeer", "Integrity check", "Free", ["verify"], ["Biomedical", "General"], "Beginner", "Public web", "https://pubpeer.com/", "Post-publication peer discussion platform for checking concerns and community comments.", ["Check paper concerns", "Publication discussion"], ["Not every paper has comments"], ["Retraction Watch", "Scite"], ["Integrity", "Peer review"]),
  tool("Retraction Watch", "Integrity check", "Free", ["verify"], ["General", "Biomedical"], "Beginner", "Public web", "https://retractionwatch.com/", "Database and reporting around retractions, corrections, and publication integrity issues.", ["Retraction checks", "Integrity monitoring"], ["Coverage is retraction-focused"], ["PubPeer", "Crossref"], ["Integrity", "Retractions"]),
  tool("OSF", "Repository", "Free", ["publish", "verify"], ["General", "Social Sciences"], "Intermediate", "Cloud", "https://osf.io/", "Open platform for preregistration, project sharing, files, protocols, and reproducibility.", ["Preregistration", "Open materials", "Project archive"], ["Requires thoughtful organization"], ["Zenodo", "Figshare"], ["Open science", "Repository"]),
  tool("Zenodo", "Repository", "Free", ["publish"], ["General", "Computer Science", "Engineering"], "Beginner", "Cloud", "https://zenodo.org/", "Repository for datasets, software, papers, and research outputs with DOI support.", ["Dataset DOI", "Software release archive"], ["Not a project management workspace"], ["OSF", "Figshare"], ["DOI", "Repository"])
];

const state = {
  tools: [...defaultTools],
  query: "",
  sort: "recommended",
  activeFinder: "",
  activePreset: "",
  filters: {
    stage: new Set(),
    pricing: new Set(),
    field: new Set(),
    difficulty: new Set()
  },
  saved: new Set(JSON.parse(localStorage.getItem("researchHubSaved") || "[]")),
  compare: new Set(JSON.parse(localStorage.getItem("researchHubCompare") || "[]"))
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function tool(name, type, pricing, stage, field, difficulty, privacy, url, description, bestFor, limitations, alternatives, tags) {
  return { name, type, pricing, stage, field, difficulty, privacy, url, description, bestFor, limitations, alternatives, tags };
}

function normalizeTool(item) {
  return {
    name: item.name || "Unnamed Tool",
    type: item.type || "Tool",
    pricing: item.pricing || "Unknown",
    stage: toArray(item.stage || "discover"),
    field: toArray(item.field || "General"),
    difficulty: item.difficulty || "Intermediate",
    privacy: item.privacy || "Unknown",
    url: item.url || "#",
    description: item.description || "No description provided.",
    bestFor: toArray(item.bestFor || item.best_for || []),
    limitations: toArray(item.limitations || []),
    alternatives: toArray(item.alternatives || []),
    tags: toArray(item.tags || [])
  };
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function uniqueValues(key) {
  return [...new Set(state.tools.flatMap((toolItem) => toArray(toolItem[key])))].filter(Boolean).sort();
}

function labelForStage(value) {
  return stages.find((stage) => stage.id === value)?.label || value;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window.researchHubToast);
  window.researchHubToast = setTimeout(() => element.classList.remove("show"), 2600);
}

function parseDriveSource(input) {
  const value = input.trim();
  if (!value) return { id: "", kind: "empty" };
  const fileMatch = value.match(/\/file\/d\/([^/]+)/);
  const folderMatch = value.match(/\/folders\/([^/?]+)/);
  const idParam = value.match(/[?&]id=([^&]+)/);
  if (fileMatch) return { id: fileMatch[1], kind: "file" };
  if (folderMatch) return { id: folderMatch[1], kind: "folder" };
  if (idParam) return { id: idParam[1], kind: "file" };
  return { id: value, kind: "unknown" };
}

function connectDrive() {
  const source = $("#databaseInput").value.trim();
  if (!source) {
    toast("Hãy nhập Drive file ID, folder ID, hoặc sharing URL.");
    return;
  }

  localStorage.setItem("researchHubDriveSource", source);

  let urlToOpen = source;
  if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
    const parsed = parseDriveSource(source);
    if (parsed.kind === 'folder') {
      urlToOpen = `https://drive.google.com/drive/folders/${parsed.id}`;
    } else if (parsed.kind === 'file') {
      urlToOpen = `https://drive.google.com/file/d/${parsed.id}/view`;
    } else {
      urlToOpen = `https://drive.google.com/open?id=${source}`;
    }
  }

  $("#databaseStatus").textContent = `Đang mở link Google Drive: ${urlToOpen}`;
  toast("Đang mở trang Google Drive...");
  window.open(urlToOpen, '_blank');
}

function renderQuickActions() {
  $("#quickActions").innerHTML = stages.map((stage) => `
    <button class="chip ${state.filters.stage.has(stage.id) ? "active" : ""}" data-stage-chip="${stage.id}" type="button">${stage.label}</button>
  `).join("");

  $$("[data-stage-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.filters.stage, button.dataset.stageChip);
      state.activeFinder = "";
      renderAll();
      rebuildFilters();
    });
  });
}

function renderFinder() {
  $("#finderGrid").innerHTML = finderOptions.map((option) => `
    <button class="finder-card ${state.activeFinder === option.id ? "active" : ""}" data-finder="${option.id}" type="button">
      <strong>${option.title}</strong>
      <p>${option.description}</p>
    </button>
  `).join("");

  $$("[data-finder]").forEach((button) => {
    button.addEventListener("click", () => {
      const option = finderOptions.find((item) => item.id === button.dataset.finder);
      state.activeFinder = option.id;
      clearFilterSets();
      option.stages.forEach((stage) => state.filters.stage.add(stage));
      renderRecommendation(option);
      renderAll();
      rebuildFilters();
      $("#tools").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderRecommendation(option) {
  const element = $("#recommendation");
  if (!option) {
    element.classList.remove("show");
    element.innerHTML = "";
    return;
  }
  element.classList.add("show");
  element.innerHTML = `
    <p class="eyebrow">Recommended path</p>
    <h3>${option.title}</h3>
    <p>${option.description}</p>
    <ol>${option.stack.map((item) => `<li>${item}</li>`).join("")}</ol>
  `;
}

function renderWorkflow() {
  $("#workflowGrid").innerHTML = stages.map((stage) => `
    <button class="workflow-card ${state.filters.stage.has(stage.id) ? "active" : ""}" data-workflow="${stage.id}" type="button">
      <strong>${stage.label}</strong>
      <span>${stage.description}</span>
    </button>
  `).join("");

  $$("[data-workflow]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.filters.stage, button.dataset.workflow);
      state.activeFinder = "";
      renderAll();
      rebuildFilters();
    });
  });
}

function renderPresets() {
  $("#presetGrid").innerHTML = presets.map((preset) => `
    <button class="preset-card ${state.activePreset === preset.id ? "active" : ""}" data-preset="${preset.id}" type="button">
      <strong>${preset.title}</strong>
      <p>${preset.description}</p>
    </button>
  `).join("");

  $$("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets.find((item) => item.id === button.dataset.preset);
      state.activePreset = state.activePreset === preset.id ? "" : preset.id;
      state.filters.field.clear();
      if (state.activePreset) state.filters.field.add(preset.field);
      renderAll();
      rebuildFilters();
      $("#tools").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderStacks() {
  $("#stackGrid").innerHTML = stacks.map((stack) => `
    <article class="stack-card">
      <h3>${stack.title}</h3>
      <p>${stack.description}</p>
      <ul>${stack.tools.map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function rebuildFilters() {
  renderFilterGroup("#stageFilters", "stage", stages.map((stage) => stage.id), labelForStage);
  renderFilterGroup("#pricingFilters", "pricing", uniqueValues("pricing"));
  renderFilterGroup("#fieldFilters", "field", uniqueValues("field"));
  renderFilterGroup("#difficultyFilters", "difficulty", uniqueValues("difficulty"));
}

function renderFilterGroup(container, key, values, labeler = (value) => value) {
  const selected = state.filters[key];
  $(container).innerHTML = values.map((value) => `
    <label class="filter-option">
      <input type="checkbox" data-filter="${key}" value="${value}" ${selected.has(value) ? "checked" : ""}>
      <span>${labeler(value)}</span>
    </label>
  `).join("");

  $(`${container}`).querySelectorAll("[data-filter]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      state.activeFinder = "";
      state.activePreset = "";
      renderAll();
    });
  });
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function clearFilterSets() {
  Object.values(state.filters).forEach((set) => set.clear());
}

function getRelevanceScore(toolItem, query) {
  if (!query) return 0;

  const q = query.toLowerCase();
  const name = toolItem.name.toLowerCase();
  const type = toolItem.type.toLowerCase();
  const desc = toolItem.description.toLowerCase();
  const tags = toolItem.tags.map(t => t.toLowerCase());

  let score = 0;

  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 50;
  else if (name.includes(q)) score += 30;

  if (type.includes(q)) score += 20;
  if (tags.some(t => t.includes(q))) score += 15;
  if (desc.includes(q)) score += 10;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const haystack = [name, type, desc, ...tags].join(" ");
    const allTokensMatch = tokens.every(token => haystack.includes(token));
    if (allTokensMatch) score += 5;
  }

  return score;
}

function filteredTools() {
  const query = state.query.toLowerCase().trim();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const result = state.tools.filter((toolItem) => {
    const haystack = [
      toolItem.name,
      toolItem.type,
      toolItem.pricing,
      toolItem.difficulty,
      toolItem.privacy,
      toolItem.description,
      ...toolItem.stage,
      ...toolItem.field,
      ...toolItem.tags,
      ...toolItem.bestFor
    ].join(" ").toLowerCase();

    // Advanced tokenized matching: all terms must be present in haystack for a match
    const matchesQuery = !query || queryTokens.every(token => haystack.includes(token));

    const matchesStage = !state.filters.stage.size || toolItem.stage.some((stage) => state.filters.stage.has(stage));
    const matchesPricing = !state.filters.pricing.size || state.filters.pricing.has(toolItem.pricing);
    const matchesField = !state.filters.field.size || toolItem.field.some((field) => state.filters.field.has(field));
    const matchesDifficulty = !state.filters.difficulty.size || state.filters.difficulty.has(toolItem.difficulty);

    return matchesQuery && matchesStage && matchesPricing && matchesField && matchesDifficulty;
  });

  return sortTools(result, query);
}

function sortTools(items, query = "") {
  const rankPricing = { Free: 1, "Open-source": 2, Freemium: 3, Institutional: 4, Paid: 5 };
  const rankDifficulty = { Beginner: 1, Intermediate: 2, Advanced: 3 };
  const copy = [...items];

  if (query) {
    copy.sort((a, b) => getRelevanceScore(b, query) - getRelevanceScore(a, query));
  } else {
    if (state.sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "free") copy.sort((a, b) => (rankPricing[a.pricing] || 9) - (rankPricing[b.pricing] || 9));
    if (state.sort === "difficulty") copy.sort((a, b) => (rankDifficulty[a.difficulty] || 9) - (rankDifficulty[b.difficulty] || 9));
    if (state.sort === "recommended") copy.sort((a, b) => scoreTool(b) - scoreTool(a));
  }
  return copy;
}

function scoreTool(toolItem) {
  let score = 0;
  if (["Free", "Open-source"].includes(toolItem.pricing)) score += 2;
  if (toolItem.difficulty === "Beginner") score += 1;
  if (toolItem.tags.includes("Open-source")) score += 1;
  if (state.saved.has(toolItem.name)) score += 1;
  return score;
}

function renderTools() {
  const tools = filteredTools();
  $("#toolCount").textContent = `${tools.length} tools`;
  $("#toolGrid").innerHTML = tools.map(toolCard).join("") || emptyState("Không có tool phù hợp với bộ lọc hiện tại.");
  bindToolActions();
}

function toolCard(toolItem) {
  const saved = state.saved.has(toolItem.name);
  const compared = state.compare.has(toolItem.name);
  return `
    <article class="tool-card">
      <div class="tool-card-header">
        <div class="tool-icon" aria-hidden="true">${escapeHtml(toolItem.name.slice(0, 1).toUpperCase())}</div>
        <div class="tool-title">
          <strong>${escapeHtml(toolItem.name)}</strong>
          <div class="badge-row">
            <span class="badge accent">${escapeHtml(toolItem.pricing)}</span>
            <span class="badge">${escapeHtml(toolItem.type)}</span>
            <span class="badge blue">${escapeHtml(toolItem.difficulty)}</span>
          </div>
        </div>
      </div>
      <p>${escapeHtml(toolItem.description)}</p>
      <div class="tag-row">
        ${toolItem.tags.slice(0, 5).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="tool-actions">
        <a class="tool-action primary" href="${escapeAttribute(toolItem.url)}" target="_blank" rel="noopener">Open</a>
        <button class="tool-action" data-detail="${escapeAttribute(toolItem.name)}" type="button">Details</button>
        <button class="tool-action" data-save="${escapeAttribute(toolItem.name)}" type="button">${saved ? "Saved" : "Save"}</button>
        <button class="tool-action" data-compare="${escapeAttribute(toolItem.name)}" type="button">${compared ? "Comparing" : "Compare"}</button>
      </div>
    </article>
  `;
}

function bindToolActions() {
  $$("[data-save]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.saved, button.dataset.save);
      localStorage.setItem("researchHubSaved", JSON.stringify([...state.saved]));
      renderAll();
      toast(state.saved.has(button.dataset.save) ? "Đã lưu vào toolkit." : "Đã bỏ lưu.");
    });
  });

  $$("[data-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.compare;
      if (state.compare.has(name)) state.compare.delete(name);
      else {
        if (state.compare.size >= 4) {
          toast("Chỉ so sánh tối đa 4 tool cùng lúc.");
          return;
        }
        state.compare.add(name);
      }
      localStorage.setItem("researchHubCompare", JSON.stringify([...state.compare]));
      renderAll();
    });
  });

  $$("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openToolModal(button.dataset.detail));
  });
}

function renderSaved() {
  const tools = state.tools.filter((toolItem) => state.saved.has(toolItem.name));
  $("#savedCount").textContent = `${tools.length} saved`;
  $("#savedGrid").innerHTML = tools.map(toolCard).join("") || emptyState("Chưa có tool nào được lưu.");
}

function renderCompare() {
  const tools = [...state.compare].map((name) => state.tools.find((toolItem) => toolItem.name === name)).filter(Boolean);
  if (!tools.length) {
    $("#compareTable").innerHTML = `<div class="empty-state">Chọn 2-4 tool bằng nút Compare trong directory để tạo bảng so sánh.</div>`;
    return;
  }

  const rows = [
    ["Type", (toolItem) => toolItem.type],
    ["Pricing", (toolItem) => toolItem.pricing],
    ["Stage", (toolItem) => toolItem.stage.map(labelForStage).join(", ")],
    ["Field", (toolItem) => toolItem.field.join(", ")],
    ["Difficulty", (toolItem) => toolItem.difficulty],
    ["Privacy", (toolItem) => toolItem.privacy],
    ["Best for", (toolItem) => toolItem.bestFor.join(", ") || "Not specified"],
    ["Limitations", (toolItem) => toolItem.limitations.join(", ") || "Not specified"],
    ["Alternatives", (toolItem) => toolItem.alternatives.join(", ") || "Not specified"]
  ];

  $("#compareTable").innerHTML = `
    <table class="compare-table">
      <thead>
        <tr><th>Criteria</th>${tools.map((toolItem) => `<th>${escapeHtml(toolItem.name)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(([label, getter]) => `<tr><th>${label}</th>${tools.map((toolItem) => `<td>${escapeHtml(getter(toolItem))}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function openToolModal(name) {
  const toolItem = state.tools.find((item) => item.name === name);
  if (!toolItem) return;
  $("#modalType").textContent = `${toolItem.type} · ${toolItem.pricing}`;
  $("#modalTitle").textContent = toolItem.name;
  $("#modalBody").innerHTML = `
    <p>${escapeHtml(toolItem.description)}</p>
    ${modalList("Best For", toolItem.bestFor)}
    ${modalList("Limitations", toolItem.limitations)}
    ${modalList("Alternatives", toolItem.alternatives)}
    <div class="modal-section">
      <h3>Metadata</h3>
      <div class="badge-row">
        <span class="badge accent">${escapeHtml(toolItem.pricing)}</span>
        <span class="badge">${escapeHtml(toolItem.type)}</span>
        <span class="badge blue">${escapeHtml(toolItem.difficulty)}</span>
        <span class="badge warning">${escapeHtml(toolItem.privacy)}</span>
      </div>
    </div>
    <div class="tool-actions">
      <a class="tool-action primary" href="${escapeAttribute(toolItem.url)}" target="_blank" rel="noopener">Open tool</a>
    </div>
  `;
  $("#toolModal").showModal();
}

function modalList(title, items) {
  if (!items.length) return "";
  return `
    <div class="modal-section">
      <h3>${title}</h3>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderAll() {
  renderQuickActions();
  renderFinder();
  renderWorkflow();
  renderPresets();
  renderTools();
  renderSaved();
  renderCompare();
}

function init() {
  $("#databaseInput").value = localStorage.getItem("researchHubDriveSource") || DEFAULT_DRIVE_SOURCE;
  $("#globalSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTools();
  });
  $("#sortTools").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderTools();
  });
  $("#connectDrive").addEventListener("click", connectDrive);
  $("#clearFilters").addEventListener("click", () => {
    clearFilterSets();
    state.activeFinder = "";
    state.activePreset = "";
    renderRecommendation(null);
    renderAll();
    rebuildFilters();
  });
  $("#clearCompare").addEventListener("click", () => {
    state.compare.clear();
    localStorage.setItem("researchHubCompare", "[]");
    renderAll();
  });
  $("#themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("researchHubTheme", document.body.classList.contains("dark") ? "dark" : "light");
  });
  $("#closeModal").addEventListener("click", () => $("#toolModal").close());
  $("#toolModal").addEventListener("click", (event) => {
    if (event.target.id === "toolModal") $("#toolModal").close();
  });

  var savedTheme = localStorage.getItem("researchHubTheme");
  var wantsDark;
  if (savedTheme) {
    wantsDark = savedTheme === "dark";
  } else {
    // Chưa từng chỉnh riêng ở trang này: bám theo lựa chọn theme chung của app (localStorage 'user-theme',
    // cùng logic auto 18h-6h với script.js) để không bị lệch theme khi chuyển từ Dashboard/Science sang đây.
    var sharedTheme = localStorage.getItem("user-theme");
    var hour = new Date().getHours();
    wantsDark = sharedTheme === "dark" || ((sharedTheme === "auto" || !sharedTheme) && (hour >= 18 || hour < 6));
  }
  if (wantsDark) document.body.classList.add("dark");

  renderStacks();
  rebuildFilters();
  renderAll();
}

init();
