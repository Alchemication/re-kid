// ESLint for the games' scripts: likely bugs, and functions grown too tangled
// to follow. Run with `npx --yes eslint@10.12.0` (pinned; there is no npm
// project). Plain rules only, so nothing needs installing.
//
// Correctness rules are errors. The complexity limits are warnings: they flag
// what a reader can't hold in their head at once, and the list they print is
// the hotspot list (CLAUDE.md: new code adds no new warnings; split a hotspot
// when you next work in it).

const BROWSER = Object.fromEntries(
  [
    'window', 'document', 'location', 'navigator', 'performance', 'console', 'localStorage',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
    'URL', 'URLSearchParams', 'Blob', 'Audio', 'AudioContext', 'ResizeObserver', 'DOMParser',
    'getComputedStyle', 'DOMMatrix', 'fetch', 'AbortController', 'DOMException', 'atob',
  ].map((g) => [g, 'readonly']),
)
const NODE = Object.fromEntries(
  ['require', 'module', '__dirname', 'process', 'console', 'performance', 'URL', 'URLSearchParams', 'setTimeout', 'setImmediate'].map((g) => [g, 'readonly']),
)

const CORRECTNESS = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^[A-Z]' }], // a script's exported global
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-fallthrough': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-unsafe-finally': 'error',
  'no-async-promise-executor': 'error',
  'no-empty': 'error', // an empty block hides a decision: say why in a comment
  'no-cond-assign': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
}

const COMPLEXITY = {
  complexity: ['warn', 15], // independent paths through one function
  'max-depth': ['warn', 4], // nested blocks
  'max-nested-callbacks': ['warn', 4],
  'max-params': ['warn', 6], // past this, call sites become a row of unlabelled numbers
  'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
}

export default [
  {
    files: ['worlds/*/games/*/game/**/*.js'],
    ignores: ['**/samples.js'], // generated
    languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: BROWSER },
    rules: { ...CORRECTNESS, ...COMPLEXITY },
  },
  {
    files: ['worlds/*/games/*/tests/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: NODE },
    rules: CORRECTNESS,
  },
]
