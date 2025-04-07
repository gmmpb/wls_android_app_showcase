// Design Specifications:
// 1. Core UI: Minimalist home screen (grid/list toggle), smooth transitions, micro-interactions
// 2. Typography: 2–3 complementary fonts, clear hierarchy
// 3. Reading Interface: Adjustable margins, line spacing, responsive layout
// 4. Dark Mode: WCAG-compliant palettes, auto-switch by system setting
// 5. Library Management: "+" button for adding books, swipe-to-delete w/ undo, custom shelves/tags
// 6. Book Detail: Parallax hero, essential info (author, length, genre), progress bar
// 7. Reading Statistics: Weekly/monthly goals, reading speed, achievements
// 8. Auto-Page Turning: Slide/curl/fade animations, adjustable speed, gesture overrides
// 9. Accessibility: Min 44x44 px touch targets, consistent with iOS/Android guidelines

import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "../context/ThemeContext";

// Define theme colors with WCAG 2.1 compliance
const lightTheme = {
  background: "#FFFFFF",
  text: "#121212",
  primary: "#0A84FF",
  secondary: "#6C757D",
  accent: "#5E17EB",
  surface: "#F8F9FA",
  // Reading-specific colors
  pageBackground: "#FCFCFC",
  textPrimary: "#121212",
  textSecondary: "#555555",
};

const darkTheme = {
  background: "#121212",
  text: "#F8F9FA",
  primary: "#58A6FF",
  secondary: "#A8ADBA",
  accent: "#9D86E9",
  surface: "#1E1E1E",
  // Reading-specific colors - optimized for reduced eye strain
  pageBackground: "#121212",
  textPrimary: "#E1E1E1",
  textSecondary: "#B0B0B0",
};

export default function Layout() {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(
    colorScheme === "dark" ? darkTheme : lightTheme
  );

  useEffect(() => {
    // Update theme when system preference changes
    setTheme(colorScheme === "dark" ? darkTheme : lightTheme);
  }, [colorScheme]);

  return (
    <ThemeProvider theme={theme} setTheme={setTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontFamily: "Poppins-Medium", // Primary font
          },
          contentStyle: {
            backgroundColor: theme.background,
          },
          // Smooth transitions between screens
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false, // Full immersive mode for reading
            headerRight: () =>
              // Library view toggle (grid/list) would go here
              null,
          }}
        />
        <Stack.Screen
          name="book/[id]"
          options={{
            headerShown: false, // Full immersive mode for reading
          }}
        />
        <Stack.Screen
          name="reader/[id]"
          options={{
            headerShown: false, // Full immersive mode for reading
            animation: "fade", // Smooth fade transition for reader
            gestureEnabled: true, // Enable swipe back gesture
          }}
        />
        <Stack.Screen
          name="statistics"
          options={{
            title: "Reading Statistics",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
