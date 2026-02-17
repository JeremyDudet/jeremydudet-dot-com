import { Helmet } from 'react-helmet-async'
import { Introduction } from '@/components/Introduction'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Jeremy Dudet</title>
      </Helmet>
      <Introduction />
    </>
  )
}
