# Claude Code Configuration for Claude Flow

## 🚨 CRITICAL: PARALLEL EXECUTION AFTER SWARM INIT

**MANDATORY RULE**: Once swarm is initialized with memory, ALL subsequent operations MUST be parallel:
1. **TodoWrite** → Always batch 5-10+ todos in ONE call
2. **Task spawning** → Spawn ALL agents in ONE message  
3. **File operations** → Batch ALL reads/writes together
4. **NEVER** operate sequentially after swarm init

## 🚨 CRITICAL: CONCURRENT EXECUTION FOR ALL ACTIONS

**ABSOLUTE RULE**: ALL operations MUST be concurrent/parallel in a single message:

### 🔴 MANDATORY CONCURRENT PATTERNS:
1. **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
2. **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
3. **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
4. **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
5. **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**Examples of CORRECT concurrent execution:**
```javascript
// ✅ CORRECT: Everything in ONE message
[Single Message]:
  - TodoWrite { todos: [10+ todos with all statuses/priorities] }
  - Task("Agent 1 with full instructions and hooks")
  - Task("Agent 2 with full instructions and hooks")
  - Task("Agent 3 with full instructions and hooks")
  - Read("file1.js")
  - Read("file2.js")
  - Read("file3.js")
  - Write("output1.js", content)
  - Write("output2.js", content)
  - Bash("npm install")
  - Bash("npm test")
  - Bash("npm run build")
```

**Examples of WRONG sequential execution:**
```javascript
// ❌ WRONG: Multiple messages (NEVER DO THIS)
Message 1: TodoWrite { todos: [single todo] }
Message 2: Task("Agent 1")
Message 3: Task("Agent 2")
Message 4: Read("file1.js")
Message 5: Write("output1.js")
Message 6: Bash("npm install")
// This is 6x slower and breaks coordination!
```

## Use Bun in this Project

**Recommendations for Bun Integration**:
- Use `bun` as the primary runtime
- Leverage `bunx` for package execution
- Take advantage of Bun's native TypeScript support
- Utilize Bun's fast package manager for installations

### Example Bun Workflow:
```bash
# Install dependencies
bun install

# Run scripts
bun run start
bun run test

# Use bunx for package execution
bunx create-next-app@latest
bunx shadcn-ui@latest add button
```

The rest of the configuration remains the same as the original file.