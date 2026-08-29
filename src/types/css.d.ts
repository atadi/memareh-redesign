// Ambient declarations for global (non-module) stylesheets imported for their
// side effects, e.g. `import "./globals.css"`. Next.js only ships a
// `*.module.css` declaration out of the box; plain CSS side-effect imports need
// this so `tsc` (and stricter editor TS versions) don't error with TS2882.
declare module '*.css';
