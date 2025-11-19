# FinTrack Frontend

Next.js 14 landing page built with shadcn/ui components, adapted from the [shadcn-landing-page](https://github.com/leoMirandaa/shadcn-landing-page) template.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ Dark mode support (next-themes)
- ✅ Fully responsive design
- ✅ All landing page sections (Hero, Features, Pricing, FAQ, etc.)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx      # Root layout with theme provider
│   ├── page.tsx        # Landing page
│   └── globals.css     # Global styles and CSS variables
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── Navbar.tsx      # Navigation bar
│   ├── Hero.tsx        # Hero section
│   ├── Features.tsx    # Features section
│   └── ...             # Other landing page sections
└── lib/
    └── utils.ts        # Utility functions
```

## Customization

- Update content in each component file
- Modify colors in `app/globals.css` (CSS variables)
- Add/remove sections in `app/page.tsx`
- Customize theme in `tailwind.config.js`

## Build for Production

```bash
npm run build
npm start
```

## License

MIT

