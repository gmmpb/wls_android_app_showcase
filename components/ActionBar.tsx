import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface ActionBarProps {
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchText: string;
  setSearchText: (value: string) => void;
}

export default function ActionBar({
  isSearching,
  setIsSearching,
  searchText,
  setSearchText,
}: ActionBarProps) {
  const { theme } = useTheme();
  const searchBarWidth = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleSearch = () => {
    if (isSearching) {
      setIsAnimating(true);
      Animated.timing(searchBarWidth, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setSearchText("");
        setIsSearching(false);
        setIsAnimating(false);
      });
    } else {
      setIsAnimating(true);
      setIsSearching(true);
      Animated.timing(searchBarWidth, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setIsAnimating(false);
      });
    }
  };

  return (
    <View style={[styles.actionBar, { backgroundColor: theme.background }]}>
      {isSearching || isAnimating ? (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.surface,
              width: searchBarWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["10%", "100%"],
              }),
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search your library"
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          <TouchableOpacity onPress={toggleSearch}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.surface }]}
          onPress={toggleSearch}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 40,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 6,
    fontFamily: "Poppins-Regular",
    height: 36,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
});
