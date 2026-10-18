// Unit tests for the old-print look (filmlook.js): on unless the page
// address turns it off.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const film = (query) => load(['debug.js', 'filmlook.js'], { dom: true, query }).get('FilmLook')

describe('the old-print look', () => {
  it('is on unless the page turns it off', () => {
    assert.equal(film('').on, true)
    assert.equal(film('?film').on, true)
    assert.equal(film('?film=0').on, false)
  })

  it('lays nothing over the stage when off', () => {
    const page = load(['debug.js', 'filmlook.js'], { dom: true, query: '?film=0' })
    const stage = page.get("document.getElementById('stage')")
    page.get('FilmLook').mount(stage)
    assert.equal(stage.children.length, 0)
  })
})
