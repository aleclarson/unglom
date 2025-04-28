import MagicString, { SourceMap } from 'magic-string'
import { ESTree, parseModule as parse } from 'meriyah'
import { walk } from 'meriyah-walker'
import { select } from 'radashi'

export type UnglomOptions = {
  sourceMap?: boolean
}

export default function unglom(
  code: string,
  options: UnglomOptions & { sourceMap: true }
): {
  code: string
  map: SourceMap
} | null

export default function unglom(
  code: string,
  options?: UnglomOptions
): {
  code: string
  map?: SourceMap | undefined
} | null

export default function unglom(code: string, options: UnglomOptions = {}) {
  const program = parse(code, { next: true, ranges: true })

  type CallStatement = ESTree.ExpressionStatement & {
    expression: ESTree.CallExpression
  }

  // Find top-level `__export` calls.
  const namespaceExports = program.body.filter(
    node =>
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'CallExpression' &&
      node.expression.callee.type === 'Identifier' &&
      node.expression.callee.name === '__export'
  ) as CallStatement[]

  // Extract the namespace identifier from the `__export` call.
  const namespaceIds = select(namespaceExports, node =>
    node.expression.arguments[0].type === 'Identifier'
      ? node.expression.arguments[0].name
      : null
  )

  // This module has no namespace exports.
  if (!namespaceIds.length) {
    return null
  }

  // Map the namespace members to their declaration names.
  const namespaces: Record<string, Record<string, string>> = {}

  namespaceExports.forEach((namespaceExport, index) => {
    const members = namespaceExport.expression.arguments[1]
    if (members.type !== 'ObjectExpression') {
      return
    }

    const namespaceId = namespaceIds[index]
    namespaces[namespaceId] = {}

    for (const member of members.properties) {
      if (member.type !== 'Property') continue
      if (member.key.type !== 'Identifier') continue
      if (member.value.type !== 'ArrowFunctionExpression') continue
      if (member.value.body.type !== 'Identifier') continue

      const memberName = member.key.name
      const declarationName = member.value.body.name

      namespaces[namespaceId][memberName] = declarationName
    }
  })

  const draft = new MagicString(code)

  // Find member expressions that reference the namespace identifiers.
  walk(program, {
    enter(node) {
      if (node.type !== 'MemberExpression') return
      if (node.object.type !== 'Identifier') return
      if (!namespaceIds.includes(node.object.name)) return
      if (node.property.type !== 'Identifier') return

      const declarationName = namespaces[node.object.name][node.property.name]
      if (declarationName === node.property.name) {
        draft.remove(node.object.start!, node.object.end! + 1)
      } else {
        draft.overwrite(node.start!, node.end!, declarationName)
      }
    },
  })

  if (draft.hasChanged()) {
    return {
      code: draft.toString(),
      map: options.sourceMap
        ? draft.generateMap({ hires: 'boundary' })
        : undefined,
    }
  }

  // No changes needed.
  return null
}
