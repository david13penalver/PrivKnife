import { CheatsheetConfig } from './types';

export const DEFAULT_CHEATSHEET_CONFIG: CheatsheetConfig = {
  title: 'Python 3 & Algorithms Quick Reference',
  subtitle: 'Essential data structures, syntax patterns & asymptotic complexity',
  markdownContent: `## Core Data Structures

- **List**: Mutable, dynamic array \`[1, 2, 3]\`
- **Tuple**: Immutable sequence \`(1, 'a', True)\`
- **Dict**: Key-value hash map \`{'id': 101, 'name': 'Antigravity'}\`
- **Set**: Unordered unique elements \`{1, 2, 3}\`

\`\`\`python
# List comprehension with filtering
squares = [x**2 for x in range(10) if x % 2 == 0]

# Dictionary lookup with default
val = config.get('timeout', 30)
\`\`\`

## Algorithmic Complexity

| Data Structure | Access | Search | Insertion | Deletion |
| :--- | :--- | :--- | :--- | :--- |
| Array | O(1) | O(n) | O(n) | O(n) |
| Stack / Queue | O(n) | O(n) | O(1) | O(1) |
| Hash Table | O(1) | O(1) | O(1) | O(1) |
| Binary Search Tree | O(log n) | O(log n) | O(log n) | O(log n) |

> **Pro Tip**: Use \`collections.defaultdict\` or \`Counter\` to simplify counting operations in O(n) time.
`,
  paperSize: 'a4',
  orientation: 'portrait',
  columns: 2,
  fontSizePt: 9,
  accentColor: '#2563eb',
  includeFooter: true,
};

export const GIT_CHEATSHEET_CONFIG: CheatsheetConfig = {
  title: 'Git & Terminal CLI Cheatsheet',
  subtitle: 'Branching, Stashing, History Manipulation & Remote Sync',
  markdownContent: `## Branch Management

\`\`\`bash
git checkout -b feature/auth     # Create & switch
git branch -d feature/auth        # Safe delete
git branch -D feature/auth        # Force delete
\`\`\`

## Stashing Changes

\`\`\`bash
git stash push -m "WIP changes"  # Save work
git stash pop                     # Apply & remove
git stash list                    # View stash list
\`\`\`

## History & Rebase

- \`git commit --amend --no-edit\`: Append to last commit
- \`git rebase -i HEAD~3\`: Squash last 3 commits
- \`git cherry-pick <hash>\`: Apply specific commit
`,
  paperSize: 'letter',
  orientation: 'landscape',
  columns: 3,
  fontSizePt: 8,
  accentColor: '#059669',
  includeFooter: true,
};

export const JAVASCRIPT_CHEATSHEET_CONFIG: CheatsheetConfig = {
  title: 'Modern TypeScript & ESNext Reference',
  subtitle: 'Utility types, async patterns and modern primitives',
  markdownContent: `## Utility Types

\`\`\`typescript
type PartialUser = Partial<User>;
type ReadonlyConfig = Readonly<AppConfig>;
type NameOnly = Pick<User, 'name' | 'email'>;
type WithoutPassword = Omit<User, 'password'>;
\`\`\`

## Nullish & Optional Chaining

\`\`\`typescript
const name = user?.profile?.name ?? 'Anonymous';
const count = response?.data?.total || 0;
\`\`\`
`,
  paperSize: 'a4',
  orientation: 'portrait',
  columns: 2,
  fontSizePt: 10,
  accentColor: '#7c3aed',
  includeFooter: false,
};

export const MALICIOUS_MARKDOWN = `
# XSS Test <script>alert("hacked")</script>

An image with script: <img src="x" onerror="alert(1)">

A malicious link: [Click here](javascript:alert("pwned"))
`;
