import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Reader,
  useReader,
  Section as OriginalSectionType,
  Toc,
  Location,
} from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import { useTheme } from "../../context/ThemeContext";
import {
  getBookFile,
  updateReadingProgress,
  getMetaFromAsyncStorage,
} from "../../utils/bookStorage";
import { TableOfContents, Ref as TOCRef } from "./TableOfContent";
import LoadingDisplay from "./LoadingDisplay";
import ErrorDisplay from "./ErrorDisplay";
import ReaderHeader from "./ReaderHeader";

// Define an interface for the key.current object
interface RenditionRef {
  rendition: {
    book: {
      spine: Array<{
        href?: string;
        [key: string]: any;
      }>;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

// Extend the original Section type with additional properties we need
interface SectionType
  extends Omit<OriginalSectionType, "id" | "label" | "href" | "subitems"> {
  id: string;
  label: string;
  href: string;
  cfi?: string;
  subitems: SectionType[];
}

export default function ReaderContent() {
  const { id } = useLocalSearchParams();
  const bookId = Array.isArray(id) ? id[0] : id;
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const tocRef = useRef<TOCRef>(null);

  // Create a ref for the Reader component
  const readerRef = useRef<any>(null);

  // Add a ref to track if we have auto-navigated from TOC
  const hasAutoNavigatedRef = useRef(false);
  // Store TOC data in state once we get it
  const [tocData, setTocData] = useState<SectionType[]>([]);

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
  const latestLocationRef = useRef<Location | null>(null);
  // Ref to track if a save operation is in progress to prevent race conditions
  const savingInProgressRef = useRef(false);
  // Ref to store the last saved progress to prevent unnecessary/duplicate saves
  const lastSavedProgressRef = useRef<number>(0);
  // Track the last handled location to prevent duplicate handling
  const lastLocationRef = useRef("");

  const { getCurrentLocation, goToLocation, totalLocations, key, toc } =
    useReader();

  // Get a spine item CFI from TOC href
  const getCfiFromHref = useCallback(
    (href: string | undefined) => {
      // If it's already a CFI, return it
      if (href && href.includes("epubcfi(")) {
        return href;
      }

      // We need to render proper CFI for navigation since goToLocation only accepts CFI
      try {
        // Use the internal EPUB.js methods to generate a CFI from href
        const rendition = (key as unknown as { current?: RenditionRef }).current
          ?.rendition;
        if (rendition) {
          // Clean the href (remove leading slash if present)
          const cleanHref = href?.startsWith("/") ? href.substring(1) : href;

          // Generate a proper CFI using spine position
          const spineItem = rendition.book.spine.find(
            (item: { href?: string }) => {
              // Match the spine item's href with the TOC href
              const itemUrl = item.href || "";
              return (
                itemUrl === cleanHref ||
                (cleanHref && cleanHref.includes(itemUrl))
              );
            }
          );

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
    (section: SectionType) => {
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
        } else {
          // If no previous reading position, ensure we update progress on first page
          setTimeout(() => {
            // Force a location check after a short delay
            handleLocationChange();
          }, 1000);
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
      if (!location) {
        console.log("No location available");
        return;
      }

      // Get CFI string for precise location tracking - prefer end.cfi for more accurate position
      const cfi = location.end?.cfi || location.start?.cfi;

      // Skip if no CFI is available
      if (!cfi) {
        console.log("No CFI available in location");
        return;
      }

      // Check if this is the same location we already processed to avoid duplicate updates
      if (lastLocationRef.current === cfi) {
        console.log("Skipping duplicate location update for:", cfi);
        return;
      }

      // Update the last location reference
      lastLocationRef.current = cfi;

      // Store the latest location for saving when component unmounts
      latestLocationRef.current = location;

      console.log(
        "Location change detected:",
        JSON.stringify(location, null, 2)
      );

      // Skip progress update for table of contents
      const isTOC =
        location.end?.href &&
        (location.end?.href.toLowerCase().includes("toc") ||
          location.end?.href.toLowerCase().includes("contents"));

      if (isTOC) {
        console.log("Skipping progress update for TOC page");
        return;
      }

      // Calculate progress percentage (0-100)
      let progressPercent = 0;

      // First try using the end.percentage property which is most reliable
      if (typeof location.end?.percentage === "number") {
        progressPercent = Math.round(location.end.percentage * 100);
        console.log("Using end.percentage for progress:", progressPercent);
      }
      // Then try index if totalLocations is available
      else if (
        typeof location.end?.index === "number" &&
        totalBookLocations > 0
      ) {
        progressPercent = Math.round(
          (location.end.index / totalBookLocations) * 100
        );
        console.log("Using end.index for progress:", progressPercent);
      }
      // Then try location value if available
      else if (
        typeof location.end?.location === "number" &&
        totalBookLocations > 0
      ) {
        progressPercent = Math.round(
          (location.end.location / totalBookLocations) * 100
        );
        console.log("Using end.location for progress:", progressPercent);
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
          console.log(
            "Using displayed page/total for progress:",
            progressPercent
          );
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

      // Update local state with the calculated progress
      console.log("Setting new reading progress:", progressPercent);
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

  // Setup a timer to periodically check location and update progress
  // This ensures progress updates even if the built-in events aren't firing reliably
  useEffect(() => {
    if (!loading && bookPath) {
      // Check location immediately then set up interval
      handleLocationChange();

      const intervalId = setInterval(() => {
        handleLocationChange();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(intervalId);
    }
  }, [loading, bookPath, handleLocationChange]);

  // Store the TOC data when it becomes available
  useEffect(() => {
    if (toc && toc.length > 0) {
      setTocData(toc as SectionType[]);
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

        // Add a custom check for atStart since percentage is not a standard property
        const isAtStart =
          (currentLoc as any).atStart === true ||
          ((currentLoc as any).percentage !== undefined &&
            (currentLoc as any).percentage < 0.01);

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
    return <LoadingDisplay message="Loading book..." />;
  }

  // Render error state
  if (errorMessage) {
    return <ErrorDisplay message={errorMessage} onBack={goBack} />;
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
            waitForLocationsReady={true}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  readerContainer: {
    flex: 1,
  },
});
