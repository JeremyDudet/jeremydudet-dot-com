import { GitHubIcon, LinkedInIcon } from "@/components/SocialIcons";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-700 pt-8 pb-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://www.linkedin.com/in/jeremydudet/"
              aria-label="LinkedIn"
              title="LinkedIn"
              className="text-[#0A66C2] transition-opacity hover:opacity-70 dark:text-[#70B5F9]"
            >
              <LinkedInIcon className="size-4" />
            </a>
            <a
              href="https://github.com/JeremyDudet"
              aria-label="GitHub"
              title="GitHub"
              className="text-[#181717] transition-opacity hover:opacity-70 dark:text-white"
            >
              <GitHubIcon className="size-4" />
            </a>
            <a
              href="https://docs.google.com/document/d/1-BTcUuFp3fuM-Wc6yLJQ_YTr7FUcUvF03gfCSZS8XCc/edit?usp=sharing"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Resume
            </a>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            &copy; {new Date().getFullYear()} Jeremy Dudet
          </p>
        </div>
      </div>
    </footer>
  )
}
