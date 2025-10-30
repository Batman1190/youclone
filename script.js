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
const sidebarMenuEl = document.getElementById('sidebar-menu');
const canonicalEl = document.getElementById('canonical-link');

// Playback queue and YouTube Iframe API integration
let playQueue = [];
let playIndex = -1;
let ytReadyPromise = null;
let ytPlayer = null;
let ytPlayerReadyPromise = null;
function ensureYouTubeApi() {
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return ytReadyPromise;
}
function setQueueFromItems(items, startVideoId) {
  playQueue = (items || []).map(v => v.id);
  playIndex = Math.max(0, playQueue.indexOf(startVideoId));
}
function setQueueFromIds(ids, startVideoId) {
  playQueue = ids.slice();
  playIndex = Math.max(0, playQueue.indexOf(startVideoId));
}
function queueNextId() {
  if (playIndex < 0 || playIndex + 1 >= playQueue.length) return null;
  return playQueue[playIndex + 1];
}
function goToNextInQueue() {
  const next = queueNextId();
  console.log('[YouClone] goToNextInQueue, current:', playIndex, 'queue:', playQueue, 'next:', next);
  if (!next) return;
  location.hash = `#/watch?v=${encodeURIComponent(next)}`;
}
// Track if we have a real user gesture to satisfy autoplay-with-sound policies
let youcloneHadUserGesture = false;
window.addEventListener('pointerdown', () => { youcloneHadUserGesture = true; }, { capture: true, once: false });
window.addEventListener('keydown', () => { youcloneHadUserGesture = true; }, { capture: true, once: false });
function loadPlayer(videoId) {
  return (async () => {
    await ensureYouTubeApi();
    const containerId = 'yt-player';
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!ytPlayer) {
      ytPlayerReadyPromise = new Promise((resolveReady) => {
        ytPlayer = new YT.Player(containerId, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, mute: 1, autoplay: 1 },
          events: {
            onReady: () => {
              ytPlayer.mute && ytPlayer.mute(); // ensure muted for autoplay compliance
              // If we already have a user gesture, play with sound
              if (youcloneHadUserGesture) {
                try {
                  ytPlayer.unMute && ytPlayer.unMute();
                  ytPlayer.playVideo && ytPlayer.playVideo();
                } catch (_) {}
              }
              resolveReady();
            },
            onStateChange: (ev) => {
              // 0 = ended
              console.log('[YouClone] onStateChange:', ev.data, 'autoplay:', isAutoplayEnabled());
              if (ev.data === YT.PlayerState.ENDED && isAutoplayEnabled()) {
                goToNextInQueue();
              }
            }
          }
        });
      });
      await ytPlayerReadyPromise;
    } else {
      try {
        if (!ytPlayerReadyPromise) {
          ytPlayerReadyPromise = Promise.resolve();
        }
        await ytPlayerReadyPromise;
        ytPlayer.loadVideoById(videoId);
        ytPlayer.mute && ytPlayer.mute(); // default muted
        if (youcloneHadUserGesture) {
          // If we have user gesture, play with sound
          try {
            ytPlayer.unMute && ytPlayer.unMute();
            ytPlayer.playVideo && ytPlayer.playVideo();
          } catch (_) {}
        }
      } catch (_) {
        ytPlayer = null;
        ytPlayerReadyPromise = null;
        await loadPlayer(videoId);
      }
    }
  })();
}
// Local storage lists
const LS_HISTORY = 'YOUCLONE_HISTORY';
const LS_WATCH_LATER = 'YOUCLONE_WATCH_LATER';
const LS_LIKED = 'YOUCLONE_LIKED';
const LS_AUTOPLAY = 'YOUCLONE_AUTOPLAY';

function loadList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}
function upsertToList(key, video, { max = 200, toFront = true } = {}) {
  const list = loadList(key);
  const idx = list.findIndex(i => i.id === video.id);
  if (idx !== -1) list.splice(idx, 1);
  if (toFront) list.unshift(video); else list.push(video);
  if (list.length > max) list.length = max;
  saveList(key, list);
  return list;
}
function removeFromList(key, videoId) {
  const list = loadList(key).filter(i => i.id !== videoId);
  saveList(key, list);
  return list;
}
function isInList(key, videoId) {
  return loadList(key).some(i => i.id === videoId);
}

function isAutoplayEnabled() {
  return localStorage.getItem(LS_AUTOPLAY) !== '0';
}
function setAutoplayEnabled(on) {
  localStorage.setItem(LS_AUTOPLAY, on ? '1' : '0');
}


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
  // Set queue to current feed order
  setQueueFromItems(items, items?.[0]?.id);
  // Wire clicks
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-video-id]');
    if (card) {
      const id = card.getAttribute('data-video-id');
      youcloneHadUserGesture = true; // mark: this click is a real user gesture
      setQueueFromItems(items, id);
      renderWatch(id);
      const expectedHash = `#/watch?v=${encodeURIComponent(id)}`;
      if (location.hash !== expectedHash) {
        location.hash = expectedHash;
      }
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
  // Destroy any existing YouTube player before replacing the container
  if (ytPlayer) {
    try {
      ytPlayer.destroy && ytPlayer.destroy();
    } catch(err) {
      console.warn('[YouClone] Error destroying ytPlayer:', err);
    }
    ytPlayer = null;
    ytPlayerReadyPromise = null;
  }
  feedViewEl.classList.add('hidden');
  watchViewEl.classList.remove('hidden');
  watchViewEl.innerHTML = `
    <div class="watch-layout">
      <div>
        <div class="player"><div id="yt-player" style="width:100%; height:100%"></div></div>
        <div class="watch-title" id="watch-title"></div>
        <div class="watch-sub" id="watch-sub"></div>
        <div class="watch-actions">
          <button class="action-btn" id="btn-like"><i class="fa-solid fa-thumbs-up"></i><span>Like</span></button>
          <button class="action-btn" id="btn-watch-later"><i class="fa-solid fa-clock"></i><span>Watch later</span></button>
          <button class="action-btn" id="btn-autoplay"><i class="fa-solid fa-play"></i><span>Autoplay</span></button>
        </div>
      </div>
      <div id="related"></div>
    </div>
  `;
  // LOAD PLAYER after DOM is updated so yt-player is guaranteed present
  setTimeout(() => { loadPlayer(videoId).catch(()=>{}); }, 0);
  // Ensure there is a queue (if none, build from related items later)
  if (!playQueue || playQueue.length === 0) {
    setQueueFromIds([videoId], videoId);
  }
  // Fetch details, update UI, and log history
  bestEffortFetchDetails(videoId).then(video => {
    if (!video) return;
    // Init buttons state
    updateActionButtons(video.id);
    // Update meta with video title
    setPageMeta(`${video.title} • YouClone`, `${video.channelTitle} on YouClone`);
    // Wire actions
    const likeBtn = document.getElementById('btn-like');
    const laterBtn = document.getElementById('btn-watch-later');
    const autoplayBtn = document.getElementById('btn-autoplay');
    likeBtn.onclick = () => toggleLike(video);
    laterBtn.onclick = () => toggleWatchLater(video);
    // Autoplay toggle
    updateAutoplayButton();
    autoplayBtn.onclick = () => {
      setAutoplayEnabled(!isAutoplayEnabled());
      updateAutoplayButton();
    };
    // Add to history
    upsertToList(LS_HISTORY, video);
  }).catch(()=>{});
  // Always extend queue with related videos for better auto-play
  extendQueueWithRelated(videoId).catch(()=>{});
}

async function extendQueueWithRelated(videoId) {
  // Only extend if queue is just the current item
  if (!Array.isArray(playQueue) || playQueue.length <= 1) {
    try {
      const related = await fetchRelated(videoId);
      if (related && related.length) {
        const ids = [videoId].concat(related.map(v => v.id).filter(id => id && id !== videoId));
        setQueueFromIds(ids, videoId);
      }
    } catch (_) {}
  }
}

async function fetchRelated(videoId) {
  // Prefer YouTube API
  try {
    const searchData = await fetchYouTube('search', { part: 'snippet', type: 'video', maxResults: 24, relatedToVideoId: videoId });
    const ids = (searchData.items || []).map(i => i.id?.videoId).filter(Boolean).join(',');
    if (!ids) return [];
    const stats = await fetchYouTube('videos', { part: 'snippet,contentDetails,statistics', id: ids });
    return (stats.items || []).map(mapYouTubeVideo);
  } catch (_) {
    // Invidious fallback
    try {
      const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${encodeURIComponent(videoId)}`);
      const data = await res.json();
      const rec = Array.isArray(data?.recommendedVideos) ? data.recommendedVideos : [];
      return rec.map(mapInvidiousVideo);
    } catch (_) {
      return [];
    }
  }
}

async function bestEffortFetchDetails(videoId) {
  try {
    const data = await fetchYouTube('videos', { part: 'snippet,statistics', id: videoId });
    const v = data.items?.[0];
    if (v) {
      document.getElementById('watch-title').textContent = v.snippet?.title || '';
      document.getElementById('watch-sub').textContent = `${v.snippet?.channelTitle || ''} • ${abbreviateNumber(v.statistics?.viewCount || 0)} views`;
      return {
        id: v.id,
        title: v.snippet?.title || '',
        channelTitle: v.snippet?.channelTitle || '',
        thumbnails: v.snippet?.thumbnails || {},
        viewCount: Number(v.statistics?.viewCount || 0),
        publishedAt: v.snippet?.publishedAt || ''
      };
    }
  } catch (_) {
    // fallback below
  }
  const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${encodeURIComponent(videoId)}`);
  const v = await res.json();
  if (v) {
    document.getElementById('watch-title').textContent = v.title || '';
    document.getElementById('watch-sub').textContent = `${v.author || ''} • ${abbreviateNumber(v.viewCount || 0)} views`;
    return {
      id: videoId,
      title: v.title || '',
      channelTitle: v.author || '',
      thumbnails: { medium: { url: (v.videoThumbnails?.[2]?.url || v.videoThumbnails?.[0]?.url || '') } },
      viewCount: Number(v.viewCount || 0),
      publishedAt: v.published || v.publishedText || ''
    };
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
    setPageMeta('Watching… • YouClone', 'Watch videos on YouClone');
    renderWatch(params.v);
  } else if (route === '/search' && params.q) {
    const { items } = await fetchFeed({ query: params.q });
    renderFeed(items);
    searchInputEl.value = params.q;
    setPageMeta(`${params.q} - Search • YouClone`, `Search results for ${params.q} on YouClone`);
  } else if (route === '/') {
    const { items } = await fetchFeed();
    renderFeed(items);
    setPageMeta('YouClone • Watch and discover videos', 'Discover trending videos on YouClone');
  } else if (route === '/shorts') {
    const { items } = await fetchFeed({ query: 'shorts' });
    renderFeed(items);
    setPageMeta('Shorts • YouClone', 'Browse shorts on YouClone');
  } else if (route === '/history') {
    renderSavedList('History', LS_HISTORY);
    setPageMeta('History • YouClone', 'Your recently watched videos on YouClone');
  } else if (route === '/watch-later') {
    renderSavedList('Watch later', LS_WATCH_LATER);
    setPageMeta('Watch later • YouClone', 'Videos you saved to watch later on YouClone');
  } else if (route === '/liked') {
    renderSavedList('Liked videos', LS_LIKED);
    setPageMeta('Liked videos • YouClone', 'Videos you liked on YouClone');
  } else if (['/subscriptions','/playlists','/your-videos','/downloads'].includes(route)) {
    renderPlaceholder(route.replace('/', '').replace('-', ' '));
    setPageMeta('YouClone', 'YouClone video app');
  } else {
    // default to home
    const { items } = await fetchFeed();
    renderFeed(items);
    setPageMeta('YouClone • Watch and discover videos', 'Discover trending videos on YouClone');
  }
  updateCanonical();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

// Search form
if (searchFormEl) {
  // Only native search: no suggestions/autocomplete
  searchFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInputEl.value.trim();
    if (q) {
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    }
  });
}

// Sidebar menu navigation
if (sidebarMenuEl) {
  sidebarMenuEl.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-route]');
    if (!li) return;
    const r = li.getAttribute('data-route') || '/';
    if (r === '/') location.hash = '#/';
    else if (r === '/shorts') location.hash = '#/shorts';
    else location.hash = `#${r}`;
  });
}

function renderPlaceholder(name) {
  feedViewEl.classList.remove('hidden');
  watchViewEl.classList.add('hidden');
  const pretty = name && name.length ? name.charAt(0).toUpperCase() + name.slice(1) : 'Coming soon';
  feedViewEl.innerHTML = `
    <div style="padding: 24px; color: #606060;">
      <h2 style="margin: 8px 0 6px; color: #0f0f0f;">${escapeHtml(pretty)}</h2>
      <p>This section is not yet implemented in YouClone.</p>
    </div>
  `;
}

function renderSavedList(title, key) {
  feedViewEl.classList.remove('hidden');
  watchViewEl.classList.add('hidden');
  const items = loadList(key);
  const header = `<h2 style="margin: 8px 0 16px; color: #0f0f0f;">${escapeHtml(title)}</h2>`;
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.innerHTML = items.map(v => renderVideoCardSaved(v, key)).join('');
  feedViewEl.innerHTML = header;
  feedViewEl.appendChild(grid);
  grid.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (removeBtn) {
      const vid = removeBtn.getAttribute('data-remove-id');
      removeFromList(key, vid);
      // Remove card from DOM quickly
      const card = removeBtn.closest('[data-video-id]');
      if (card) card.remove();
      return;
    }
    const card = e.target.closest('[data-video-id]');
    if (card) {
      const id = card.getAttribute('data-video-id');
      location.hash = `#/watch?v=${encodeURIComponent(id)}`;
    }
  });
}

function renderVideoCardSaved(v, key) {
  const thumb = v.thumbnails?.medium?.url || '';
  return `
    <article class="video-card" data-video-id="${v.id}">
      <img class="thumb" src="${thumb}" alt="${escapeHtml(v.title)}" loading="lazy" />
      <button class="remove-btn" title="Remove" data-remove-id="${v.id}" data-remove-key="${key}"><i class="fa-solid fa-xmark"></i></button>
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

function updateActionButtons(videoId) {
  const likeBtn = document.getElementById('btn-like');
  const laterBtn = document.getElementById('btn-watch-later');
  const autoplayBtn = document.getElementById('btn-autoplay');
  if (!likeBtn || !laterBtn) return;
  likeBtn.classList.toggle('active', isInList(LS_LIKED, videoId));
  laterBtn.classList.toggle('active', isInList(LS_WATCH_LATER, videoId));
  if (autoplayBtn) autoplayBtn.classList.toggle('active', isAutoplayEnabled());
}

function toggleLike(video) {
  if (isInList(LS_LIKED, video.id)) removeFromList(LS_LIKED, video.id); else upsertToList(LS_LIKED, video);
  updateActionButtons(video.id);
}
function toggleWatchLater(video) {
  if (isInList(LS_WATCH_LATER, video.id)) removeFromList(LS_WATCH_LATER, video.id); else upsertToList(LS_WATCH_LATER, video);
  updateActionButtons(video.id);
}

function updateAutoplayButton() {
  const autoplayBtn = document.getElementById('btn-autoplay');
  if (!autoplayBtn) return;
  autoplayBtn.classList.toggle('active', isAutoplayEnabled());
}

// SEO helpers
function setPageMeta(title, description) {
  if (title) document.title = title;
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && title) ogTitle.setAttribute('content', title);
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle && title) twTitle.setAttribute('content', title);
}
function updateCanonical() {
  const url = location.href;
  if (canonicalEl) canonicalEl.setAttribute('href', url);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent || '{}');
      if (data && typeof data === 'object') {
        data.url = url;
        ld.textContent = JSON.stringify(data);
      }
    } catch {}
  }
}
