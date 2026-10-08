'use strict';
const albums = document.querySelector('#albums');
const filters = document.querySelector('#category');
const status = document.querySelector('#status');
const viewer = document.querySelector('#viewer');
const size = image => `${image.width} × ${image.height} · ${(image.bytes / 1048576).toFixed(1)} MB`;
let selected = 'All';
let data;
let dates = [];
let selectedDate;
const dateSelect = document.querySelector('#date');
const older = document.querySelector('#older');
const newer = document.querySelector('#newer');
const albumDate = album => album.date || album.created.slice(0, 10);
const formatDate = day => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {year:'numeric',month:'long',day:'numeric'});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function show(image) {
  document.querySelector('#viewer-title').textContent = image.title;
  document.querySelector('#viewer-detail').textContent = `${image.label} · ${size(image)}`;
  const large = document.querySelector('#large');
  large.src = image.preview;
  large.alt = `${image.label}: ${image.title}`;
  document.querySelector('#original').href = image.original;
  const download = document.querySelector('#download');
  download.href = image.original;
  download.download = image.filename;
  viewer.showModal();
}

function render() {
  albums.replaceChildren();
  let count = 0;
  let previousDay;
  const ordered = [...data.albums].sort((a,b) => albumDate(b).localeCompare(albumDate(a)) || Date.parse(b.updated || b.created) - Date.parse(a.updated || a.created));
  for (const album of ordered) {
    const day = albumDate(album);
    if (selectedDate !== 'all' && selectedDate !== day) continue;
    const images = album.images.filter(image => selected === 'All' || image.label === selected);
    const showResult = album.result && (selected === 'All' || album.label === selected);
    if (!images.length && !showResult) continue;
    if (day !== previousDay) {
      const heading = element('h2', 'day-heading');
      const link = element('a', '', formatDate(day));
      link.href = `?date=${day}`;
      heading.append(link);
      albums.append(heading);
      previousDay = day;
    }
    const section = element('section', 'album');
    if (album.status) section.append(element('span', `outcome ${album.status}`, album.status));
    section.append(element('h2', '', album.title));
    if (album.description) section.append(element('p', 'album-description', album.description));
    if (showResult) {
      section.append(element('p', 'test-result', album.result));
      const earlier = (album.results || []).slice(0, -1).reverse();
      if (earlier.length) {
        const history = element('details', 'result-history');
        history.append(element('summary', '', `Earlier checks (${earlier.length})`));
        for (const result of earlier) history.append(element('p', 'test-result', `${result.at} · ${result.status}\n${result.text}`));
        section.append(history);
      }
    }
    const grid = element('div', 'grid');
    for (const image of images) {
      const card = element('article', 'card');
      const button = element('button', 'image-button');
      button.setAttribute('aria-label', `View ${image.label}: ${image.title}`);
      const thumbnail = element('img');
      thumbnail.src = image.thumbnail;
      thumbnail.alt = `${image.label}: ${image.title}`;
      thumbnail.loading = 'lazy';
      thumbnail.width = image.width;
      thumbnail.height = image.height;
      button.append(thumbnail);
      button.addEventListener('click', () => show(image));
      const info = element('div', 'card-info');
      info.append(element('p', 'label', image.label), element('h3', '', image.title), element('p', 'meta', size(image)));
      const original = element('a', '', 'Open original ↗');
      original.href = image.original;
      original.target = '_blank';
      original.rel = 'noopener';
      info.append(original);
      card.append(button, info);
      grid.append(card);
    }
    section.append(grid);
    albums.append(section);
    count++;
  }
  status.hidden = count > 0;
  if (!count) status.textContent = 'No captures in this view yet.';
  filters.value = selected;
  dateSelect.value = selectedDate;
  const dateIndex = dates.indexOf(selectedDate);
  older.disabled = dateIndex < 0 || dateIndex >= dates.length - 1;
  newer.disabled = dateIndex <= 0;
}

function renderFilters() {
  const available = data.albums.filter(album => selectedDate === 'all' || albumDate(album) === selectedDate);
  const labels = [...new Set(available.flatMap(album => [...album.images.map(image => image.label), ...(album.result && album.label ? [album.label] : [])]))].filter(label => label !== 'All').sort((a, b) => a.localeCompare(b));
  if (!labels.includes(selected)) selected = 'All';
  filters.replaceChildren();
  for (const label of ['All', ...labels]) {
    const option = element('option', '', label === 'All' ? 'All categories' : label);
    option.value = label;
    filters.append(option);
  }
}

function changeDate(day) {
  selectedDate = day;
  const url = new URL(location.href);
  url.searchParams.set('date', day);
  history.replaceState(null, '', url);
  renderFilters();
  render();
}
filters.addEventListener('change', () => { selected = filters.value; render(); });
dateSelect.addEventListener('change', () => changeDate(dateSelect.value));
older.addEventListener('click', () => changeDate(dates[dates.indexOf(selectedDate) + 1]));
newer.addEventListener('click', () => changeDate(dates[dates.indexOf(selectedDate) - 1]));

document.querySelector('#close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
fetch('index.json', {cache: 'no-cache'}).then(response => {
  if (!response.ok) throw new Error('Gallery unavailable');
  return response.json();
}).then(manifest => {
  data = manifest;
  dates = [...new Set(data.albums.map(albumDate))].sort().reverse();
  const requested = new URL(location.href).searchParams.get('date');
  selectedDate = requested === 'all' || dates.includes(requested) ? requested : dates[0] || 'all';
  const allDates = element('option', '', 'All dates');
  allDates.value = 'all';
  dateSelect.append(allDates);
  for (const day of dates) {
    const option = element('option', '', formatDate(day));
    option.value = day;
    dateSelect.append(option);
  }
  renderFilters();
  render();
}).catch(() => { status.textContent = 'Captures could not be loaded. Please try refreshing the page.'; });
