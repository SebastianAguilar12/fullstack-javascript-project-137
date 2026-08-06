import './style.css';
import axios from 'axios';
import * as yup from 'yup';
import { proxy, subscribe } from 'valtio/vanilla';
import i18next from 'i18next';

const proxyURL = 'https://allorigins.hexlet.app/get?disableCache=true&url=';

let uid = 0;
const nextId = () => {
  uid += 1;
  return uid;
};

const messages = {
  errors: {
    required: 'The URL cannot be empty.',
    url: 'The link must be a valid URL.',
    notOneOf: 'This RSS feed has already been added.',
    notRss: 'The resource does not contain valid RSS.',
    network: 'A network error occurred. Please try again.',
  },
  success: 'RSS feed loaded successfully.',
  loading: 'Loading feed…',
  feeds: 'Feeds',
  posts: 'Posts',
  emptyFeeds: 'No feeds added yet.',
  emptyPosts: 'Posts from your feeds will appear here.',
};

i18next.init({
  lng: 'en',
  debug: false,
  resources: { en: { translation: messages } },
}).then(runApp);

yup.setLocale({
  mixed: { required: () => 'required', notOneOf: () => 'notOneOf' },
  string: { url: () => 'url' },
});

const buildSchema = (existingUrls) =>
  yup.string().trim().required().url().notOneOf(existingUrls);

// Pure function: XML in, normalized feed data out.
export const parseRss = (xmlString) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(xmlString, 'application/xml');
  console.log(document);

  if (document.querySelector('parsererror')) {
    throw new Error('notRss');
  }

  const channel = document.querySelector('channel');
  if (!channel) {
    throw new Error('notRss');
  }

  const title = channel.querySelector(':scope > title')?.textContent?.trim() ?? '';
  const description = channel.querySelector(':scope > description')?.textContent?.trim() ?? '';
  const items = [...channel.querySelectorAll(':scope > item')].map((item) => ({
    title: item.querySelector('title')?.textContent?.trim() ?? 'Untitled post',
    description: item.querySelector('description')?.textContent?.trim() ?? '',
    link: item.querySelector('link')?.textContent?.trim() ?? '#',
  }));

  return { title: title || 'Untitled feed', description, items };
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function runApp() {
  const form = document.querySelector('#rss-form');
  const input = document.querySelector('#link');
  const feedback = document.querySelector('#feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  const feedsContainer = document.querySelector('#feeds');
  const postsContainer = document.querySelector('#posts');

  // Normalized state: feeds and posts are stored independently and related by feedId.
  const state = proxy({
    form: { status: 'filling', error: null },
    feeds: [],
    posts: [],
  });

  const renderFeedback = () => {
    const { status, error } = state.form;
    feedback.className = `feedback ${status}`;
    feedback.textContent = status === 'invalid'
      ? i18next.t(`errors.${error}`)
      : status === 'success'
        ? i18next.t('success')
        : status === 'sending'
          ? i18next.t('loading')
          : '';
  };

  const renderFeeds = () => {
    if (state.feeds.length === 0) {
      feedsContainer.innerHTML = `<div class="empty-state">
        <span class="panel-title">${'Fuentes'}</span>
        <p>${i18next.t('emptyFeeds')}</p>
      </div>`;
      return;
    }

    feedsContainer.innerHTML = `
      <h2>${i18next.t('feeds')} <span class="count">${state.feeds.length}</span></h2>
      <ul class="feed-list">
        ${state.feeds.map((feed) => `
          <li class="feed-card">
            <h3>${escapeHtml(feed.title)}</h3>
            <p>${escapeHtml(feed.description)}</p>
          </li>`).join('')}
      </ul>`;
  };

  const renderPosts = () => {
    if (state.posts.length === 0) {
      postsContainer.innerHTML = `<div class="empty-state">
        <span class="panel-title">${'Publicaciones'}</span>
        <p>${i18next.t('emptyPosts')}</p>
      </div>`;
      return;
    }

    postsContainer.innerHTML = `
      <h2>${i18next.t('posts')} <span class="count">${state.posts.length}</span></h2>
      <ul class="post-list">
        ${state.posts.map((post) => `
          <li>
            <a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(post.title)}
            </a>
          </li>`).join('')}
      </ul>`;
  };

  const render = () => {
    const isSending = state.form.status === 'sending';
    input.disabled = isSending;
    submitButton.disabled = isSending;
    submitButton.textContent = isSending ? i18next.t('loading') : 'Add';
    renderFeedback();
    renderFeeds();
    renderPosts();
  };

  const refreshFeed = (feed) =>
    axios.get(
      `${proxyURL}${encodeURIComponent(feed.url)}`,
      { timeout: 10000 },
    )
      .then((response) => {
        const { items } = parseRss(response.data.contents);
        const knownLinks = new Set(
          state.posts
            .filter((post) => post.feedId === feed.id)
            .map((post) => post.link),
        );
        const newPosts = items
          .filter((item) => item.link && !knownLinks.has(item.link))
          .map((item) => ({
            id: nextId(),
            feedId: feed.id,
            title: item.title,
            description: item.description,
            link: item.link,
          }));
        state.posts.unshift(...newPosts);
      })
      .catch((error) => {
        // A failed background refresh must not interrupt other feeds.
        console.error(`Could not refresh RSS feed: ${feed.url}`, error);
      });

  const refreshFeeds = () => {
    const feeds = [...state.feeds];
    const refreshRequests = feeds.map(refreshFeed);
    // Schedule the next check only after every current request settles.
    Promise.all(refreshRequests).then(() => {
      setTimeout(refreshFeeds, 5000);
    });
  };

  subscribe(state, render);
  render();
  setTimeout(refreshFeeds, 5000);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const existingUrls = state.feeds.map((feed) => feed.url);
    buildSchema(existingUrls)
      .validate(input.value)
      .then((validUrl) => {
        state.form = { status: 'sending', error: null };
        return axios.get(`${proxyURL}${encodeURIComponent(validUrl)}`, {
          timeout: 10000,
        });
      })
      .then(({ data, config }) => {
        const { title, description, items } = parseRss(data.contents);
        const feedId = nextId();
        const url = decodeURIComponent(config.url.split('&url=')[1]);
        state.feeds.unshift({ id: feedId, url, title, description });
        state.posts.unshift(...items.map((item) => ({
          id: nextId(),
          feedId,
          title: item.title,
          description: item.description,
          link: item.link,
        })));
        state.form = { status: 'success', error: null };
        input.value = '';
        input.focus();
      })
      .catch((error) => {
        const code = ['url', 'notOneOf', 'required', 'notRss'].includes(error.message)
          ? error.message
          : 'network';
        state.form = { status: 'invalid', error: code };
        input.focus();
      });
  });
}
