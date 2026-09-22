# DevForge

DevForge is the club's website and member portal where students learn, build, and contribute to real-world projects. Visit [devforge.club](https://www.devforge.club).

## Tech Stack

- Next.js App Router
- Tailwind CSS
- Firebase

## Getting Started

You need Node.js 24 and npm installed.

Clone the repository and install dependencies:

```bash
git clone https://github.com/<your-github-username>/DevForge.git
cd DevForge
npm install
```

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:3000`.

## CI Checks

Before submitting a pull request, run the same checks used by CI:

```bash
npm run lint
npm test
npm run build
```

- `npm run lint` checks the code with ESLint.
- `npm test` runs the Vitest tests.
- `npm run build` type-checks the app and creates the production build.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution and pull request guidelines.

