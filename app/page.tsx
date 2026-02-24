import { Introduction } from '@/components/Introduction'
import { JsonLd } from '@/components/JsonLd'
import { personJsonLd, webSiteJsonLd } from '@/lib/structured-data'

export default function Home() {
  return (
    <>
      <JsonLd data={personJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      <Introduction />
    </>
  )
}
