import { useLayoutEffect, useState } from 'react'

/**
 * Height that lets an element reach the bottom of the viewport, minus `reserve` pixels kept free below it
 * (for example a pagination bar and the page padding). Returns a callback ref for the element and the height.
 * Re-measured when the element mounts, on window resize, and when anything around it changes size, such as a
 * filter panel opening above it.
 */
export function useFillHeight(reserve: number, min = 220): [(node: HTMLElement | null) => void, number | undefined] {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    if (!node) return
    const update = () => {
      const top = node.getBoundingClientRect().top + window.scrollY
      setHeight(Math.max(min, Math.floor(window.innerHeight - top - reserve)))
    }
    update()
    const observer = new ResizeObserver(update)
    // Content above the element moves it without necessarily resizing the page, so watch its ancestors too.
    for (let el: HTMLElement | null = node.parentElement; el && el !== document.body; el = el.parentElement) {
      observer.observe(el)
      if (el.tagName === 'MAIN') break
    }
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [node, reserve, min])

  return [setNode, height]
}
