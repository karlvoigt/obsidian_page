import { AppProps } from 'next/app'
import '../styles/index.css'
import { DefaultSeo } from 'next-seo'
import SEO from '../next-seo.config';
import 'katex/dist/katex.min.css'


export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <DefaultSeo {...SEO}/>
      <Component {...pageProps} />
    </>
  )
}
