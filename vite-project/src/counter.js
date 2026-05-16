import i18next from 'i18next'
export function setupCounter(element) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    element.innerHTML = i18next.t('countIsCounter', 'Count is {{counter}}', { counter })
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
