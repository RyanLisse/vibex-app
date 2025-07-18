#!/usr/bin/env bun
/**
 * Quick fix for ChatMessage test cases missing role prop
 */

import { readFileSync, writeFileSync } from 'node:fs'

const filePath = 'app/task/[id]/_components/chat-message.test.tsx'

try {
  let content = readFileSync(filePath, 'utf-8')

  // Fix all ChatMessage components missing role prop
  content = content.replace(
    /<ChatMessage(?!\s+[^>]*role=)([^>]*?)>/g,
    '<ChatMessage role="user"$1>'
  )

  // Fix specific cases where we want assistant role for streaming/markdown tests
  content = content.replace(
    /<ChatMessage role="user"(\s+[^>]*?isStreaming[^>]*?)>/g,
    '<ChatMessage role="assistant"$1>'
  )

  content = content.replace(
    /<ChatMessage role="user"(\s+[^>]*?streamProgress[^>]*?)>/g,
    '<ChatMessage role="assistant"$1>'
  )

  // Fix cases where we're testing assistant-specific behavior
  content = content.replace(
    /it\('should apply correct styling for assistant messages'[\s\S]*?render\(<ChatMessage role="user"/g,
    (match) => match.replace('role="user"', 'role="assistant"')
  )

  content = content.replace(
    /it\('should position assistant message on the left'[\s\S]*?render\(<ChatMessage role="user"/g,
    (match) => match.replace('role="user"', 'role="assistant"')
  )

  content = content.replace(
    /it\('should handle code blocks in markdown'[\s\S]*?render\(<ChatMessage role="user"/g,
    (match) => match.replace('role="user"', 'role="assistant"')
  )

  writeFileSync(filePath, content, 'utf-8')
  console.log('✅ Fixed ChatMessage test cases')
} catch (error) {
  console.error('❌ Error fixing ChatMessage tests:', error)
  process.exit(1)
}
