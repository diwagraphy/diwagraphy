/* ============================================================
   DIWAGRAPHY — SHARED SCRIPT
   Functions used across Home, Gallery, and Journal pages.
   ============================================================ */

// Nav background deepens slightly once you've scrolled down a bit
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) nav.style.background = window.scrollY > 80 ? 'rgba(20,15,11,0.9)' : 'rgba(20,15,11,0.7)';
});

// Fires elements into view with a fade+rise as they scroll into the viewport
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
}, { threshold: 0.15 });

/* ---------- CONTACT SHEET FRAME (photo card with flip-to-story back) ---------- */
function renderFrame(f, container) {
  const el = document.createElement('div');
  const orientation = f.orientation === 'landscape' ? 'orientation-landscape' : 'orientation-portrait';
  el.className = `frame ${orientation}`;
  const exifLine = `${f.lens || ''} · ${f.aperture || ''}<br>${f.shutter || ''} · ISO ${f.iso || ''}`;
  const photoBg = f.image
    ? `<img src="${f.image}" alt="${f.title}">`
    : `<div class="tone ${f.tone || 'tone-1'}"></div>`;
  el.innerHTML = `
    <div class="frame-inner">
      <div class="face front">
        <div class="photo-surface">
          ${photoBg}
          <div class="sprockets">${Array(9).fill('<span></span>').join('')}</div>
          <div class="flip-hint">turn over ↻</div>
          <div class="exif">${exifLine}</div>
          <div class="cap">
            <span class="num">FRAME ${f.num || ''}</span>
            <div class="title">${f.title || ''}</div>
          </div>
        </div>
      </div>
      <div class="face back">
        <div class="stamp">${f.stamp || ''}</div>
        <div class="note">${f.note || ''}</div>
        <div class="meta"><span>${f.place || ''}</span><span>${f.date || ''}</span></div>
      </div>
    </div>
  `;
  el.addEventListener('click', () => el.classList.toggle('flipped'));
  container.appendChild(el);
  scrollObserver.observe(el);
}

/* ---------- JOURNAL POST CARD ---------- */
function renderPostCard(post, index, container, onOpen) {
  const el = document.createElement('div');
  el.className = 'post-card';
  el.innerHTML = `
    <div class="post-cover"><img src="${post.cover}" alt="${post.title}"></div>
    <span class="post-date">${post.date}</span>
    <div class="post-title">${post.title}</div>
    <p class="post-excerpt">${post.excerpt}</p>
    <span class="post-read">Read the full story →</span>
  `;
  el.addEventListener('click', () => onOpen(index));
  container.appendChild(el);
  scrollObserver.observe(el);
}

/* ---------- FULL-STORY READING OVERLAY (used on journal.html) ---------- */
function openPostOverlay(post, overlayEl, contentEl) {
  let bodyHtml = '';
  post.body.forEach(block => {
    if (block.type === 'p') bodyHtml += `<p>${block.text}</p>`;
    if (block.type === 'img') bodyHtml += `<div class="post-inline-img"><img src="${block.src}" alt=""></div>`;
  });
  contentEl.innerHTML = `
    <span class="post-full-date">${post.date}</span>
    <h2>${post.title}</h2>
    <div class="post-full-cover"><img src="${post.cover}" alt="${post.title}"></div>
    <div class="post-body">${bodyHtml}</div>
  `;
  overlayEl.classList.add('open');
  window.scrollTo({ top: 0 });
}

/* ---------- CATEGORIZED GALLERY (grouped + collapsible, with search) ---------- */
// Groups photos by their "category" field into collapsible accordion sections.
// The first category starts expanded; the rest start collapsed so visitors
// aren't forced to scroll past everything to find what they want.
function renderCategorizedGallery(stories, container) {
  const categories = {};
  stories.forEach(s => {
    const cat = s.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(s);
  });

  let first = true;
  Object.keys(categories).forEach(catName => {
    const items = categories[catName];
    const section = document.createElement('div');
    section.className = 'category-section' + (first ? ' expanded' : '');
    section.dataset.category = catName;
    first = false;

    section.innerHTML = `
      <div class="category-header">
        <div><span class="cat-name">${catName}</span><span class="cat-count">(${items.length})</span></div>
        <span class="cat-chevron">▾</span>
      </div>
      <div class="category-body">
        <div class="category-body-inner sheet"></div>
      </div>
    `;

    section.querySelector('.category-header').addEventListener('click', () => {
      section.classList.toggle('expanded');
    });

    const grid = section.querySelector('.category-body-inner');
    items.forEach(item => {
      renderFrame(item, grid);
      // Store searchable text on the frame element for the search filter below
      const frameEl = grid.lastElementChild;
      frameEl.dataset.search = [item.title, item.place, item.category, item.stamp]
        .filter(Boolean).join(' ').toLowerCase();
    });

    container.appendChild(section);
  });
}

// Filters frames across all category sections by a search term.
// Auto-expands categories that contain a match, hides categories with none.
function filterGallery(term, container, noResultsEl) {
  const q = term.trim().toLowerCase();
  let anyMatchAnywhere = false;

  container.querySelectorAll('.category-section').forEach(section => {
    let matchesInSection = 0;
    section.querySelectorAll('.frame').forEach(frameEl => {
      const isMatch = q === '' || (frameEl.dataset.search || '').includes(q);
      frameEl.style.display = isMatch ? '' : 'none';
      if (isMatch) matchesInSection++;
    });

    if (q === '') {
      // Search cleared — show all categories, but only first one expanded
      section.style.display = '';
    } else {
      section.style.display = matchesInSection > 0 ? '' : 'none';
      section.classList.toggle('expanded', matchesInSection > 0);
      if (matchesInSection > 0) anyMatchAnywhere = true;
    }
  });

  if (noResultsEl) {
    noResultsEl.style.display = (q !== '' && !anyMatchAnywhere) ? 'block' : 'none';
  }
}

/* ---------- "LOAD MORE" PAGINATION (used on gallery.html) ---------- */
// Renders items in batches so large photo collections don't all render at once.
function renderWithLoadMore(items, container, renderFn, batchSize, buttonEl) {
  let shown = 0;
  function showNextBatch() {
    const next = items.slice(shown, shown + batchSize);
    next.forEach(item => renderFn(item, container));
    shown += next.length;
    if (shown >= items.length) {
      buttonEl.style.display = 'none';
    }
  }
  showNextBatch();
  buttonEl.addEventListener('click', showNextBatch);
  if (items.length <= batchSize) buttonEl.style.display = 'none';
}
