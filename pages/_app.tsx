import { AppProps } from 'next/app'
import '../styles/index.css'
import { DefaultSeo } from 'next-seo'
import SEO from '../next-seo.config';
import 'katex/dist/katex.min.css'
import { AuthProvider } from '../context/AuthContext'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <DefaultSeo {...SEO}/>
      <Component {...pageProps} />
    </AuthProvider>
  )
}
