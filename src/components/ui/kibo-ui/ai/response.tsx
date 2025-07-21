"use client";

import type { HTMLAttributes } from "react";
import React from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BundledLanguage } from "shiki";
import { CodeBlock, CodeBlockSelectValue } from "@/components/ui/code-block";
