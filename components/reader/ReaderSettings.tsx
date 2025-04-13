import React, { forwardRef, useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Slider,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Button, Text, Divider, Chip } from "react-native-paper";
import { useTheme as usePaperTheme } from "react-native-paper";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useReader } from "@epubjs-react-native/core";

interface SettingOption {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: "toggle" | "select" | "action";
  value?: boolean | string | number;
  options?: Array<{ label: string; value: string | number }>;
  action?: () => void;
}

interface Props {
  onClose: () => void;
  onChangeFontSize?: (size: number) => void;
  onChangeTheme?: (theme: string) => void;
  onChangeFont?: (font: string) => void;
  onChangeLineHeight?: (height: number) => void;
  onToggleAutoPageTurn?: (enabled: boolean, interval: number) => void;
  onSearchBook?: (query: string) => Promise<any[]>;
  onNavigateToSearchResult?: (cfi: string) => void;
}

export type Ref = BottomSheetModalMethods;

export const ReaderSettings = forwardRef<Ref, Props>(
  (
    {
      onClose,
      onChangeFontSize,
      onChangeTheme,
      onChangeFont,
      onChangeLineHeight,
      onToggleAutoPageTurn,
      onSearchBook,
      onNavigateToSearchResult,
    },
    ref
  ) => {
    const { theme: readerTheme } = useReader();
    const paperTheme = usePaperTheme();
    const { theme: appTheme, toggleTheme } = useTheme();

    // Create a safe theme object to avoid undefined errors
    const safeTheme = {
      background:
        appTheme?.background || paperTheme.colors.background || "#FFFFFF",
      text: appTheme?.text || paperTheme.colors.onBackground || "#000000",
      primary: appTheme?.primary || paperTheme.colors.primary || "#6200ee",
      surface: appTheme?.surface || paperTheme.colors.surface || "#F6F6F6",
      border: "#E0E0E0",
      textSecondary: appTheme?.textSecondary || "#71717A",
    };

    // Default settings
    const [fontSize, setFontSize] = useState<number>(100);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(
      appTheme?.mode === "dark"
    );
    const [fontFamily, setFontFamily] = useState<string>("Default");

    // New settings
    const [lineHeight, setLineHeight] = useState<number>(1.5);
    const [autoPageTurn, setAutoPageTurn] = useState<boolean>(false);
    const [autoPageInterval, setAutoPageInterval] = useState<number>(10000); // 10 seconds default
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>("display"); // "display", "auto-turn", "search"

    // Settings options
    const [settings, setSettings] = useState<SettingOption[]>([
      {
        id: "darkMode",
        title: "Dark Mode",
        description: "Switch between light and dark theme",
        icon: "moon",
        type: "toggle",
        value: isDarkMode,
      },
      {
        id: "fontSizeSmaller",
        title: "Smaller Text",
        icon: "text",
        type: "action",
        action: () => {
          const newSize = Math.max(70, fontSize - 10);
          setFontSize(newSize);
          onChangeFontSize?.(newSize);
        },
      },
      {
        id: "fontSizeLarger",
        title: "Larger Text",
        icon: "text",
        type: "action",
        action: () => {
          const newSize = Math.min(150, fontSize + 10);
          setFontSize(newSize);
          onChangeFontSize?.(newSize);
        },
      },
      {
        id: "fontFamily",
        title: "Font",
        description: fontFamily,
        icon: "text",
        type: "select",
        value: fontFamily,
        options: [
          { label: "Default", value: "Default" },
          { label: "Serif", value: "serif" },
          { label: "Sans-serif", value: "sans-serif" },
          { label: "Monospace", value: "monospace" },
        ],
      },
    ]);

    const snapPoints = React.useMemo(() => ["40%", "70%"], []);

    const handleToggleDarkMode = () => {
      setIsDarkMode(!isDarkMode);
      toggleTheme();

      // Update the settings array
      setSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting.id === "darkMode"
            ? { ...setting, value: !isDarkMode }
            : setting
        )
      );
    };

    const handleChangeFontFamily = (value: string) => {
      // Convert value to lowercase to match what [id].tsx expects
      const lowerValue = value.toLowerCase();
      setFontFamily(value);
      onChangeFont?.(lowerValue);

      // Update the settings array
      setSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting.id === "fontFamily"
            ? { ...setting, description: value, value }
            : setting
        )
      );
    };

    // Update line height handler
    const handleLineHeightChange = (newLineHeight: number) => {
      setLineHeight(newLineHeight);
      onChangeLineHeight?.(newLineHeight);
    };

    // Handle auto page turn toggle
    const handleAutoPageTurnToggle = () => {
      const newValue = !autoPageTurn;
      setAutoPageTurn(newValue);
      onToggleAutoPageTurn?.(newValue, autoPageInterval);
    };

    // Handle auto page interval change
    const handleIntervalChange = (interval: number) => {
      setAutoPageInterval(interval);
      if (autoPageTurn) {
        onToggleAutoPageTurn?.(true, interval);
      }
    };

    // Handle search query submission
    const handleSearch = async () => {
      if (!searchQuery.trim() || !onSearchBook) return;

      setIsSearching(true);
      try {
        const results = await onSearchBook(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching book:", error);
      } finally {
        setIsSearching(false);
      }
    };

    // Handle navigation to search result
    const handleNavigateToResult = (cfi: string) => {
      onNavigateToSearchResult?.(cfi);
      onClose();
    };

    const renderItem = ({ item }: { item: SettingOption }) => {
      return (
        <View
          style={[styles.settingItem, { borderBottomColor: safeTheme.border }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons
              name={item.icon as any}
              size={24}
              color={safeTheme.text}
              style={styles.settingIcon}
            />
            <View>
              <Text style={[styles.settingTitle, { color: safeTheme.text }]}>
                {item.title}
              </Text>
              {item.description && (
                <Text
                  style={[
                    styles.settingDescription,
                    { color: safeTheme.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>
              )}
            </View>
          </View>

          {item.type === "toggle" && (
            <Switch
              value={item.value as boolean}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: "#767577", true: safeTheme.primary }}
              thumbColor={"#f4f3f4"}
            />
          )}

          {item.type === "action" && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: safeTheme.primary },
              ]}
              onPress={item.action}
            >
              <Text style={styles.actionButtonText}>
                {item.id === "fontSizeLarger" ? "A+" : "A-"}
              </Text>
            </TouchableOpacity>
          )}

          {item.type === "select" && (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                // For simplicity, just cycle through options when pressed
                if (item.options && item.options.length > 0) {
                  const currentIndex = item.options.findIndex(
                    (opt) => opt.value === item.value
                  );
                  const nextIndex = (currentIndex + 1) % item.options.length;
                  handleChangeFontFamily(
                    item.options[nextIndex].value as string
                  );
                }
              }}
            >
              <Text
                style={[styles.selectButtonText, { color: safeTheme.primary }]}
              >
                Change
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={safeTheme.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    };

    const header = React.useCallback(
      () => (
        <View
          style={[
            styles.headerContainer,
            { backgroundColor: safeTheme.background },
          ]}
        >
          <View style={styles.titleContainer}>
            <Text
              variant="titleLarge"
              style={{
                color: safeTheme.text,
                fontFamily: "Poppins-SemiBold",
                fontSize: 20,
              }}
            >
              Reader Settings
            </Text>

            <Button
              mode="text"
              textColor={safeTheme.primary}
              onPress={onClose}
              labelStyle={{ fontFamily: "Poppins-Medium" }}
            >
              Close
            </Button>
          </View>

          <Divider
            style={[styles.divider, { backgroundColor: "rgba(0,0,0,0.06)" }]}
          />

          <View style={styles.fontSizeContainer}>
            <Text style={[styles.fontSizeText, { color: safeTheme.text }]}>
              Text Size: {fontSize}%
            </Text>
            <View style={styles.fontSizeSlider}>
              <TouchableOpacity
                style={[
                  styles.fontSizeButton,
                  { backgroundColor: safeTheme.primary },
                ]}
                onPress={() => {
                  const newSize = Math.max(70, fontSize - 10);
                  setFontSize(newSize);
                  onChangeFontSize?.(newSize);
                }}
              >
                <Text style={styles.fontSizeButtonText}>A-</Text>
              </TouchableOpacity>

              <View style={styles.fontSizeTrack}>
                <View
                  style={[
                    styles.fontSizeFill,
                    {
                      width: `${((fontSize - 70) / 80) * 100}%`,
                      backgroundColor: safeTheme.primary,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.fontSizeButton,
                  { backgroundColor: safeTheme.primary },
                ]}
                onPress={() => {
                  const newSize = Math.min(150, fontSize + 10);
                  setFontSize(newSize);
                  onChangeFontSize?.(newSize);
                }}
              >
                <Text style={styles.fontSizeButtonText}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ),
      [onClose, safeTheme, fontSize]
    );

    return (
      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          style={{
            ...styles.container,
            backgroundColor: safeTheme.background,
          }}
          handleStyle={{
            backgroundColor: safeTheme.background,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          backgroundStyle={{
            backgroundColor: safeTheme.background,
          }}
          handleIndicatorStyle={{
            backgroundColor: safeTheme.textSecondary,
            width: 40,
            height: 4,
          }}
        >
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <Text
                variant="titleLarge"
                style={{
                  color: safeTheme.text,
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 20,
                }}
              >
                Reader Settings
              </Text>

              <Button
                mode="text"
                textColor={safeTheme.primary}
                onPress={onClose}
                labelStyle={{ fontFamily: "Poppins-Medium" }}
              >
                Close
              </Button>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "display" && {
                    borderBottomColor: safeTheme.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("display")}
              >
                <Ionicons
                  name="text"
                  size={18}
                  color={
                    activeTab === "display"
                      ? safeTheme.primary
                      : safeTheme.textSecondary
                  }
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "display"
                          ? safeTheme.primary
                          : safeTheme.textSecondary,
                    },
                  ]}
                >
                  Display
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "auto-turn" && {
                    borderBottomColor: safeTheme.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("auto-turn")}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={
                    activeTab === "auto-turn"
                      ? safeTheme.primary
                      : safeTheme.textSecondary
                  }
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "auto-turn"
                          ? safeTheme.primary
                          : safeTheme.textSecondary,
                    },
                  ]}
                >
                  Auto Turn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "search" && {
                    borderBottomColor: safeTheme.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("search")}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={
                    activeTab === "search"
                      ? safeTheme.primary
                      : safeTheme.textSecondary
                  }
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "search"
                          ? safeTheme.primary
                          : safeTheme.textSecondary,
                    },
                  ]}
                >
                  Search
                </Text>
              </TouchableOpacity>
            </View>

            <Divider
              style={[styles.divider, { backgroundColor: "rgba(0,0,0,0.06)" }]}
            />
          </View>

          <BottomSheetScrollView
            style={[styles.list, { backgroundColor: safeTheme.background }]}
            contentContainerStyle={styles.listContent}
          >
            {/* Display Settings Tab */}
            {activeTab === "display" && (
              <View>
                {/* Font Size Control */}
                <View style={styles.settingSection}>
                  <Text
                    style={[styles.sectionTitle, { color: safeTheme.text }]}
                  >
                    Font Size
                  </Text>
                  <View style={styles.fontSizeSlider}>
                    <TouchableOpacity
                      style={[
                        styles.fontSizeButton,
                        { backgroundColor: safeTheme.primary },
                      ]}
                      onPress={() => {
                        const newSize = Math.max(70, fontSize - 10);
                        setFontSize(newSize);
                        onChangeFontSize?.(newSize);
                      }}
                    >
                      <Text style={styles.fontSizeButtonText}>A-</Text>
                    </TouchableOpacity>

                    <View style={styles.fontSizeTrack}>
                      <View
                        style={[
                          styles.fontSizeFill,
                          {
                            width: `${((fontSize - 70) / 80) * 100}%`,
                            backgroundColor: safeTheme.primary,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.fontSizeButton,
                        { backgroundColor: safeTheme.primary },
                      ]}
                      onPress={() => {
                        const newSize = Math.min(150, fontSize + 10);
                        setFontSize(newSize);
                        onChangeFontSize?.(newSize);
                      }}
                    >
                      <Text style={styles.fontSizeButtonText}>A+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.valueLabel,
                      { color: safeTheme.textSecondary },
                    ]}
                  >
                    {fontSize}%
                  </Text>
                </View>

                {/* Line Height Control */}
                <View style={styles.settingSection}>
                  <Text
                    style={[styles.sectionTitle, { color: safeTheme.text }]}
                  >
                    Line Spacing
                  </Text>
                  <View style={styles.sliderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.adjustButton,
                        { backgroundColor: safeTheme.primary },
                      ]}
                      onPress={() => {
                        const newHeight = Math.max(1.0, lineHeight - 0.1);
                        handleLineHeightChange(
                          parseFloat(newHeight.toFixed(1))
                        );
                      }}
                    >
                      <Ionicons name="remove" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          {
                            width: `${((lineHeight - 1.0) / 1.5) * 100}%`,
                            backgroundColor: safeTheme.primary,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.adjustButton,
                        { backgroundColor: safeTheme.primary },
                      ]}
                      onPress={() => {
                        const newHeight = Math.min(2.5, lineHeight + 0.1);
                        handleLineHeightChange(
                          parseFloat(newHeight.toFixed(1))
                        );
                      }}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.valueLabel,
                      { color: safeTheme.textSecondary },
                    ]}
                  >
                    {lineHeight.toFixed(1)}×
                  </Text>
                </View>

                {/* Font Family Selection */}
                <View style={styles.settingSection}>
                  <Text
                    style={[styles.sectionTitle, { color: safeTheme.text }]}
                  >
                    Font Family
                  </Text>
                  <View style={styles.fontFamilyContainer}>
                    {["Default", "Serif", "Sans-serif", "Monospace"].map(
                      (font) => (
                        <TouchableOpacity
                          key={font}
                          style={[
                            styles.fontOption,
                            fontFamily === font && {
                              backgroundColor: `${safeTheme.primary}20`,
                              borderColor: safeTheme.primary,
                            },
                          ]}
                          onPress={() =>
                            handleChangeFontFamily(
                              // Convert to lowercase to match [id].tsx handler
                              font === "Default"
                                ? "default"
                                : font.toLowerCase()
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.fontOptionText,
                              {
                                color:
                                  fontFamily === font
                                    ? safeTheme.primary
                                    : safeTheme.text,
                              },
                              font === "Serif" && {
                                fontFamily: "Georgia, serif",
                              },
                              font === "Sans-serif" && {
                                fontFamily: "Arial, sans-serif",
                              },
                              font === "Monospace" && {
                                fontFamily: "monospace",
                              },
                            ]}
                          >
                            {font}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {/* Theme Option */}
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons
                      name="moon"
                      size={24}
                      color={safeTheme.text}
                      style={styles.settingIcon}
                    />
                    <View>
                      <Text
                        style={[styles.settingTitle, { color: safeTheme.text }]}
                      >
                        Dark Mode
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: safeTheme.textSecondary },
                        ]}
                      >
                        Switch between light and dark theme
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={handleToggleDarkMode}
                    trackColor={{ false: "#767577", true: safeTheme.primary }}
                    thumbColor={"#f4f3f4"}
                  />
                </View>
              </View>
            )}

            {/* Auto Page Turn Tab */}
            {activeTab === "auto-turn" && (
              <View>
                <View style={styles.settingSection}>
                  <Text
                    style={[styles.sectionTitle, { color: safeTheme.text }]}
                  >
                    Auto Page Turn
                  </Text>
                  <Text
                    style={[
                      styles.sectionDescription,
                      { color: safeTheme.textSecondary },
                    ]}
                  >
                    Automatically turn pages with a custom time interval
                  </Text>

                  <View style={styles.toggleContainer}>
                    <Text
                      style={[styles.toggleLabel, { color: safeTheme.text }]}
                    >
                      Enable Auto Turn
                    </Text>
                    <Switch
                      value={autoPageTurn}
                      onValueChange={handleAutoPageTurnToggle}
                      trackColor={{ false: "#767577", true: safeTheme.primary }}
                      thumbColor={"#f4f3f4"}
                    />
                  </View>

                  <View style={styles.intervalSection}>
                    <Text
                      style={[styles.intervalLabel, { color: safeTheme.text }]}
                    >
                      Turn Interval: {autoPageInterval / 1000} seconds
                    </Text>

                    <View style={styles.intervalControls}>
                      <TouchableOpacity
                        style={[
                          styles.intervalButton,
                          { backgroundColor: safeTheme.primary },
                        ]}
                        onPress={() => {
                          const newInterval = Math.max(
                            3000,
                            autoPageInterval - 1000
                          );
                          handleIntervalChange(newInterval);
                        }}
                        disabled={!autoPageTurn}
                      >
                        <Text style={styles.intervalButtonText}>-1s</Text>
                      </TouchableOpacity>

                      <View style={styles.sliderTrack}>
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              width: `${
                                ((autoPageInterval - 3000) / 27000) * 100
                              }%`,
                              backgroundColor: autoPageTurn
                                ? safeTheme.primary
                                : "#cccccc",
                            },
                          ]}
                        />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.intervalButton,
                          { backgroundColor: safeTheme.primary },
                        ]}
                        onPress={() => {
                          const newInterval = Math.min(
                            30000,
                            autoPageInterval + 1000
                          );
                          handleIntervalChange(newInterval);
                        }}
                        disabled={!autoPageTurn}
                      >
                        <Text style={styles.intervalButtonText}>+1s</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.presetContainer}>
                      <Text
                        style={[
                          styles.presetTitle,
                          { color: safeTheme.textSecondary },
                        ]}
                      >
                        Presets:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {[5, 10, 15, 20, 30].map((seconds) => (
                          <TouchableOpacity
                            key={seconds}
                            style={[
                              styles.presetChip,
                              autoPageInterval === seconds * 1000 && {
                                backgroundColor: `${safeTheme.primary}20`,
                                borderColor: safeTheme.primary,
                              },
                              !autoPageTurn && styles.disabledChip,
                            ]}
                            onPress={() => handleIntervalChange(seconds * 1000)}
                            disabled={!autoPageTurn}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                {
                                  color:
                                    autoPageInterval === seconds * 1000
                                      ? safeTheme.primary
                                      : safeTheme.text,
                                },
                                !autoPageTurn && { color: "#888888" },
                              ]}
                            >
                              {seconds}s
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Search Tab */}
            {activeTab === "search" && (
              <View>
                <View style={styles.searchContainer}>
                  <Text
                    style={[styles.sectionTitle, { color: safeTheme.text }]}
                  >
                    Search Book
                  </Text>
                  <Text
                    style={[
                      styles.sectionDescription,
                      { color: safeTheme.textSecondary },
                    ]}
                  >
                    Find words or phrases in the current book
                  </Text>

                  <View style={styles.searchInputContainer}>
                    <BottomSheetTextInput
                      style={[
                        styles.searchInput,
                        {
                          color: safeTheme.text,
                          borderColor: safeTheme.border,
                          backgroundColor: `${safeTheme.textSecondary}10`,
                        },
                      ]}
                      placeholder="Enter search term..."
                      placeholderTextColor={safeTheme.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity
                      style={[
                        styles.searchButton,
                        { backgroundColor: safeTheme.primary },
                      ]}
                      onPress={handleSearch}
                    >
                      {isSearching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="search" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      <Text
                        style={[styles.resultHeader, { color: safeTheme.text }]}
                      >
                        {searchResults.length} results found
                      </Text>

                      <FlatList
                        data={searchResults}
                        keyExtractor={(item, index) => `result-${index}`}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.resultItem,
                              { borderBottomColor: safeTheme.border },
                            ]}
                            onPress={() => handleNavigateToResult(item.cfi)}
                          >
                            <Text
                              style={[
                                styles.resultText,
                                { color: safeTheme.text },
                              ]}
                            >
                              {item.excerpt}
                            </Text>
                            <Text
                              style={[
                                styles.resultLocation,
                                { color: safeTheme.textSecondary },
                              ]}
                            >
                              {item.location}
                            </Text>
                          </TouchableOpacity>
                        )}
                        style={styles.resultsList}
                      />
                    </View>
                  )}

                  {searchResults.length === 0 &&
                    searchQuery.length > 0 &&
                    !isSearching && (
                      <View style={styles.noResults}>
                        <Ionicons
                          name="search-outline"
                          size={40}
                          color={safeTheme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.noResultsText,
                            { color: safeTheme.textSecondary },
                          ]}
                        >
                          No results found for "{searchQuery}"
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  titleContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  fontSizeContainer: {
    marginVertical: 16,
  },
  fontSizeText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  fontSizeSlider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  fontSizeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 2,
    marginHorizontal: 12,
  },
  fontSizeFill: {
    height: 4,
    borderRadius: 2,
  },
  list: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 30,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 4,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  tab: {
    alignItems: "center",
    paddingVertical: 8,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  settingSection: {
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 16,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 2,
    marginHorizontal: 12,
  },
  sliderFill: {
    height: 4,
    borderRadius: 2,
  },
  valueLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 8,
    textAlign: "center",
  },
  fontFamilyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  fontOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 8,
  },
  fontOptionText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  intervalSection: {
    marginVertical: 16,
  },
  intervalLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  intervalControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intervalButton: {
    width: 50,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  presetContainer: {
    marginTop: 16,
  },
  presetTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  disabledChip: {
    backgroundColor: "#f0f0f0",
    borderColor: "#cccccc",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResults: {
    marginTop: 16,
  },
  resultHeader: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  resultsList: {
    marginTop: 8,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  resultLocation: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
  },
  noResults: {
    alignItems: "center",
    marginTop: 32,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 8,
  },
});
