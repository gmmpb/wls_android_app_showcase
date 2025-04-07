# 📚 eBook Reader

A modern, feature-rich eBook reader mobile application built with Expo and React Native. This app provides an elegant reading experience with support for EPUB files, library management, and customizable reading settings.

![App Screenshot Placeholder](./assets/screenshot-placeholder.png)

## ✨ Features

- **Elegant Reading Interface**: Clean, distraction-free reading experience
- **Library Management**: Import, organize, and manage your eBook collection
- **EPUB Support**: Read standard EPUB format books with full formatting support
- **Reading Progress**: Track your reading progress across your library
- **Book Metadata**: View detailed information about each book
- **Category Management**: Organize books with custom categories and tags
- **Dark/Light Mode**: Comfortable reading in any lighting condition
- **Customizable Typography**: Adjust font size, style, and spacing for the perfect reading experience
- **Table of Contents**: Easy navigation through book chapters and sections

## 🚀 Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/ebook-reader.git
   cd ebook-reader
   ```

2. Install dependencies

   ```bash
   npm install
   # or if you're using pnpm
   pnpm install
   ```

3. Start the development server
   ```bash
   npx expo start
   ```

## 📱 Running the App

After starting the development server, you can run the app on:

- **iOS Simulator** (requires macOS and Xcode)
- **Android Emulator** (requires Android Studio)
- **Physical Device** using the Expo Go app (scan the QR code)
- **Web Browser** (some features may be limited)

## 🛠️ Technologies

- [Expo](https://expo.dev/) - React Native development framework
- [React Native](https://reactnative.dev/) - Cross-platform mobile development
- [EPUB.js](https://github.com/futurepress/epub.js/) - EPUB parsing and rendering
- [@epubjs-react-native/core](https://github.com/epubjs-react-native/core) - React Native bindings for EPUB.js
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [Expo Router](https://docs.expo.dev/router/introduction/) - File-based routing
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) - Data persistence
- [React Native Paper](https://callstack.github.io/react-native-paper/) - Material Design components
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) - Native-driven gesture management

## 🧪 Development

### Project Structure

```
mobile-app-showcase-wls/
├── app/                    # Main application screens using file-based routing
├── assets/                 # Images, fonts and other static assets
├── components/             # Reusable UI components
│   ├── book-details/       # Book detail components
│   └── reader/             # Reader-specific components
├── context/                # React context for state management
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions and helpers
```

### Environment Setup

Ensure you have the following installed:

- Node.js (LTS version)
- npm or pnpm
- Expo CLI (`npm install -g expo-cli`)

For platform-specific development:

- iOS: macOS with Xcode installed
- Android: Android Studio with an emulator configured

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- EPUB.js for providing the core eBook rendering capabilities
- Expo team for the excellent React Native tooling
- Font providers (detail attribution for any custom fonts used)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
