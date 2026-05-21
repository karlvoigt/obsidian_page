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
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-12">
      <article className="w-full overflow-hidden">
        {/* Article header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
        </header>

        {/* Article meta */}
        {(author || date) && (
          <div className="flex justify-center mb-10">
            <PostMeta author={author} date={date}/>
          </div>
        )}

        {/* MAIN CONTENT: Centered and protected from overflow */}
        <div className="w-full max-w-3xl mx-auto prose prose-lg break-words">
          <PostBody content={content}/>
        </div>
      </article>

      {/* BACKLINKS: Moved to the bottom so they don't break layout */}
      {Object.keys(backlinks).length > 0 && (
        <aside className="max-w-3xl mx-auto mt-20 pt-10 border-t border-gray-200">
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