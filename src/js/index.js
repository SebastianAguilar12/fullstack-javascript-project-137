const rssForm = document.querySelector('#rss-form');

rssForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const userUrl = e.target.querySelector('#link').value;
  fetch(userUrl)
    .then((data) => console.log(data));
});