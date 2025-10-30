const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

// Persist sidebar state
const SIDEBAR_KEY = 'youclone_sidebar_collapsed';
function applySidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
  sidebar.classList.toggle('collapsed', collapsed);
}
applySidebarState();
hamburger.addEventListener('click', () => {
  const nowCollapsed = !sidebar.classList.contains('collapsed');
  sidebar.classList.toggle('collapsed', nowCollapsed);
  localStorage.setItem(SIDEBAR_KEY, nowCollapsed ? '1' : '0');
});

// Elements
const appEl = document.getElementById('app');
const feedViewEl = document.getElementById('feed-view');
const watchViewEl = document.getElementById('watch-view');
const searchFormEl = document.getElementById('search-form');
const searchInputEl = document.getElementById('search-input');

// Config and API helpers
const INVIDIOUS_INSTANCE = localStorage.getItem('YOUCLONE_INVIDIOUS') || 'https://yewtu.be';
// Rotating API keys (user-provided)
const API_KEYS = [
  'AIzaSyBRB8bXp-UFdoNFhTqh9n2hWdthpm--gXk',
  'AIzaSyBi9XME_hKIdmFyKT2sX9Qzq-YW4uwaPGc',
  'AIzaSyAaT_fn6jzNLUjee7n7hQIJAdjvQiKHSTU',
  'AIzaSyD0ZhRR292c95yMkSx-ZPWtsGL-FkwEH2Y',
  'AIzaSyB0z2xXRZX5dh8tMw3PZh9oqfSGgwiWx-U',
  'AIzaSyByQDjEkBdrbJqi3O35UUyOEgGrEqImoXU',
  'AIzaSyA4iPnRBOkNcVnG6i2Osdplr-6KOOidJso',
  'AIzaSyBp1KT6xYFkP5pkq5vldiS5M-275Jyhk1o',
  'AIzaSyBSUK5rvC9NUIfGg7Ol-c5fByZDLxkV4MA',
  'AIzaSyBBN1oCDauSMk_QdRMKfriv3KsP--jGgIE',
  'AIzaSyBzD1zDrYqVl-RH3vTwfmXDkGqjdH3Zlr0',
  'AIzaSyDzoPLaJUFjAB0kSSPRGQfUwiMlywWIO4I',
  'AIzaSyCSMlS_3EpigNZYoyxU7L6mnLPfpFbJ6vA',
  'AIzaSyAvw2xoR4eaQOzsyEBjthCQSFo5x60jNV8',
  'AIzaSyDOd-fwjmHblCWYZWFtu6V0QNGHNBMb0Tw',
  'AIzaSyDKye_UeYzygyeo7H35-bKrM3wgCXb3wPs',
  'AIzaSyBg_4VpFdldAYh4eyEOdJKibMS1HeM7wZQ',
  'AIzaSyDIhTB0yw5Qkbdp3Wpu1n0djdJQXvELGlc',
  'AIzaSyCCgPxoUbeo3yiKo-2i8FTDyMO2MEhVS5Q',
  'AIzaSyDc-OSidO2qU5QAiXi7Ad1qASH3rPGZB3w',
  'AIzaSyA1KrCE-nCrnw_6lCrm0WK3n5iE5LlOpoQ',
  'AIzaSyCHby00rzviTneGRsYoaXPDSTNZ5mByYRs',
  'AIzaSyANh88_Ut5RXlGkw8TgbpgCcHHXTPqgN74',
  'AIzaSyCjgMk3Q_D-545I-slLdpOkcsi5rhUbwLg',
  'AIzaSyBRGmaiOgS9Ma0d6X6GqDxLbfJLFolkgCs',
  'AIzaSyBwQVmWudUVfBSA-Xd0Py3dWaBdubjEKDk',
  'AIzaSyAohDXe4nuKALD07eQGXG7WiCPC9u4j-No',
  'AIzaSyDEDWKHYGpjRJHM_xvgwzqUgCUgTI4BP24',
];
const API_INDEX_KEY = 'YOUCLONE_API_KEY_INDEX';
function getApiKeys() {
  const override = (window.YOUCLONE_YT_API_KEY || localStorage.getItem('YOUCLONE_YT_API_KEY') || '').trim();
  if (override) {
    const rest = API_KEYS.filter(k => k !== override);
    return [override, ...rest];
  }
  return API_KEYS.slice();
}
function getApiIndex() {
  const i = parseInt(localStorage.getItem(API_INDEX_KEY) || '0', 10);
  return Number.isFinite(i) ? i : 0;
}
function setApiIndex(i) {
  localStorage.setItem(API_INDEX_KEY, String(i));
}

function toQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  return usp.toString();
}

async function fetchYouTube(path, params) {
  const keys = getApiKeys();
  if (!keys.length) throw new Error('No API keys');
  const start = getApiIndex() % keys.length;
  for (let t = 0; t < keys.length; t++) {
    const idx = (start + t) % keys.length;
    const key = keys[idx];
    try {
      const qs = toQuery({ ...params, key });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
      const data = await res.json();
      const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || '';
      if (res.ok && !data?.error) {
        setApiIndex(idx);
        return data;
      }
      if (/quota|limit|forbidden|daily|usage/i.test(String(reason))) {
        continue; // try next key
      }
      // For non-quota errors, bubble up
      throw new Error(reason || 'YouTube API error');
    } catch (_) {
      // try next key
      continue;
    }
  }
  throw new Error('All API keys exhausted');
}

function abbreviateNumber(num) {
  if (num === undefined || num === null) return '';
  const n = Number(num);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function timeSince(dateStr) {
  const then = new Date(dateStr).getTime();
  const diff = Date.now() - then;
  const units = [
    ['year', 365*24*60*60*1000],
    ['month', 30*24*60*60*1000],
    ['week', 7*24*60*60*1000],
    ['day', 24*60*60*1000],
    ['hour', 60*60*1000],
    ['minute', 60*1000],
  ];
  for (const [name, ms] of units) {
    const v = Math.floor(diff / ms);
    if (v >= 1) return `${v} ${name}${v>1?'s':''} ago`;
  }
  return 'Just now';
}

// Data fetching
async function fetchFeed({ query, pageToken } = {}) {
  if (getApiKeys().length) {
    try {
      // YouTube Data API v3 via rotating keys
      if (query) {
        const searchData = await fetchYouTube('search', { part: 'snippet', q: query, type: 'video', maxResults: 24, pageToken });
        const ids = (searchData.items || []).map(i => i.id.videoId).filter(Boolean).join(',');
        if (!ids) return { items: [], nextPageToken: searchData.nextPageToken };
        const stats = await fetchYouTube('videos', { part: 'snippet,contentDetails,statistics', id: ids });
        const items = (stats.items || []).map(mapYouTubeVideo);
        return { items, nextPageToken: searchData.nextPageToken };
      } else {
        const data = await fetchYouTube('videos', { part: 'snippet,contentDetails,statistics', chart: 'mostPopular', maxResults: 24, pageToken, regionCode: 'US' });
        const items = (data.items || []).map(mapYouTubeVideo);
        return { items, nextPageToken: data.nextPageToken };
      }
    } catch (e) {
      // fall through to Invidious on total exhaustion
    }
  }
  {
    // Invidious fallback
    if (query) {
      const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      const data = await res.json();
      const items = (data || []).map(mapInvidiousVideo);
      return { items };
    } else {
      const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/trending`);
      const data = await res.json();
      const items = (data || []).map(mapInvidiousVideo);
      return { items };
    }
  }
}

function mapYouTubeVideo(v) {
  return {
    id: v.id,
    title: v.snippet?.title || '',
    channelTitle: v.snippet?.channelTitle || '',
    publishedAt: v.snippet?.publishedAt || '',
    thumbnails: v.snippet?.thumbnails || {},
    viewCount: Number(v.statistics?.viewCount || 0),
  };
}

function mapInvidiousVideo(v) {
  return {
    id: v.videoId,
    title: v.title,
    channelTitle: v.author,
    publishedAt: v.published || v.publishedText || '',
    thumbnails: { medium: { url: (v.videoThumbnails?.[2]?.url || v.videoThumbnails?.[0]?.url || '') } },
    viewCount: Number(v.viewCount || 0),
  };
}

// Rendering
function renderFeed(items) {
  feedViewEl.classList.remove('hidden');
  watchViewEl.classList.add('hidden');
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.innerHTML = items.map(renderVideoCard).join('');
  feedViewEl.innerHTML = '';
  feedViewEl.appendChild(grid);
  // Wire clicks
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-video-id]');
    if (card) {
      const id = card.getAttribute('data-video-id');
      location.hash = `#/watch?v=${encodeURIComponent(id)}`;
    }
  });
}

function renderVideoCard(v) {
  const thumb = v.thumbnails?.medium?.url || '';
  return `
    <article class="video-card" data-video-id="${v.id}">
      <img class="thumb" src="${thumb}" alt="${escapeHtml(v.title)}" loading="lazy" />
      <div class="video-meta">
        <span class="channel-avatar"></span>
        <div>
          <div class="title">${escapeHtml(v.title)}</div>
          <div class="sub">${escapeHtml(v.channelTitle)}</div>
          <div class="sub">${abbreviateNumber(v.viewCount)} views • ${timeSince(v.publishedAt)}</div>
        </div>
      </div>
    </article>
  `;
}

function renderWatch(videoId) {
  feedViewEl.classList.add('hidden');
  watchViewEl.classList.remove('hidden');
  watchViewEl.innerHTML = `
    <div class="watch-layout">
      <div>
        <div class="player">
          <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="watch-title" id="watch-title"></div>
        <div class="watch-sub" id="watch-sub"></div>
      </div>
      <div id="related"></div>
    </div>
  `;
  // Optionally fetch video details to display title/channel (best effort)
  bestEffortFetchDetails(videoId).catch(()=>{});
}

async function bestEffortFetchDetails(videoId) {
  try {
    const data = await fetchYouTube('videos', { part: 'snippet,statistics', id: videoId });
    const v = data.items?.[0];
    if (v) {
      document.getElementById('watch-title').textContent = v.snippet?.title || '';
      document.getElementById('watch-sub').textContent = `${v.snippet?.channelTitle || ''} • ${abbreviateNumber(v.statistics?.viewCount || 0)} views`;
      return;
    }
  } catch (_) {
    // fallback below
  }
  const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${encodeURIComponent(videoId)}`);
  const v = await res.json();
  if (v) {
    document.getElementById('watch-title').textContent = v.title || '';
    document.getElementById('watch-sub').textContent = `${v.author || ''} • ${abbreviateNumber(v.viewCount || 0)} views`;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Routing
function parseHash() {
  const h = location.hash || '#/';
  const url = new URL(h.replace('#', ''), location.origin);
  const route = url.pathname;
  const params = Object.fromEntries(url.searchParams.entries());
  return { route, params };
}

async function handleRoute() {
  const { route, params } = parseHash();
  if (route === '/watch' && params.v) {
    renderWatch(params.v);
  } else if (route === '/search' && params.q) {
    const { items } = await fetchFeed({ query: params.q });
    renderFeed(items);
    searchInputEl.value = params.q;
  } else {
    const { items } = await fetchFeed();
    renderFeed(items);
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

// Search form
if (searchFormEl) {
  searchFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInputEl.value.trim();
    if (q) {
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    }
  });
}
