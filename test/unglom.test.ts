import fs from 'node:fs'
import path from 'node:path'
import { spawnSync as $ } from 'picospawn'
import unglom from '../src/unglom'

const fixturePath = path.join(import.meta.dirname, '__fixtures__', 'typebox.js')

describe('unglom', () => {
  test('rewrite any references to namespace exports', () => {
    const input = fs.readFileSync(fixturePath, 'utf-8')

    const result = unglom(input)
    if (!result) {
      throw new Error('Expected result')
    }

    fs.writeFileSync(fixturePath, result.code)
    onTestFinished(() => {
      fs.writeFileSync(fixturePath, input)
    })

    expect($(`git diff ${fixturePath}`, { stdio: 'pipe' })).toMatchSnapshot()
  })
})
