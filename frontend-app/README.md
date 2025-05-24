# PDF-Docat Frontend

A modern React frontend for PDF translation using the PDF-Docat API.

## Features

- 🎯 **Drag & Drop PDF Upload** - Easy file selection with visual feedback
- 🌍 **Multi-language Support** - Translate between 12+ languages
- 🔄 **Dual Language Mode** - Show original and translated text side by side
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Real-time Status** - Live API health monitoring
- 🎨 **Modern UI** - Clean, intuitive interface with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A running PDF-Docat backend API

### Installation

1. Clone or download the frontend project
2. Install dependencies:
```bash
npm install
```

3. Configure the API endpoint:
```bash
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL to your backend API URL
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Your backend API URL
VITE_API_BASE_URL=https://your-backend-api.replit.dev
```

### Supported Deployment Platforms

- **Vercel** - Zero-config deployment
- **Netlify** - Static site hosting
- **GitHub Pages** - Free hosting for public repos
- **Replit** - Full-stack development environment
- **Any static hosting** - The build output is just HTML/CSS/JS

## Deployment Examples

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variable: `VITE_API_BASE_URL`
3. Deploy automatically on push

### Netlify

1. Connect your repository or drag & drop the `dist/` folder
2. Set environment variable: `VITE_API_BASE_URL`
3. Configure build command: `npm run build`
4. Set publish directory: `dist`

### GitHub Pages

1. Build the project: `npm run build`
2. Push the `dist/` folder to `gh-pages` branch
3. Enable GitHub Pages in repository settings

## API Integration

The frontend communicates with the backend API through these endpoints:

- `GET /health` - Check API status
- `GET /api/v1/supported-languages` - Get available languages
- `POST /api/v1/translate` - Upload and translate PDF
- `GET /api/v1/download/{task_id}` - Download translated PDF
- `DELETE /api/v1/cleanup/{task_id}` - Clean up temporary files

## Development

### Project Structure

```
frontend-app/
├── src/
│   ├── lib/
│   │   ├── api.ts          # API client configuration
│   │   └── utils.ts        # Utility functions
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # React entry point
│   ├── index.css           # Global styles
│   └── vite-env.d.ts       # TypeScript definitions
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client
- **React Dropzone** - File upload handling
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check if `VITE_API_BASE_URL` is correctly set
   - Verify the backend API is running and accessible
   - Check browser console for CORS errors

2. **File Upload Fails**
   - Ensure the file is a valid PDF
   - Check file size limits (backend dependent)
   - Verify API endpoint is reachable

3. **Build Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (requires 18+)
   - Clear cache: `rm -rf node_modules package-lock.json && npm install`

### CORS Issues

If you encounter CORS errors, ensure your backend API has proper CORS configuration for your frontend domain.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License. 