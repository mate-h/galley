import '../manual.css'
import { linkCodeRefs } from './code-refs.js'
import { remount } from './eq-inspector.js'

remount()
linkCodeRefs()

if (import.meta.hot) {
  import.meta.hot.on('typst-update', async () => {
    const y = window.scrollY
    const response = await fetch(window.location.href, { cache: 'no-store' })
    if (!response.ok) return
    const next = new DOMParser().parseFromString(await response.text(), 'text/html')
    const incoming = next.getElementById('code-ref-index')
    if (incoming) document.head.append(incoming)
    for (const script of next.body.querySelectorAll('script')) script.remove()
    document.body.replaceWith(next.body)
    if (next.title) document.title = next.title
    remount()
    linkCodeRefs()
    window.scrollTo(0, y)
  })
}
