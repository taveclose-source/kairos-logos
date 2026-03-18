export const openMainTOC = () =>
  window.dispatchEvent(new CustomEvent('logos:openMainTOC'))

export const openBookTOC = (book: string) =>
  window.dispatchEvent(new CustomEvent('logos:openBookTOC', { detail: { book } }))
