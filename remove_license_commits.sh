#!/bin/bash

# This script will remove the LICENSE commits from git history
# without requiring interactive rebase editor

# Create a temporary rebase todo file
cat > .git/rebase-todo << EOF
pick b8642a8 Merge stable-preview branch with Tailwind CSS v3 fixes
pick d628b3b Update package-lock.json to reflect dependency changes and improve build stability
pick d06ad69 Fix: CSS issues causing Vercel build failures
pick ef3cc1a Fix: Downgrade Tailwind CSS from v4 to v3.4.1 to resolve Vercel build issue
pick 623ca1a Enhance global styles and admin components for improved user experience
# Dropping commit 9c9b349 Create LICENSE
# Dropping commit 589e2fb Create LICENSE
pick 991ce53 Merge branch 'main' of https://github.com/jexxme/openUptimes
pick 777e72c Merge branch 'main' of https://github.com/jexxme/openUptimes
pick 75ee735 Merge branch 'main' of https://github.com/jexxme/openUptimes
pick 4744264 Merge branch 'main' of https://github.com/jexxme/openUptimes
pick 3706a91 Merge branch 'main' of https://github.com/jexxme/openUptimes
EOF

# Create a new branch without the LICENSE commits
git checkout -b clean_main b8642a8

# Apply the non-license commits manually
git checkout main -- .
git rm LICENSE
git add .
git commit -m "Clean repository history: remove LICENSE"

echo "Now push with: git push origin clean_main:main --force" 