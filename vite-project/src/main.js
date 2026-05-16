import './style.css';
import axios from 'axios';
import * as yup from 'yup';
import { proxy, subscribe } from 'valtio/vanilla';
import i18next from 'i18next';

const proxyTrueURL = 'https://allorigins.hexlet.app/get?disableCache=true&url=';

i18next
  .init({
    lng: 'en',
    debug: false,
    resources: {
      en: {
        translation: {
          errors: {
            required: 'Cannot be empty',
            url: 'The link must be a valid URL.',
            notOneOf: 'RSS already exists.',
            notRss: "The resource doesn't contain valid RSS",
            network: 'Network error',
          },
          success: 'RSS has been loaded',
        },
      },
    },
  })
  .then(() => {
    // yup returns codes, not text
    yup.setLocale({
      mixed: {
        required: () => 'required',
        notOneOf: () => 'notOneOf',
      },
      string: {
        url: () => 'url',
      },
    });

    runApp();
  });

function runApp() {
  const rssForm = document.querySelector('#rss-form');
  const input = rssForm.querySelector('#link');
  const linksList = document.querySelector('.links-list');

  const state = proxy({
    form: { status: 'filling', error: null }, // error is a CODE, not text
    feeds: [],
  });

  let feedbackEl = document.querySelector('.feedback');
  if (!feedbackEl) {
    feedbackEl = document.createElement('p');
    feedbackEl.classList.add('feedback');
    rssForm.appendChild(feedbackEl);
  }

  const buildSchema = (existingUrls) =>
    yup.string().trim().required().url().notOneOf(existingUrls);

  const render = () => {
    if (state.form.status === 'invalid') {
      input.classList.add('is-invalid');
      feedbackEl.classList.add('text-danger');
      // translation happens HERE, in the view
      feedbackEl.textContent = state.form.error
        ? i18next.t(`errors.${state.form.error}`, state.form.error)
        : '';
    } else {
      input.classList.remove('is-invalid');
      feedbackEl.textContent = '';
    }

    linksList.innerHTML = '';
    state.feeds.forEach((feed) => {
      const li = document.createElement('li');
      li.textContent = feed.title || feed.url;
      linksList.appendChild(li);
    });
  };

  subscribe(state, render);
  render();

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
        const xml = parser.parseFromString(res.data.contents, 'text/xml');
        if (xml.querySelector('parsererror')) {
          throw new Error('notRss'); // store a CODE
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
        state.form.error = err.message; // 'url' | 'notOneOf' | 'required' | 'notRss'
        render();
        input.focus();
      });
  });
}
