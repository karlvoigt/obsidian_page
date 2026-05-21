import Link from 'next/link'
import { useEffect, useState } from 'react';
import Search from './search';

const Header = ({ hasSidebars }: { hasSidebars?: boolean }) => {
  const [top, setTop] = useState(true);
  const [searching, setSearching] = useState(false);
  // detect whether user has scrolled the page down by 10px 
  useEffect(() => {
    const scrollHandler = () => {
      window.pageYOffset > 10 ? setTop(false) : setTop(true)
    };
    window.addEventListener('scroll', scrollHandler);
    return () => window.removeEventListener('scroll', scrollHandler);
  }, [top]);  

  return (
    <header className={`fixed w-full z-30 md:bg-white/90 transition duration-300 ease-in-out ${!top && 'bg-white backdrop-blur-sm shadow-lg'}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            {hasSidebars && (
              <button aria-label="Project Explorer" className="mr-4 text-gray-500 hover:text-black transition-colors" onClick={() => window.dispatchEvent(new Event('toggleLeftSidebar'))}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
            )}
            <h2 className="shrink-0 mr-4 text-2xl font-bold tracking-tight md:tracking-tighter leading-tight">
              <Link href="/" className="block hover:underline" aria-label="My Blog">
                The FlowCytometry Project.
              </Link>
            </h2>
          </div>
          <ul className="flex grow justify-end flex-wrap items-center">
            <li>
              <button className="w-4 h-4 my-auto mx-2 border-black" aria-label="Search" onClick={() => setSearching(!searching)} disabled={searching}>
                <svg className="w-4 h-4 fill-current text-gray-400" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zM15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                </svg>
              </button>
            </li>
            {hasSidebars && (
              <li>
                <button aria-label="Backlinks" className="w-5 h-5 my-auto mx-2 text-gray-400 hover:text-black transition-colors flex items-center justify-center" onClick={() => window.dispatchEvent(new Event('toggleRightSidebar'))}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
              </li>
            )}
          </ul>
          {/* Search */}
          <Search visible={searching} setVisible={setSearching}/>
        </div>
      </div>
    </header>
  )
}

export default Header
