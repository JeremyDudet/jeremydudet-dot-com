import { ProjectCard } from "@/components/ProjectCard";
import { Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export function StockcountProject() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="flex-1 min-w-0">
        <Subheading level={3}>Stockcount</Subheading>
        <Text className="mt-1">
          Voice-powered inventory management for F&amp;B.
        </Text>
        <Text className="mt-3">
          Count inventory by speaking instead of typing into spreadsheets. Waste
          tracking, cost analysis, and day-to-day managerial accounting for
          F&amp;B.
        </Text>
        <div className="mt-4">
          <a
            href="https://stockcount.io"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            stockcount.io &rarr;
          </a>
        </div>
      </div>
      <div
        className="relative shrink-0 sm:max-w-none sm:w-52 ml-4 mt-4"
        style={{ height: 280 }}
      >
        <ProjectCard
          title="Stockcount"
          url="https://stockcount.io"
          tilt={3}
          offset={0}
          desktopOffset={0}
          desktopImage="/images/stockcount-desktop.jpg"
          mobileImage="/images/stockcount-mobile.jpg"
        />
      </div>
    </div>
  );
}
