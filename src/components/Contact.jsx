import { GridPattern } from '@/components/GridPattern'
import { SectionHeading } from '@/components/SectionHeading'
import jeremyImage from '@/images/jeremy3.png'
import { Link } from '@/components/Link'
import { GitHubIcon } from '@/components/GitHubIcon'
import { LinkedInIcon } from '@/components/LinkedInIcon'
import { ResumeIcon } from '@/components/ResumeIcon'

function XIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8132L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
    </svg>
  )
}

export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative scroll-mt-14 pb-3 pt-8 sm:scroll-mt-32 sm:pb-16 sm:pt-10 lg:pt-16"
    >
      <div className="absolute inset-x-0 bottom-0 top-1/2 text-slate-900/10 [mask-image:linear-gradient(transparent,white)]">
        <GridPattern x="50%" y="100%" />
      </div>
      <div className="relative mx-auto max-w-5xl pt-16 sm:px-6">
        <div className="bg-slate-50 pt-px sm:rounded-6xl">
          <div className="relative mx-auto -mt-16 h-44 w-44 overflow-hidden rounded-full bg-slate-200 md:float-right md:h-64 md:w-64 md:[shape-outside:circle(40%)] lg:mr-20 lg:h-72 lg:w-72">
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={jeremyImage}
              alt=""
            />
          </div>
          <div className="px-4 py-10 sm:px-10 sm:py-16 md:py-20 lg:px-20 lg:py-32">
            <SectionHeading number="4" id="contact-title">
              Contact
            </SectionHeading>
            <p className="mt-8 font-display text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              <span className="block text-blue-600">Let's build something great</span>
            </p>
            <p className="mt-4 text-lg tracking-tight text-slate-700">
            I love tackling complex problems. If you've got an interesting project or opportunity where I could make an impact, let's chat! Always up for coffee and casual talks too.
            </p>
            <p className="mt-8 flex flex-col md:flex-row gap-4">      
              <Link
                href="https://www.linkedin.com/in/jeremydudet/"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <LinkedInIcon className="h-10 w-10 fill-current" />
                <span className="ml-4">Contact on LinkedIn</span>
              </Link>
              <Link
                href="https://github.com/JeremyDudet"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <GitHubIcon className="h-10 w-10 fill-current" />
                <span className="ml-4">Follow on GitHub</span>
              </Link>
              <Link
                href="https://docs.google.com/document/d/1nsesUtw6HBj_iqDslqgkOHYwD_-Qz9cQPmfjdRdTjGs/edit?tab=t.0#heading=h.ohn8az5e7lg"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <ResumeIcon className="h-10 w-10 fill-current" />
                <span className="ml-4">View Resume</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
