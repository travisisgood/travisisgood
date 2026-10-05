'use strict';
const albums = document.querySelector('#albums');
const filters = document.querySelector('#filters');
const status = document.querySelector('#status');
const viewer = document.querySelector('#viewer');
const size = image => `${image.width} × ${image.height} · ${(image.bytes / 1048576).toFixed(1)} MB`;
let selected = 'All';
let data;

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
  for (const album of data.albums) {
    const images = album.images.filter(image => selected === 'All' || image.label === selected);
    if (!images.length) continue;
    const section = element('section', 'album');
    section.append(element('h2', '', album.title));
    if (album.description) section.append(element('p', 'album-description', album.description));
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
      count++;
    }
    section.append(grid);
    albums.append(section);
  }
  status.hidden = count > 0;
  if (!count) status.textContent = 'No captures in this view yet.';
  for (const button of filters.children) button.setAttribute('aria-pressed', String(button.textContent === selected));
}

document.querySelector('#close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
fetch('index.json', {cache: 'no-cache'}).then(response => {
  if (!response.ok) throw new Error('Gallery unavailable');
  return response.json();
}).then(manifest => {
  data = manifest;
  const labels = ['All', ...new Set(data.albums.flatMap(album => album.images.map(image => image.label)))];
  for (const label of labels) {
    const button = element('button', '', label);
    button.addEventListener('click', () => { selected = label; render(); });
    filters.append(button);
  }
  render();
}).catch(() => { status.textContent = 'Captures could not be loaded. Please try refreshing the page.'; });
