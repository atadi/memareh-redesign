// Test setup: provide a DOMParser implementation for Node so the article
// optimizer (which uses the browser-native DOMParser) can run under vitest.
// jsdom is a dev dependency and is polyfilled here ONLY in the test environment;
// the client bundle never imports jsdom.
// @ts-expect-error - jsdom ships without types in this project; used at runtime only.
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><body></body>')
const w: any = dom.window

if (typeof (globalThis as any).DOMParser === 'undefined') {
  ;(globalThis as any).DOMParser = w.DOMParser
  ;(globalThis as any).document = w.document
  ;(globalThis as any).Node = w.Node
  ;(globalThis as any).HTMLElement = w.HTMLElement
}
