import React from 'react';
import Author from '../../interfaces/author';
import Backlinks from '../misc/backlinks';
import PostBody from './post-body';
import PostMeta from './post-meta';

type Props = {
  title: string,
  content: string,
  date?: string,
  author?: Author,
  backlinks: { [k: string]: { title: string, excerpt: string } }
}

function PostSingle({ title, date, author, content, backlinks }: Props) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-32 pb-12">
      <article className="w-full">
        {/* Article header */}
        <header className="mb-10 text-center border-b border-gray-100 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
          {(author || date) && (
            <div className="flex justify-center mt-6">
              <PostMeta author={author} date={date}/>
            </div>
          )}
        </header>

        {/* MAIN CONTENT: Wider wrapper, max-w-none overrides Tailwind's horizontal cutoffs */}
        <div className="w-full max-w-5xl mx-auto prose prose-lg max-w-none break-words">
          <PostBody content={content}/>
        </div>
      </article>

      {/* BACKLINKS */}
      {Object.keys(backlinks).length > 0 && (
        <aside className="w-full max-w-5xl mx-auto mt-20 pt-10 border-t border-gray-200">
          <h4 className="text-xl font-bold leading-snug tracking-tight mb-6">Mentioned In (Backlinks)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Backlinks backlinks={backlinks} />
          </div>
        </aside>
      )}
    </section>
  );
}

export default PostSingle;