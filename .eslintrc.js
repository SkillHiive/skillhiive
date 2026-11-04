module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  ignorePatterns: ["dist/", "build/", "node_modules/", ".turbo/", "*.config.*"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.base.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
    tsconfigRootDir: __dirname
  },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@skillhiive/ui", "@skillhiive/native"],
            "message": "Apps must not import ui/native directly. Use @skillhiive/core hooks instead."
          },
          {
            "group": ["@skillhiive/core/hooks/*"],
            "message": "Import from @skillhiive/core, not deep paths"
          }
        ]
      }
    ]
  }
};