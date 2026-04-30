import './style.css'
import javascriptLogo from './assets/javascript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { setupCounter } from './counter.js'
import axios from 'axios'
import * as yup from 'yup'
import { proxy, subscribe } from 'valtio/vanilla'

document.querySelector('#app').innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${javascriptLogo}" class="framework" alt="JavaScript logo"/>
    <img src=${viteLogo} class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.js</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vite.dev/" target="_blank">
          <img class="logo" src=${viteLogo} alt="" />
          Explore Vite
        </a>
      </li>
      <li>
        <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
          <img class="button-icon" src="${javascriptLogo}" alt="">
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#social-icon"></use></svg>
    <h2>Connect with us</h2>
    <p>Join the Vite community</p>
    <ul>
      <li><a href="https://github.com/vitejs/vite" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>GitHub</a></li>
      <li><a href="https://chat.vite.dev/" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>Discord</a></li>
      <li><a href="https://x.com/vite_js" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>X.com</a></li>
      <li><a href="https://bsky.app/profile/vite.dev" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>Bluesky</a></li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

setupCounter(document.querySelector('#counter'));

const rssForm = document.querySelector('#rss-form');
const input = rssForm.querySelector('#link');
const linksList = document.querySelector('.links-list');

const state = proxy({
  form: {
    status: 'filling',
    error: null,
  },
  feeds: [], // array of URLs already added.
});

//Container for error messages (create if not present)
let feedbackEl = document.querySelector('.feedback');
if (!feedbackEl) {
  feedbackEl = document.createElement('p');
  feedbackEl.classList.add('feedback');
  rssForm.appendChild(feedbackEl);
};

yup.setLocale({
  mixed: {
    notOneOf: 'RSS already exists.',
  },
  string: {
    url: 'The link must be a valid URL.',
  },
});

const buildSchema = (existingUrls) => 
  yup
    .string()
    .trim()
    .required('Cannot be empty')
    .url('The link must be a valid URL.')
    .notOneOf(existingUrls, 'RSS already exists.');

//Subscribe to state
const render = () => {
  if (state.form.status === 'invalid') {
    input.classList.add('is-invalid');
    feedbackEl.classList.add('text-danger');
    feedbackEl.textContent = state.form.error ?? '';
  } else {
    input.classList.remove('is-invalid');
    feedbackEl.textContent = '';
  }

  //Render feeds list
  linksList.innerHTML = '';
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.textContent = feed.title || feed.url;
    linksList.appendChild(li);
  });
};

subscribe(state, render);
render();

const proxyTrueURL = 'https://allorigins.hexlet.app/get?disableCache=true&url=';

rssForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const userUrl = input.value;
  const existingUrls = state.feeds.map((f) => f.url);
  const schema = buildSchema(existingUrls);

  schema
    .validate(userUrl)
    .then((validUrl) => {
      state.form.status = 'filling';
      state.form.error = null;
      return axios.get(`${proxyTrueURL}${encodeURIComponent(validUrl)}`);
    })
    .then((res) => {
      const parser = new DOMParser();
      console.log(parser);
      const xml = parser.parseFromString(res.data.contents, 'text/xml');
      const parserError = xml.querySelector('parsererror');
      if (parserError) {
        throw new Error('The resource doesn\'t contain valid RSS');
      }
      const title = xml.querySelector('channel > title')?.textContent;
      const description = xml.querySelector('channel > description')?.textContent;
      const items = [...xml.querySelectorAll('item')].map((item) => ({
        title: item.querySelector('title')?.textContent,
        link: item.querySelector('link')?.textContent,
        description: item.querySelector('description')?.textContent,
      }));

      state.feeds.push({ url: userUrl, title, description, items });
      input.value = '';
      input.focus();
    })
    .catch((err) => {
      state.form.status = 'invalid';
      state.form.error = err.message;
      render();
      input.focus();
    })
});
