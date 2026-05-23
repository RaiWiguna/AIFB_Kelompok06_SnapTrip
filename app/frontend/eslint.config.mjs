import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]

export default config
