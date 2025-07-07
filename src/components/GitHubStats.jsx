import React, { useEffect, useState, useRef } from "react";
import GitHubCalendar from "react-github-calendar";
import { Heading } from "@/components/ui/heading";

const lightTheme = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  text: "#24292f",
  grade0: "#ebedf0",
  grade1: "#9be9a8",
  grade2: "#40c463",
  grade3: "#30a14e",
  grade4: "#216e39",
};

const darkTheme = {
  dark: ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"],
  text: "#adbac7",
  grade0: "#21262d",
  grade1: "#0e4429",
  grade2: "#006d32",
  grade3: "#26a641",
  grade4: "#39d353",
};

const GitHubStats = () => {
  const [isDark, setIsDark] = useState(false);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    const match = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(match.matches);
    const handler = (e) => setIsDark(e.matches);
    match.addEventListener("change", handler);
    return () => match.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // Set calendar as loaded after a short delay
    const timer = setTimeout(() => setCalendarLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to the right after the calendar renders
    const scrollToRight = () => {
      if (calendarRef.current && calendarLoaded) {
        // Try multiple selectors to find the scrollable element
        const selectors = [
          '[data-testid="calendar"]',
          '.react-github-calendar',
          'svg',
          'div[style*="overflow"]',
          'div[style*="scroll"]'
        ];
        
        let scrollContainer = null;
        for (const selector of selectors) {
          const element = calendarRef.current.querySelector(selector);
          if (element && element.scrollWidth > element.clientWidth) {
            scrollContainer = element;
            break;
          }
        }
        
        // If no scrollable element found, try the container itself
        if (!scrollContainer && calendarRef.current.scrollWidth > calendarRef.current.clientWidth) {
          scrollContainer = calendarRef.current;
        }
        
        if (scrollContainer) {
          // Use smooth scrolling for better animation
          scrollContainer.scrollTo({
            left: scrollContainer.scrollWidth,
            behavior: 'smooth'
          });
          
          // Show the calendar after scrolling starts
          setTimeout(() => setShowCalendar(true), 50);
          
          // Remove scrollbar highlight after programmatic scrolling
          if (calendarRef.current) {
            calendarRef.current.classList.add('scroll-complete');
            // Remove the class after a short delay to reset the state
            setTimeout(() => {
              if (calendarRef.current) {
                calendarRef.current.classList.remove('scroll-complete');
              }
            }, 100);
          }
        } else {
          // If no scrollable element found, still show the calendar
          setTimeout(() => setShowCalendar(true), 100);
        }
      }
    };

    // Use MutationObserver to detect when calendar is ready
    if (calendarRef.current && calendarLoaded) {
      const observer = new MutationObserver((mutations) => {
        // Check if any SVG elements were added (the calendar)
        const hasCalendar = mutations.some(mutation => 
          mutation.type === 'childList' && 
          Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.tagName === 'SVG' || node.querySelector('svg'))
          )
        );
        
        if (hasCalendar) {
          // Wait a bit more for the calendar to fully render
          setTimeout(scrollToRight, 50);
        }
      });

      observer.observe(calendarRef.current, {
        childList: true,
        subtree: true
      });

      // Also try immediately and with delays as fallback
      scrollToRight();
      const timeoutId = setTimeout(scrollToRight, 100);
      const timeoutId2 = setTimeout(scrollToRight, 500);
      
      return () => {
        observer.disconnect();
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
      };
    }
  }, [isDark, calendarLoaded]); // Re-run when theme changes or calendar loads

  return (
    <div ref={calendarRef} className="github-calendar-container mt-4">
      {showCalendar && (
        <div className="calendar-fade-in">
          <GitHubCalendar
            username="JeremyDudet"
            theme={isDark ? darkTheme : lightTheme}
            hideColorLegend
            style={{
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '16px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GitHubStats; 