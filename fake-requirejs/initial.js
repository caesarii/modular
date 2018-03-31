const isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document)
const version = '2.3.5'
module.exports = {isBrowser, version, }