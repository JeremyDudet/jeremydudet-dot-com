export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-700 pt-8 pb-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex gap-6 text-sm">
            <a
              href="https://www.linkedin.com/in/jeremydudet/"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/JeremyDudet"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              GitHub
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
