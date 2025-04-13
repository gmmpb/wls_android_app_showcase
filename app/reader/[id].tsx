import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { ReaderProvider, Reader, useReader } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import {
  getBookFile,
  updateReadingProgress,
  getMetaFromAsyncStorage,
  getReaderPreferences,
  saveReaderPreferences,
} from "../../utils/bookStorage";
import {
  TableOfContents,
  Ref as TOCRef,
} from "../../components/reader/TableOfContent";
import {
  ReaderSettings,
  Ref as SettingsRef,
} from "../../components/reader/ReaderSettings";

// Simple header with back button and title
function ReaderHeader({
  title,
  onBack,
  progress,
  onOpenTOC,
  onOpenSettings,
}: {
  title: string;
  onBack: () => void;
  progress: number;
  onOpenTOC: () => void;
  onOpenSettings: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onOpenSettings} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenTOC} style={styles.headerButton}>
          <Ionicons name="list-outline" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progress}%
        </Text>
      </View>
    </View>
  );
}

// Component to ensure progress updates are consistent
function ProgressDisplay({ progress }: { progress: number }) {
  // Use a reference to track and display the highest seen progress value
  const highestProgressRef = useRef<number>(progress);
  const [displayProgress, setDisplayProgress] = useState<number>(progress);

  // Update the displayed progress when the input progress changes
  useEffect(() => {
    // Only update to show higher progress values (prevents flickering and inconsistency)
    if (progress > highestProgressRef.current) {
      highestProgressRef.current = progress;
      setDisplayProgress(progress);
    } else if (progress > 0 && displayProgress === 0) {
      // Edge case: If we're showing 0 but have non-zero progress, update it
      setDisplayProgress(progress);
    }
  }, [progress, displayProgress]);

  return displayProgress;
}

// Core reader component
function BookReader() {
  const { id } = useLocalSearchParams();
  const bookId = Array.isArray(id) ? id[0] : id;
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const tocRef = useRef<TOCRef>(null);
  const settingsRef = useRef<SettingsRef>(null);

  // Add a ref to track if we have auto-navigated from TOC
  const hasAutoNavigatedRef = useRef(false);
  // Store TOC data in state once we get it
  const [tocData, setTocData] = useState([]);

  // Basic state
  const [bookTitle, setBookTitle] = useState("Book Reader");
  const [bookPath, setBookPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Store the total locations count to provide consistent progress calculation
  const [totalBookLocations, setTotalBookLocations] = useState(0);
  // Flag to track if progress has been updated from location change
  const progressUpdatedRef = useRef(false);
  // Store the latest location to ensure we can save it when the component unmounts
  const latestLocationRef = useRef<any>(null);
  // Ref to track if a save operation is in progress to prevent race conditions
  const savingInProgressRef = useRef(false);
  // Ref to store the last saved progress to prevent unnecessary/duplicate saves
  const lastSavedProgressRef = useRef<number>(0);

  const { getCurrentLocation, goToLocation, totalLocations, key, toc } =
    useReader();

  // Auto page turn state and timer
  const [autoPageTurnEnabled, setAutoPageTurnEnabled] =
    useState<boolean>(false);
  const [autoPageInterval, setAutoPageInterval] = useState<number>(10000); // 10 seconds default
  const autoPageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Line height state
  const [lineHeight, setLineHeight] = useState<number>(1.5);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Function to handle navigation from the TOC
  const handleTOCNavigation = useCallback(
    (section) => {
      console.log(
        "Navigation handler called with section:",
        JSON.stringify(section, null, 2)
      );

      if (!section) return;

      try {
        // Try each navigation method in sequence
        if (section.cfi) {
          console.log("Navigating with CFI:", section.cfi);
          goToLocation(section.cfi);
          return true;
        }

        if (section.href) {
          console.log("Navigating with href:", section.href);
          goToLocation(section.href);
          return true;
        }

        if (section.id) {
          console.log("Navigating with id:", section.id);
          goToLocation(section.id);
          return true;
        }

        return false;
      } catch (error) {
        console.error("Navigation error:", error);
        return false;
      }
    },
    [goToLocation]
  );

  // Get a spine item CFI from TOC href
  const getCfiFromHref = useCallback(
    (href) => {
      // If it's already a CFI, return it
      if (href && href.includes("epubcfi(")) {
        return href;
      }

      // We need to render proper CFI for navigation since goToLocation only accepts CFI
      try {
        // Use the internal EPUB.js methods to generate a CFI from href
        const rendition = key.current?.rendition;
        if (rendition) {
          // Clean the href (remove leading slash if present)
          const cleanHref = href?.startsWith("/") ? href.substring(1) : href;

          // Generate a proper CFI using spine position
          const spineItem = rendition.book.spine.find((item) => {
            // Match the spine item's href with the TOC href
            const itemUrl = item.href || "";
            return itemUrl === cleanHref || cleanHref?.includes(itemUrl);
          });

          if (spineItem) {
            // Get the spine position
            const spineIndex = rendition.book.spine.indexOf(spineItem);
            if (spineIndex >= 0) {
              // Create a CFI for the spine item's start
              const cfi = `epubcfi(/6/${spineIndex * 2 + 2}!)`;
              console.log(`Generated CFI ${cfi} for href ${href}`);
              return cfi;
            }
          }
        }
      } catch (error) {
        console.error("Failed to generate CFI from href:", error);
      }
      return null;
    },
    [key]
  );

  // Function to navigate to TOC sections using only CFI
  const navigateToTocSection = useCallback(
    (section) => {
      console.log(
        "Navigating to TOC section:",
        JSON.stringify(section, null, 2)
      );

      if (!section) return false;

      try {
        // First close the TOC modal for better UX
        tocRef.current?.dismiss();

        // 1. If section already has CFI, use it directly (best option)
        if (section.cfi) {
          console.log("Using existing CFI for navigation:", section.cfi);
          goToLocation(section.cfi);
          return true;
        }

        // 2. If section has href, convert it to a proper CFI
        if (section.href) {
          // Generate a proper CFI from the href
          const generatedCfi = getCfiFromHref(section.href);
          if (generatedCfi) {
            console.log("Using generated CFI for navigation:", generatedCfi);
            goToLocation(generatedCfi);
            return true;
          }
        }

        // 3. If we have subitems, try navigating to the first one
        if (section.subitems && section.subitems.length > 0) {
          const firstSubitem = section.subitems[0];
          if (firstSubitem.cfi) {
            console.log(
              "Using first subitem's CFI for navigation:",
              firstSubitem.cfi
            );
            goToLocation(firstSubitem.cfi);
            return true;
          }

          if (firstSubitem.href) {
            const subitemCfi = getCfiFromHref(firstSubitem.href);
            if (subitemCfi) {
              console.log(
                "Using generated CFI from first subitem for navigation:",
                subitemCfi
              );
              goToLocation(subitemCfi);
              return true;
            }
          }
        }

        // 4. Last resort - fallback to older navigation methods
        console.log("Falling back to direct href navigation (may not work)");
        if (section.href) {
          const cleanHref = section.href.startsWith("/")
            ? section.href.substring(1)
            : section.href;
          goToLocation(cleanHref);
        } else if (section.id) {
          const cleanId = section.id.startsWith("/")
            ? section.id.substring(1)
            : section.id;
          goToLocation(cleanId);
        }

        return true;
      } catch (error) {
        console.error("Navigation error:", error);
        return false;
      }
    },
    [goToLocation, getCfiFromHref]
  );

  // Create stable theme object for the reader to prevent re-renders
  const readerTheme = useMemo(
    () => ({
      body: {
        background: theme.background,
        color: theme.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    }),
    [theme.background, theme.text]
  );

  // Font size change handler
  const handleChangeFontSize = useCallback(
    (size: number) => {
      try {
        const rendition = key.current?.rendition;
        if (rendition) {
          // Update the font size in the reader
          rendition.themes.fontSize(`${size}%`);
          console.log(`Font size changed to ${size}%`);

          // Save user preference
          saveReaderPreferences(bookId, { fontSize: size }).catch((err) =>
            console.error("Error saving font size preference:", err)
          );
        }
      } catch (error) {
        console.error("Error changing font size:", error);
      }
    },
    [key, bookId]
  );

  // Font family change handler
  const handleChangeFontFamily = useCallback(
    (fontFamily: string) => {
      try {
        const rendition = key.current?.rendition;
        if (rendition) {
          let fontFamilyValue = "system-ui, -apple-system, sans-serif";

          // Map the font family selection to CSS font family values
          switch (fontFamily) {
            case "serif":
              fontFamilyValue = "Georgia, serif";
              break;
            case "sans-serif":
              fontFamilyValue = "Arial, Helvetica, sans-serif";
              break;
            case "monospace":
              fontFamilyValue = "Courier New, monospace";
              break;
            default:
              fontFamilyValue = "system-ui, -apple-system, sans-serif";
          }

          // Update the font family in the reader
          rendition.themes.font(fontFamilyValue);
          console.log(
            `Font family changed to ${fontFamily} (${fontFamilyValue})`
          );

          // Save user preference
          saveReaderPreferences(bookId, { fontFamily }).catch((err) =>
            console.error("Error saving font family preference:", err)
          );
        }
      } catch (error) {
        console.error("Error changing font family:", error);
      }
    },
    [key, bookId]
  );

  // Line height handler
  const handleChangeLineHeight = useCallback(
    (newLineHeight: number) => {
      try {
        const rendition = key.current?.rendition;
        if (rendition) {
          // Update line height in the reader
          rendition.themes.override("line-height", `${newLineHeight}`);
          setLineHeight(newLineHeight);
          console.log(`Line height changed to ${newLineHeight}`);

          // Save user preference
          saveReaderPreferences(bookId, { lineHeight: newLineHeight }).catch(
            (err) => console.error("Error saving line height preference:", err)
          );
        }
      } catch (error) {
        console.error("Error changing line height:", error);
      }
    },
    [key, bookId]
  );

  // Auto page turn handler
  const handleToggleAutoPageTurn = useCallback(
    (enabled: boolean, interval: number) => {
      // Clear any existing timer
      if (autoPageTimerRef.current) {
        clearInterval(autoPageTimerRef.current);
        autoPageTimerRef.current = null;
      }

      setAutoPageTurnEnabled(enabled);
      setAutoPageInterval(interval);

      if (enabled) {
        console.log(`Auto page turn enabled with interval: ${interval}ms`);

        // Start auto page turning
        autoPageTimerRef.current = setInterval(() => {
          try {
            const rendition = key.current?.rendition;
            if (rendition) {
              // Move to the next page
              rendition.next();
            }
          } catch (error) {
            console.error("Error during auto page turn:", error);
          }
        }, interval);
      } else {
        console.log("Auto page turn disabled");
      }

      // Save user preferences
      saveReaderPreferences(bookId, {
        autoPageTurn: enabled,
        autoPageInterval: interval,
      }).catch((err) =>
        console.error("Error saving auto page turn preferences:", err)
      );

      return () => {
        if (autoPageTimerRef.current) {
          clearInterval(autoPageTimerRef.current);
        }
      };
    },
    [key, bookId]
  );

  // Book search handler
  const handleSearchBook = useCallback(
    async (query: string): Promise<any[]> => {
      try {
        const rendition = key.current?.rendition;
        if (!rendition || !query.trim()) {
          return [];
        }

        console.log(`Searching book for: "${query}"`);

        // Use the epub.js search function
        const results = await rendition.book.search(query);

        // Transform results to a more useful format
        const formattedResults = results.map((result: any, index: number) => {
          // Get the chapter/section name if available
          let location = "Unknown location";
          try {
            const chapter = rendition.book.spine.get(result.cfi);
            if (chapter && chapter.href) {
              const section = tocData.find(
                (item: any) => item.href && chapter.href.includes(item.href)
              );
              location = section ? section.label : `Section ${index + 1}`;
            }
          } catch (err) {
            console.error("Error getting location for search result:", err);
          }

          return {
            cfi: result.cfi,
            excerpt: result.excerpt || `...${query}...`,
            location,
            index,
          };
        });

        console.log(`Found ${formattedResults.length} results for "${query}"`);
        return formattedResults;
      } catch (error) {
        console.error("Error searching book:", error);
        return [];
      }
    },
    [key, tocData]
  );

  // Load book metadata and last location when reader is ready
  const handleReady = async () => {
    try {
      const bookMeta = await getMetaFromAsyncStorage(bookId);

      if (bookMeta) {
        setBookTitle(bookMeta.title);

        // Set initial progress from stored metadata and track it in our references
        if (
          typeof bookMeta.readingProgress === "number" &&
          bookMeta.readingProgress > 0
        ) {
          console.log(
            "Setting initial reading progress from metadata:",
            bookMeta.readingProgress
          );
          setReadingProgress(bookMeta.readingProgress);
          lastSavedProgressRef.current = bookMeta.readingProgress;
          progressUpdatedRef.current = true;
        }

        // Load saved reader preferences
        try {
          const preferences = await getReaderPreferences(bookId);
          if (preferences) {
            console.log("Loaded reader preferences:", preferences);
            const rendition = key.current?.rendition;

            // Apply font size if saved
            if (preferences.fontSize && rendition) {
              rendition.themes.fontSize(`${preferences.fontSize}%`);
              console.log(`Applied saved font size: ${preferences.fontSize}%`);
            }

            // Apply font family if saved
            if (preferences.fontFamily && rendition) {
              let fontFamilyValue = "system-ui, -apple-system, sans-serif";

              // Map the font family selection to CSS font family values
              switch (preferences.fontFamily) {
                case "serif":
                  fontFamilyValue = "Georgia, serif";
                  break;
                case "sans-serif":
                  fontFamilyValue = "Arial, Helvetica, sans-serif";
                  break;
                case "monospace":
                  fontFamilyValue = "Courier New, monospace";
                  break;
                default:
                  fontFamilyValue = "system-ui, -apple-system, sans-serif";
              }

              rendition.themes.font(fontFamilyValue);
              console.log(
                `Applied saved font family: ${preferences.fontFamily}`
              );
            }

            // Apply line height if saved
            if (preferences.lineHeight && rendition) {
              rendition.themes.override(
                "line-height",
                `${preferences.lineHeight}`
              );
              setLineHeight(preferences.lineHeight);
              console.log(
                `Applied saved line height: ${preferences.lineHeight}`
              );
            }

            // Apply auto page turn settings if saved
            if (preferences.autoPageTurn !== undefined) {
              setAutoPageTurnEnabled(preferences.autoPageTurn);

              if (preferences.autoPageInterval) {
                setAutoPageInterval(preferences.autoPageInterval);
              }

              // If auto page turn was enabled, start the timer
              if (preferences.autoPageTurn && preferences.autoPageInterval) {
                if (autoPageTimerRef.current) {
                  clearInterval(autoPageTimerRef.current);
                }

                autoPageTimerRef.current = setInterval(() => {
                  try {
                    if (rendition) {
                      rendition.next();
                    }
                  } catch (error) {
                    console.error("Error during auto page turn:", error);
                  }
                }, preferences.autoPageInterval);

                console.log(
                  `Restored auto page turn with interval: ${preferences.autoPageInterval}ms`
                );
              }
            }
          }
        } catch (error) {
          console.error("Error loading reader preferences:", error);
        }

        // Restore last reading location if available
        if (bookMeta.cfi && bookMeta.cfi.length > 0) {
          console.log("Attempting to restore position to:", bookMeta.cfi);

          // Delay a bit to ensure the reader is fully ready
          setTimeout(() => {
            try {
              if (bookMeta.cfi) {
                goToLocation(bookMeta.cfi);
                console.log("Position restored successfully");

                // Double-check that progress is still showing correctly
                setTimeout(() => {
                  if (
                    typeof bookMeta.readingProgress === "number" &&
                    bookMeta.readingProgress > 0 &&
                    readingProgress === 0
                  ) {
                    console.log("Re-applying saved progress after navigation");
                    setReadingProgress(bookMeta.readingProgress);
                  }
                }, 300);
              }
            } catch (error) {
              console.error("Error while restoring position:", error);

              // Try again with a longer delay as a fallback
              setTimeout(() => {
                try {
                  if (bookMeta.cfi) {
                    goToLocation(bookMeta.cfi);
                    console.log("Position restored on second attempt");

                    // Double-check progress again
                    if (
                      typeof bookMeta.readingProgress === "number" &&
                      bookMeta.readingProgress > 0 &&
                      readingProgress === 0
                    ) {
                      console.log(
                        "Re-applying saved progress after second navigation attempt"
                      );
                      setReadingProgress(bookMeta.readingProgress);
                    }
                  }
                } catch (secondError) {
                  console.error(
                    "Failed to restore position on second attempt:",
                    secondError
                  );

                  // Even if navigation fails, still make sure we show the saved progress
                  if (
                    typeof bookMeta.readingProgress === "number" &&
                    bookMeta.readingProgress > 0
                  ) {
                    setReadingProgress(bookMeta.readingProgress);
                  }
                }
              }, 1000);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error("Failed to load book metadata:", error);
    }
  };

  // Load book only once
  useEffect(() => {
    async function loadBook() {
      if (bookPath) return; // Don't reload if already loaded

      try {
        setLoading(true);
        const filePath = await getBookFile(bookId);
        if (filePath) {
          setBookPath(filePath);

          // Get book metadata to retrieve title and saved progress
          const bookMeta = await getMetaFromAsyncStorage(bookId);
          if (bookMeta) {
            setBookTitle(bookMeta.title);

            // Set initial progress from stored metadata and mark it as reliable
            if (
              typeof bookMeta.readingProgress === "number" &&
              bookMeta.readingProgress > 0
            ) {
              console.log(
                "Setting saved reading progress from metadata:",
                bookMeta.readingProgress
              );
              setReadingProgress(bookMeta.readingProgress);
              // This prevents the progress from being reset to 0 until location changes
              progressUpdatedRef.current = true;
            }
          }
        } else {
          setErrorMessage("Book file could not be loaded");
        }
      } catch (error) {
        console.error("Failed to load book:", error);
        setErrorMessage("Error loading book");
      } finally {
        setLoading(false);
      }
    }

    loadBook();

    return () => {
      // Cleanup function to reset state when component unmounts
      setBookPath(null);
      progressUpdatedRef.current = false;
    };
  }, [bookId]);

  // Handle navigation back with progress saving
  const goBack = useCallback(() => {
    try {
      // Save current position before navigating back
      if (latestLocationRef.current) {
        const location = latestLocationRef.current;
        const cfi = location.end?.cfi || location.start?.cfi;

        if (cfi) {
          // Calculate final progress to save
          let progressPercent = readingProgress;

          // If we have percentage data in the location, use that for more accuracy
          if (typeof location.end?.percentage === "number") {
            progressPercent = Math.round(location.end.percentage * 100);
          }

          console.log(
            `Saving position before going back: ${progressPercent}%, CFI: ${cfi}`
          );

          // Use a synchronous approach to ensure the save completes before navigation
          updateReadingProgress(
            bookId,
            progressPercent,
            location.end?.index || 0,
            cfi,
            false
          );
        }
      }
    } catch (error) {
      console.error("Error saving position before going back:", error);
    }

    // Now navigate back
    router.back();
  }, [bookId, readingProgress, router]);

  // Handle when the reader changes location
  const handleLocationChange = useCallback(() => {
    try {
      // Get current location from the reader
      const location = getCurrentLocation();
      if (!location) return;

      // Store the latest location for saving when component unmounts
      latestLocationRef.current = location;

      // Get CFI string for precise location tracking - prefer end.cfi for more accurate position
      const cfi = location.end?.cfi || location.start?.cfi;

      // Skip progress update for table of contents
      const isTOC =
        location.end?.href &&
        (location.end?.href.toLowerCase().includes("toc") ||
          location.end?.href.toLowerCase().includes("contents"));

      // Ensure we have valid data
      if (!cfi) return;

      // Don't update progress if we're in the table of contents
      if (isTOC) {
        console.log("Skipping progress update for table of contents");
        return;
      }

      // Calculate progress percentage (0-100)
      let progressPercent = 0;

      // First try using the end.percentage property which is most reliable
      if (typeof location.end?.percentage === "number") {
        progressPercent = Math.round(location.end.percentage * 100);
      }
      // Then try index if totalLocations is available
      else if (
        typeof location.end?.index === "number" &&
        totalBookLocations > 0
      ) {
        progressPercent = Math.round(
          (location.end.index / totalBookLocations) * 100
        );
      }
      // Then try location value if available
      else if (
        typeof location.end?.location === "number" &&
        totalBookLocations > 0
      ) {
        progressPercent = Math.round(
          (location.end.location / totalBookLocations) * 100
        );
      }
      // Fallback to page calculation if nothing else works
      else if (
        location.end?.displayed?.page &&
        location.end?.displayed?.total
      ) {
        const { page, total } = location.end.displayed;
        // Only use page/total if total is reasonably large (to avoid inaccurate calculations)
        if (total > 4) {
          progressPercent = Math.round((page / total) * 100);
        }
      }

      // Verify the progress is valid (between 0-100)
      if (progressPercent < 0 || progressPercent > 100) {
        console.log("Invalid progress value:", progressPercent);
        return;
      }

      // IMPORTANT: Guard against zero progress when we already have non-zero progress
      // This prevents accidental progress resets
      if (progressPercent === 0 && readingProgress > 0) {
        console.log("Ignoring suspicious progress reset to 0");
        return;
      }

      // Don't save if the progress hasn't changed significantly (reduces excessive saves)
      const progressDifference = Math.abs(
        progressPercent - lastSavedProgressRef.current
      );
      if (progressDifference < 1 && progressUpdatedRef.current) {
        return;
      }

      // Update local state with the calculated progress
      setReadingProgress(progressPercent);
      progressUpdatedRef.current = true;

      // Save the current position - but ensure we're not already saving (prevents race conditions)
      if (!savingInProgressRef.current) {
        savingInProgressRef.current = true;
        lastSavedProgressRef.current = progressPercent;

        console.log(`Saving position: ${progressPercent}%, CFI: ${cfi}`);
        updateReadingProgress(
          bookId,
          progressPercent,
          location.end?.index || 0,
          cfi,
          false // Don't enforce forward-only progress
        )
          .then(() => {
            savingInProgressRef.current = false;
          })
          .catch((error) => {
            console.error("Error updating reading progress:", error);
            savingInProgressRef.current = false;
          });
      }
    } catch (error) {
      console.error("Error with location change:", error);
      savingInProgressRef.current = false;
    }
  }, [bookId, getCurrentLocation, totalBookLocations, readingProgress]);

  // Store the TOC data when it becomes available
  useEffect(() => {
    if (toc && toc.length > 0) {
      setTocData(toc);
    }
  }, [toc]);

  // Store totalLocations when it becomes available
  useEffect(() => {
    if (totalLocations > 0) {
      console.log("Setting total book locations:", totalLocations);
      setTotalBookLocations(totalLocations);
    }
  }, [totalLocations]);

  // Effect to handle auto-navigation from TOC page at book start
  useEffect(() => {
    // Only run this once when TOC data is available
    if (tocData.length > 0 && !hasAutoNavigatedRef.current) {
      const currentLoc = getCurrentLocation();

      // Check if we're at the start of the book and on a TOC page
      if (currentLoc) {
        const isTOC =
          currentLoc.end?.href?.toLowerCase().includes("toc") ||
          currentLoc.end?.href?.toLowerCase().includes("contents");

        const isAtStart =
          currentLoc.atStart === true ||
          (currentLoc.percentage !== undefined && currentLoc.percentage < 0.01);

        if (isTOC && isAtStart) {
          console.log("Auto-navigating from TOC page to first chapter");

          // Find first non-TOC chapter
          const firstChapter = tocData.find(
            (item) =>
              item &&
              item.href &&
              !item.href.toLowerCase().includes("toc") &&
              !item.href.toLowerCase().includes("contents")
          );

          if (firstChapter) {
            // Mark that we've auto-navigated to prevent loops
            hasAutoNavigatedRef.current = true;

            // Navigate to first chapter immediately without timeout
            try {
              // Use the same CFI-prioritized approach for TOC skipping
              if (firstChapter.cfi) {
                console.log("Using CFI to skip TOC:", firstChapter.cfi);
                goToLocation(firstChapter.cfi);
              } else if (firstChapter.href) {
                // Generate a CFI from href for better navigation
                const generatedCfi = getCfiFromHref(firstChapter.href);
                if (generatedCfi) {
                  console.log("Using generated CFI to skip TOC:", generatedCfi);
                  goToLocation(generatedCfi);
                } else {
                  // Fallback to href if we can't generate a CFI
                  const href = firstChapter.href.startsWith("/")
                    ? firstChapter.href.substring(1)
                    : firstChapter.href;
                  console.log("Falling back to href to skip TOC:", href);
                  goToLocation(href);
                }
              } else if (firstChapter.id) {
                const id = firstChapter.id.startsWith("/")
                  ? firstChapter.id.substring(1)
                  : firstChapter.id;
                goToLocation(id);
              }
            } catch (error) {
              console.error("Error navigating to first chapter:", error);
            }
          }
        }
      }
    }
  }, [tocData, getCurrentLocation, goToLocation, getCfiFromHref]);

  // Save the final position when component unmounts or back button is pressed
  useEffect(() => {
    // Return a cleanup function that runs when component unmounts
    return () => {
      try {
        // If we have a stored latest location, save it before exiting
        if (latestLocationRef.current) {
          console.log(
            "Saving final position before exiting:",
            latestLocationRef.current
          );
          const location = latestLocationRef.current;

          // Use the end.cfi for more accurate position tracking
          // When using start.cfi, sometimes it points to the beginning of a section rather than current view
          const cfi = location.end?.cfi || location.start?.cfi;

          if (!cfi) return;

          // Calculate final progress percentage
          let progressPercent = 0;

          if (typeof location.end?.percentage === "number") {
            progressPercent = Math.round(location.end.percentage * 100);
          } else if (
            typeof location.end?.index === "number" &&
            totalBookLocations > 0
          ) {
            progressPercent = Math.round(
              (location.end.index / totalBookLocations) * 100
            );
          } else if (
            location.end?.displayed?.page &&
            location.end?.displayed?.total
          ) {
            const { page, total } = location.end.displayed;
            if (total > 4) {
              progressPercent = Math.round((page / total) * 100);
            }
          }

          // Save the final position
          console.log(
            `Saving exit position with CFI: ${cfi}, progress: ${progressPercent}%`
          );
          updateReadingProgress(
            bookId,
            progressPercent,
            location.end?.index || 0,
            cfi,
            false
          ).catch((error) => {
            console.error("Error saving final position:", error);
          });
        }
      } catch (error) {
        console.error("Error in cleanup function:", error);
      }
    };
  }, [bookId, totalBookLocations]);

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading book...
        </Text>
      </View>
    );
  }

  // Render error state
  if (errorMessage) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={50} color={"#ff4444"} />
        <Text style={[styles.errorText, { color: theme.text }]}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={goBack}
        >
          <Text style={styles.buttonText}>Back to Library</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ReaderHeader
        title={bookTitle}
        onBack={goBack}
        progress={readingProgress}
        onOpenTOC={() => {
          if (tocRef.current) {
            tocRef.current.present();
          }
        }}
        onOpenSettings={() => {
          if (settingsRef.current) {
            settingsRef.current.present();
          }
        }}
      />

      <View style={styles.readerContainer}>
        {bookPath && (
          <Reader
            src={bookPath}
            width={width}
            height={height * 0.85}
            fileSystem={useFileSystem}
            defaultTheme={readerTheme}
            onReady={handleReady}
            onLocationChange={handleLocationChange}
            enableSwipe={true}
            enableSelection={true}
          />
        )}
      </View>

      <TableOfContents
        ref={tocRef}
        onPressSection={(section) => {
          navigateToTocSection(section);
        }}
        onClose={() => {
          tocRef.current?.dismiss();
        }}
      />

      <ReaderSettings
        ref={settingsRef}
        onClose={() => {
          settingsRef.current?.dismiss();
        }}
        onChangeFontSize={handleChangeFontSize}
        onChangeFont={handleChangeFontFamily}
        onChangeLineHeight={handleChangeLineHeight}
        onToggleAutoPageTurn={handleToggleAutoPageTurn}
        onSearchBook={handleSearchBook}
        onNavigateToSearchResult={(cfi) => {
          // Close the settings panel first
          settingsRef.current?.dismiss();

          // Navigate to the search result
          if (cfi) {
            setTimeout(() => {
              goToLocation(cfi);
              console.log(`Navigated to search result at ${cfi}`);
            }, 300); // Short delay to allow modal to close
          }
        }}
      />
    </View>
  );
}

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
          <BookReader />
        </ReaderProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
  },
  progressContainer: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  readerContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
});
