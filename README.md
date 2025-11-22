# Junybase

Junybase is a modern, all-in-one online utility toolkit built with Next.js, TypeScript, and Tailwind CSS. It provides a collection of fast, client-side tools for developers, designers, and anyone looking to boost their productivity.

## ✨ Features

- **Modern & Responsive UI**: Clean, minimal design built with shadcn/ui and Tailwind CSS.
- **Light & Dark Modes**: Seamless theme switching.
- **Tool Categories**:
  - **Text**: Case Converter
  - **Code**: JSON Formatter, AI Code Assistant
  - **Design**: AI Color Palette Generator
  - **Generators**: Password Generator, QR Code Generator
  - **Image**: Image Compressor
- **Favorites**: Pin your most-used tools for quick access (uses `localStorage`).
- **AI-Powered**: Features like the Code Assistant and Color Palette Generator are enhanced with Google's Gemini model via Genkit.
- **Performance Optimized**: Lazy-loaded components and a high Lighthouse score.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm, pnpm, or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd junybase
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

To start the development server, run:

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).

### Building for Production

To create a production-ready build, run:

```bash
npm run build
```

This will generate an optimized version of the app in the `.next` folder.

### Running in Production Mode

To start the production server, run:

```bash
npm run start
```
