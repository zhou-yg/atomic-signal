import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"
import replace from '@rollup/plugin-replace';
// import { nodeResolve } from '@rollup/plugin-node-resolve';

const base = {
  plugins: [
    tsPlugin({
      clean: true,
      tsconfig: './tsconfig.json',
    }),
  ],
  input: 'src/index.ts',
  external: ['eventemitter3', 'immer'],
}

export default [
  {
    ...base,
    plugins: [
      ...base.plugins,
      replace({
        'process.env.TARGET': '"server"',
        preventAssignment: true
      }),
    ],
    output: {
      file: 'dist/signal.js',
      format: 'commonjs'
    },
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
      replace({
        'process.env.TARGET': '"server"',
        preventAssignment: true
      }),
    ],
    output: {
      file: 'dist/core.esm.js',
      format: 'esm'
    },
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
      replace({
        'process.env.TARGET': '"client"',
        preventAssignment: true
      }),
    ],
    output: {
      file: 'dist/signal.client.esm.js',
      format: 'esm'
    }
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
      replace({
        'process.env.TARGET': '"client"',
        preventAssignment: true
      }),
    ],
    output: {
      file: 'dist/signal.client.js',
      format: 'cjs'
    }
  },
  {
    input: "src/index.ts",
    output: [
      { file: "dist/signal.client.d.ts", format: "es" },
      { file: "dist/signal.d.ts", format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]