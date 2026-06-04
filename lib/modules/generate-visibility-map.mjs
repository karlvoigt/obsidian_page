import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';

dotenv.config();

const mdDir = path.join(process.cwd(), process.env.COMMON_MD_DIR || './common_md');
const outputFile = path.join(process.cwd(), 'lib/visibility-map.json');

const getFilesRecursively = (directory, fileExtRegex) => {
  let files = [];
  const recursiveFindFiles = (dir) => {
    if (!fs.existsSync(dir)) return;
    const filesInDirectory = fs.readdirSync(dir);
    for (const file of filesInDirectory) {
      const absolute = path.join(dir, file);
      if (fs.statSync(absolute).isDirectory()) {
        recursiveFindFiles(absolute);
      } else if (path.extname(absolute).match(fileExtRegex)) {
        files.push(path.relative(directory, absolute));
      }
    }
  };
  recursiveFindFiles(directory);
  return files;
};

const main = () => {
  console.log(`Scanning Markdown files in ${mdDir} to generate visibility map...`);
  const files = getFilesRecursively(mdDir, /\.md$/);
  const map = {};

  for (const file of files) {
    const fullPath = path.join(mdDir, file);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);
    
    // Normalize slug to URL path (slash-separated, no extension)
    const slug = file.replace(/\.md$/, '').replace(/\\/g, '/');
    
    // Default to "authenticated" as requested by user
    const visibility = data.visibility || 'authenticated';
    map[slug] = visibility;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(map, null, 2), 'utf8');
  console.log(`Generated visibility map with ${Object.keys(map).length} entries at ${outputFile}`);
};

main();
