import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { ReaderProvider } from "@epubjs-react-native/core";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTheme } from "../../context/ThemeContext";
import ReaderContent from "../../components/reader/ReaderContent";

// Main screen component
export default function ReaderScreen() {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.page, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        />
        <ReaderProvider>
          <ReaderContent />
        </ReaderProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});
