
const rssForm = document.querySelector('#rss-form');

rssForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = e.currentTarget.querySelector('#link').value;
  console.log(url);
  fetch(url)
    .then(response => console.log(response));
});