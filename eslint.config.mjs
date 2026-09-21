import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Next 16 dropped `next lint` and ESLint 9 requires flat config, so this
// replaces the former .eslintrc.json. eslint-config-next 16 ships flat config
// directly — FlatCompat is not needed and in fact chokes on it.
export default [
    { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/**", ".claude/**"] },
    ...coreWebVitals,
    ...typescript,
    {
        // Existing code breaks these three rules, and CI has to be green from day one.
        // Each is downgraded to "warn" until its issues are fixed; whoever merges the
        // last fix for a rule sets it back to "error" here.
        rules: {
            "@typescript-eslint/no-explicit-any": "warn", // #29 #30 #31
            "react-hooks/set-state-in-effect": "warn", // #32 #33 #34
            "@typescript-eslint/no-require-imports": "warn", // #35 #36
        },
    },
];
