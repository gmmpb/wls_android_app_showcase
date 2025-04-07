import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { router } from "expo-router";

export default function AddButton({
  style,
  onReturn,
}: {
  style?: ViewStyle;
  onReturn?: () => void;
}) {
  const { theme, isLightMode } = useTheme();

  const handlePress = () => {
    // Navigate to upload page with an onReturn callback
    router.push({
      pathname: "/upload",
      params: {
        onReturn: onReturn ? JSON.stringify({ shouldRefresh: true }) : "",
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: theme.accent }, style]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 100}
        tint={isLightMode ? "light" : "dark"}
        style={styles.blurEffect}
      >
        <Ionicons
          name="add"
          size={style ? 20 : 28} // Use smaller icon when in header
          color="#FFFFFF"
        />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  blurEffect: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});
