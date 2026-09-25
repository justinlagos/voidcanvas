import { Landing } from '@/components/landing/Landing'

// The landing page's own theme (dark or light) is applied before hydration so there is no flash of the other one.
const THEME_SCRIPT = "try{if(localStorage.getItem('vc-landing-theme')==='light')document.documentElement.setAttribute('data-lp-theme','light')}catch(e){}"

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <Landing />
    </>
  )
}
