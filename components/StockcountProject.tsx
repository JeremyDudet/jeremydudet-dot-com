import { ProjectCard } from "@/components/ProjectCard";
import { Subheading } from "@/components/ui/heading";

export function StockcountProject() {
  return (
    <div className="flex flex-col gap-4">
      <Subheading level={3}>Stockcount</Subheading>
      <div className="relative w-52 aspect-[5/7] md:w-80 md:aspect-[7/5]">
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
      <a
        href="https://stockcount.io"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        stockcount.io &rarr;
      </a>
    </div>
  );
}
