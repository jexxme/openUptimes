import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Directories to exclude
const excludeDirs = [
  'node_modules',
  '.git',
  '.next',
  'coverage',
  '.vercel',
  '.vscode',
  '.swc',
];

// Files to exclude (test setup that mocks console is important to keep)
const excludeFiles = [
  '__tests__/setup.ts',
];

// Regex for single-line console statements
const singleLineConsoleRegex = /^\s*(console\.log|console\.debug|console\.info|console\.warn|console\.error)\s*\(.*\);\s*$/gm;

// Multiline console statements using a more compatible approach
const consoleStatementStart = /^\s*(console\.log|console\.debug|console\.info|console\.warn|console\.error)\s*\(/gm;

// Regex for JSX console attributes like onLoad={() => {}}
const jsxConsoleRegex = /(onError|onLoad|onChange|onClick)={\s*\(\)\s*=>\s*(console\.log|console\.debug|console\.info|console\.warn|console\.error)\s*\(.*?\)\s*}/g;

async function processFile(filePath: string): Promise<boolean> {
  // Check if file should be excluded
  if (excludeFiles.some(excludePath => filePath.includes(excludePath))) {
    return false;
  }

  const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
  const ext = path.extname(filePath);
  
  if (!fileExtensions.includes(ext)) {
    return false;
  }

  try {
    const content = await readFile(filePath, 'utf8');
    const originalSize = content.length;
    
    // First replace JSX console statements with empty callbacks
    let updatedContent = content.replace(jsxConsoleRegex, '$1={() => {}}');
    
    // Replace single-line console statements
    updatedContent = updatedContent.replace(singleLineConsoleRegex, '');
    
    // Handle multiline console statements with a line-by-line approach
    const lines = updatedContent.split('\n');
    let inConsoleStatement = false;
    let consoleLineStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (!inConsoleStatement) {
        // Check if this line starts a console statement
        if (consoleStatementStart.test(lines[i]) && !lines[i].includes(');')) {
          inConsoleStatement = true;
          consoleLineStart = i;
        }
      } else {
        // If we're in a console statement, check if it ends on this line
        if (lines[i].includes(');')) {
          // Remove all lines of this console statement
          for (let j = consoleLineStart; j <= i; j++) {
            lines[j] = '';
          }
          inConsoleStatement = false;
        }
      }
      
      // Reset the regex state
      consoleStatementStart.lastIndex = 0;
    }
    
    // Join the lines back together
    updatedContent = lines.join('\n');
    
    // Only write back if changes were made
    if (updatedContent.length !== originalSize) {
      await writeFile(filePath, updatedContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {

    return false;
  }
}

async function traverseDirectory(dir: string): Promise<{ processed: number, modified: number }> {
  let stats = { processed: 0, modified: 0 };
  
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      if (excludeDirs.includes(file)) {
        continue;
      }
      
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        const subDirStats = await traverseDirectory(filePath);
        stats.processed += subDirStats.processed;
        stats.modified += subDirStats.modified;
      } else {
        stats.processed++;
        const modified = await processFile(filePath);
        if (modified) {
          stats.modified++;

        }
      }
    }
    
    return stats;
  } catch (error) {

    return stats;
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');


  const stats = await traverseDirectory(rootDir);




}

main().catch(error => {

  process.exit(1);
}); 