import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { emptyDir, ensureDir } from 'fs-extra'
import consola from 'consola'
import camelcase from 'camelcase'
import glob from 'fast-glob'
import { format } from 'prettier'
import chalk from 'chalk'
import { pathComponents } from './paths'

import type { BuiltInParserName } from 'prettier'


//获取svg路径
const getSvgFiles = async () => {
  const dir = process.cwd().split("/")
  dir.pop()
  return glob('**/*.svg', { cwd: dir.join("/") + '/svg', absolute: true })
}

//获取svg文件名
const getName = (file: string) => {
  const filename = path.basename(file).replace('.svg', '')
  const componentName = camelcase(filename, { pascalCase: true })
  return {
    filename,
    componentName,
  }
}

const formatCode = (code: string, parser: BuiltInParserName = 'typescript') =>
  format(code, {
    parser,
    semi: false,
    singleQuote: true,
  })

const transformToVueComponent = async (file: string) => {
  const content = await readFile(file, 'utf-8')
  const { filename, componentName } = getName(file)
  const vue = formatCode(
    `
<template>
${content}
</template>
<script lang="ts">
import type { DefineComponent } from 'vue'
export default ({
  name: "${componentName}",
}) as DefineComponent
</script>`,
    'vue'
  )
  writeFile(path.resolve(pathComponents, `${filename}.vue`), vue, 'utf-8')
}

const generateEntry = async (files: string[]) => {
  const code = formatCode(
    files
      .map((file) => {
        const { filename, componentName } = getName(file)
        return `export { default as ${componentName} } from './${filename}.vue'`
      })
      .join('\n')
  )
  await writeFile(path.resolve(pathComponents, 'index.ts'), code, 'utf-8')
}

consola.info(chalk.blue('generating vue components'))
await ensureDir(pathComponents)
await emptyDir(pathComponents)
const files = await getSvgFiles()

consola.info(chalk.blue('generating vue files'))
await Promise.all(files.map((file) => transformToVueComponent(file)))

consola.info(chalk.blue('generating entry file'))
await generateEntry(files)
