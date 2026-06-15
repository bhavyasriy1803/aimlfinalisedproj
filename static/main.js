/* ============================================================
   BRANCHIQ — MAIN JS
   Tab system · AJAX prediction · Gauge · Detailed Analysis
   ============================================================ */

/* ── Constants ───────────────────────────────────────────── */
const SCORE_MIN   = 27.53;
const SCORE_MAX   = 56.94;
const GAUGE_TOTAL = 452.39;   // 2 * pi * radius(72)

/* ── DOM ─────────────────────────────────────────────────── */
const tabBtns        = document.querySelectorAll('.tab-btn');
const tabContents    = document.querySelectorAll('.tab-content');
const progressDots   = document.querySelectorAll('.progress-dot');
const form           = document.getElementById('prediction-form');
const predictBtn     = document.getElementById('predict-btn');
const btnText        = document.getElementById('btn-text');
const btnSpinner     = document.getElementById('btn-spinner');
const sampleBtn      = document.getElementById('sample-btn');
const clearBtn       = document.getElementById('clear-btn');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultCard        = document.getElementById('result-card');
const detailedAnalysis  = document.getElementById('detailed-analysis');
const toast          = document.getElementById('toast');

/* ============================================================
   TAB SYSTEM
   ============================================================ */
function switchTab(index) {
  const i = parseInt(index);
  tabBtns.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.tab) === i));
  tabContents.forEach(c  => c.classList.toggle('active', parseInt(c.dataset.tabContent) === i));
  progressDots.forEach((dot, idx) => {
    dot.classList.remove('active', 'done');
    if (idx + 1 === i)    dot.classList.add('active');
    else if (idx + 1 < i) dot.classList.add('done');
  });
}

tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
progressDots.forEach((dot, idx) => dot.addEventListener('click', () => switchTab(idx + 1)));
document.querySelectorAll('.tab-next-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.querySelectorAll('.tab-prev-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ============================================================
   SAMPLE DATA
   ============================================================ */
sampleBtn.addEventListener('click', async () => {
  sampleBtn.disabled = true;
  sampleBtn.textContent = 'Loading...';
  try {
    const res  = await fetch('/api/sample-data');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    Object.entries(data).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (el) el.value = typeof val === 'number' ? parseFloat(val.toFixed(4)) : val;
    });
    showToast('Sample data loaded from the training dataset.', 'success');
  } catch (err) {
    showToast('Could not load sample data: ' + err.message, 'error');
  } finally {
    sampleBtn.disabled = false;
    sampleBtn.textContent = 'Load Sample Data';
  }
});

/* ============================================================
   CLEAR FORM
   ============================================================ */
clearBtn.addEventListener('click', () => {
  document.querySelectorAll('.field-input').forEach(el => { el.value = ''; });
  showToast('All fields cleared. Empty fields will use dataset averages.', 'info');
});

/* ============================================================
   FORM SUBMISSION
   ============================================================ */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Loading state
  predictBtn.disabled = true;
  btnText.style.display    = 'none';
  btnSpinner.style.display = 'inline-block';

  // Collect values
  const payload = {};
  document.querySelectorAll('.field-input').forEach(el => {
    const v = el.value.trim();
    if (v !== '') payload[el.name] = parseFloat(v);
  });

  try {
    const res  = await fetch('/api/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prediction failed');

    renderResult(data);
    renderDetailedAnalysis(data);

  } catch (err) {
    showToast('Prediction error: ' + err.message, 'error');
  } finally {
    predictBtn.disabled = false;
    btnText.style.display    = 'inline';
    btnSpinner.style.display = 'none';
  }
});

/* ============================================================
   RENDER RESULT (right panel)
   ============================================================ */
function renderResult(result) {
  const { prediction, tier, description, score_percent, score_mean, model_r2, percentile } = result;

  // Show card, hide placeholder
  resultPlaceholder.style.display = 'none';
  resultCard.style.display        = 'block';

  // Animated score counter
  animateCounter(document.getElementById('gauge-score-text'), 0, prediction, 1200);

  // Gauge fill (with brief delay so transition fires)
  setTimeout(() => {
    const pct  = clamp(score_percent, 0, 100);
    const fill = document.getElementById('score-ring-fill');
    fill.style.strokeDashoffset = GAUGE_TOTAL * (1 - pct / 100);
    fill.style.stroke = tierColor(tier);
  }, 60);

  // Tier badge
  const badge = document.getElementById('tier-badge');
  badge.textContent = tier;
  badge.className   = 'tier-badge ' + slugify(tier);

  document.getElementById('tier-description').textContent = description;

  // Score breakdown rows
  document.getElementById('score-value').textContent = prediction.toFixed(2);

  const diff = prediction - score_mean;
  const vsEl = document.getElementById('score-vs-avg');
  vsEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2) + ' pts';
  vsEl.style.color = diff >= 0 ? '#15803D' : '#B91C1C';

  document.getElementById('score-pct').textContent = percentile + 'th percentile';


  // Score bar marker
  setTimeout(() => {
    document.getElementById('score-marker').style.left = clamp(score_percent, 2, 98) + '%';
  }, 60);

  // Scroll to results on mobile
  if (window.innerWidth < 960) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ============================================================
   RENDER DETAILED ANALYSIS (full-width section)
   ============================================================ */
function renderDetailedAnalysis(result) {
  detailedAnalysis.style.display = 'block';

  // -- Model Performance --


  // -- Tier Distribution --
  const tierBarsEl = document.getElementById('da-tier-bars');
  tierBarsEl.innerHTML = '';
  const tierMeta = {
    'Excellent':     { cls: 'excellent' },
    'Good':          { cls: 'good'       },
    'Below Average': { cls: 'below-avg'  },
    'Poor':          { cls: 'poor'       },
  };
  const total = result.n_samples;
  Object.entries(result.tier_dist).forEach(([tier, count]) => {
    const pct = (count / total * 100).toFixed(1);
    const cls = tierMeta[tier]?.cls || '';
    const highlighted = tier === result.tier ? ' highlighted' : '';
    tierBarsEl.insertAdjacentHTML('beforeend', `
      <div class="tier-bar-row${highlighted}">
        <span class="tier-bar-label">${tier}</span>
        <div class="tier-bar-track">
          <div class="tier-bar-fill ${cls}" data-w="${pct}"></div>
        </div>
        <span class="tier-bar-count">${count} &nbsp;(${pct}%)</span>
      </div>
    `);
  });
  // Animate bars
  requestAnimationFrame(() => requestAnimationFrame(() => {
    tierBarsEl.querySelectorAll('.tier-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  }));

  // -- Branch Positioning --
  const aboveMean = result.prediction >= result.score_mean;
  const diffFromMean = (result.prediction - result.score_mean).toFixed(2);
  const diffFromBest = (result.score_max - result.prediction).toFixed(2);
  const diffFromWorst = (result.prediction - result.score_min).toFixed(2);

  document.getElementById('da-positioning').innerHTML = `
    <div class="position-row">
      <span class="position-label">Predicted Score</span>
      <span class="position-value">${result.prediction}</span>
    </div>
    <div class="position-row">
      <span class="position-label">Dataset Average</span>
      <span class="position-value">${result.score_mean}</span>
    </div>
    <div class="position-row">
      <span class="position-label">Dataset Std. Dev.</span>
      <span class="position-value">${result.score_std}</span>
    </div>
    <div class="position-row">
      <span class="position-label">Percentile Rank</span>
      <span class="position-value">${result.percentile}th</span>
    </div>
    <div class="position-row">
      <span class="position-label">Better Than</span>
      <span class="position-value ${aboveMean ? 'positive' : 'negative'}">${result.percentile}% of branches</span>
    </div>
    <div class="position-row">
      <span class="position-label">vs. Average</span>
      <span class="position-value ${aboveMean ? 'positive' : 'negative'}">${aboveMean ? '+' : ''}${diffFromMean} pts</span>
    </div>
    <div class="position-row">
      <span class="position-label">Gap to Best Score</span>
      <span class="position-value">&minus;${diffFromBest} pts</span>
    </div>
    <div class="position-row">
      <span class="position-label">Above Worst Score</span>
      <span class="position-value positive">+${diffFromWorst} pts</span>
    </div>
  `;

  // -- Feature Comparison --
  const featBarsEl = document.getElementById('da-feature-bars');
  featBarsEl.innerHTML = '';
  result.feature_comparison.forEach(f => {
    const z       = f.z_score;
    const barPct  = Math.min(Math.abs(z) / 2.5 * 50, 50); // cap at 2.5 sigma = 50%
    const isPos   = z >= 0;
    const valClass = f.is_default ? 'feat-bar-val default-val' : 'feat-bar-val';
    const valLabel = f.is_default
      ? `avg (${fmtNum(f.mean)})`
      : `${fmtNum(f.user_value)} / avg ${fmtNum(f.mean)}`;
    featBarsEl.insertAdjacentHTML('beforeend', `
      <div class="feat-bar-row">
        <span class="feat-bar-name" title="${f.feature}">${f.feature}</span>
        <div class="feat-bar-center">
          <div class="feat-bar-midline"></div>
          <div class="feat-bar-fill ${isPos ? 'positive' : 'negative'}"
               data-w="${barPct}"></div>
        </div>
        <span class="${valClass}" title="${valLabel}">
          ${z >= 0 ? '+' : ''}${z.toFixed(2)}&sigma;
        </span>
      </div>
    `);
  });
  // Animate feature bars (remove !important override via inline style)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    featBarsEl.querySelectorAll('.feat-bar-fill').forEach(bar => {
      bar.style.cssText += `; width: ${bar.dataset.w}% !important;`;
    });
  }));

  // Scroll to section
  setTimeout(() => {
    detailedAnalysis.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
}

/* ============================================================
   NEW ANALYSIS BUTTON
   ============================================================ */
document.getElementById('new-prediction-btn').addEventListener('click', () => {
  resultCard.style.display        = 'none';
  resultPlaceholder.style.display = 'block';
  detailedAnalysis.style.display  = 'none';

  // Reset gauge
  const fill = document.getElementById('score-ring-fill');
  fill.style.strokeDashoffset = GAUGE_TOTAL;
  fill.style.stroke = '';
  document.getElementById('gauge-score-text').textContent = '--';
  document.getElementById('score-marker').style.left = '0%';

  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
});

/* ============================================================
   COLLAPSE DETAILED ANALYSIS
   ============================================================ */
const collapseBtn = document.getElementById('collapse-da-btn');
if (collapseBtn) {
  collapseBtn.addEventListener('click', () => {
    const content = detailedAnalysis.querySelectorAll('.da-top-grid, .da-feature-card');
    const isHidden = collapseBtn.textContent.trim() === 'Show Details';
    content.forEach(el => { el.style.display = isHidden ? '' : 'none'; });
    collapseBtn.textContent = isHidden ? 'Hide Details' : 'Show Details';
  });
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className   = 'toast toast-' + type;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4500);
}

/* ============================================================
   HELPERS
   ============================================================ */
function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function tierColor(tier) {
  return ({ 'Excellent': '#2563eb', 'Good': '#16A34A', 'Below Average': '#EA580C', 'Poor': '#DC2626' })[tier] || '#2563eb';
}
function fmtNum(n) {
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 1)    return n.toFixed(2);
  return n.toFixed(4);
}
function animateCounter(el, from, to, duration) {
  const start  = performance.now();
  const tick   = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = (from + (to - from) * eased).toFixed(2);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ============================================================
   DARK THEME TOGGLE
   ============================================================ */
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  const iconLight = document.getElementById('theme-icon-light');
  const iconDark = document.getElementById('theme-icon-dark');

  function setTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      iconLight.style.display = 'block';
      iconDark.style.display = 'none';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      iconLight.style.display = 'none';
      iconDark.style.display = 'block';
      localStorage.setItem('theme', 'light');
    }
  }

  if (localStorage.getItem('theme') === 'dark') {
    setTheme(true);
  }

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    setTheme(!isDark);
  });
}

/* ============================================================
   PDF EXPORT
   ============================================================ */
const downloadReportBtn = document.getElementById('download-report-btn');
if (downloadReportBtn) {
  downloadReportBtn.addEventListener('click', () => {
    const resultCardElement = document.getElementById('result-card');
    const daElement = document.getElementById('detailed-analysis');
    
    const printContainer = document.createElement('div');
    printContainer.style.padding = '20px';
    printContainer.style.background = document.documentElement.classList.contains('dark-theme') ? '#020617' : '#ffffff';
    
    const rcClone = resultCardElement.cloneNode(true);
    const daClone = daElement.cloneNode(true);
    
    const footer = rcClone.querySelector('.result-card-footer');
    if(footer) footer.remove();
    const daHeaderBtn = daClone.querySelector('.da-collapse-btn');
    if(daHeaderBtn) daHeaderBtn.remove();
    
    daClone.style.display = 'block';
    
    const title = document.createElement('h2');
    title.textContent = 'BranchIQ Performance Report';
    title.style.fontFamily = 'Inter, sans-serif';
    title.style.color = document.documentElement.classList.contains('dark-theme') ? '#F8FAFC' : '#1E293B';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    
    printContainer.appendChild(title);
    printContainer.appendChild(rcClone);
    printContainer.appendChild(daClone);

    const opt = {
      margin:       10,
      filename:     'branch-performance-report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    const origText = downloadReportBtn.textContent;
    downloadReportBtn.textContent = 'Generating PDF...';
    downloadReportBtn.disabled = true;
    
    html2pdf().set(opt).from(printContainer).save().then(() => {
      downloadReportBtn.textContent = origText;
      downloadReportBtn.disabled = false;
      showToast('PDF Report downloaded successfully!', 'success');
    }).catch(err => {
      downloadReportBtn.textContent = origText;
      downloadReportBtn.disabled = false;
      showToast('Error generating PDF.', 'error');
    });
  });
}
