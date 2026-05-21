import React from 'react'
import Footer from './footer'
import Header from './header'

type Props = {
  children: React.ReactNode
  hasSidebars?: boolean
}

const Layout = ({ children, hasSidebars }: Props) => {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <Header hasSidebars={hasSidebars} />
      <main className="grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout
