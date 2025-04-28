# unglom

Ensure your library is optimally tree-shakeable, specifically if you use `export * as blah` statements and bundle your library with tools like `esbuild` or `rolldown`.

```
pnpm add unglom
```

### Before

Say you have a namespace export:

```js
// my-module.ts
export * as blah from './blah'
```

After bundling, you get a construct that is not tree-shakeable like this:

```js
const blah_exports = {}
__export(blah_exports, {
  blah: () => blah2,
})
```

This is bad, because any code using `blah.blah()` in your library will always bring along every other member of the `blah` namespace. Tree-shaking tools will not remove these unused members.

```js
function saveTheWorld() {
  // ⚠️😱 Everything in blah_exports is included in the end user's bundle!
  return blah_exports.blah()
}
```

### After

But with `unglom`, any references to `blah_exports.xyz` are replaced with the referenced declaration:

```js
function saveTheWorld() {
  return blah()
}
```

What's great about this is you can keep using your namespace exports, but now they'll be tree-shakeable!

Since `unglom` works on build artifacts (e.g. what `esbuild` outputs), you can use it on third-party libraries as well, without having to patch the library's source code and maintain a fork.

```
pnpm add unglom
```

## Usage

Using `unglom` is straight-forward. Pass in JavaScript code, receive back the transformed code (plus an optional source map).

```ts
import unglom from 'unglom'

const result = unglom(jsCode, { sourceMap: true })
```
