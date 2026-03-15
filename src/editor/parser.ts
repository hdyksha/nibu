import MarkdownIt from "markdown-it";
import { MarkdownParser, defaultMarkdownParser } from "prosemirror-markdown";
import { markdownSchema } from "./schema";

/**
 * markdown-it instance configured with strikethrough support.
 * Uses the "default" preset which enables all built-in rules including strikethrough (~~text~~),
 * with HTML disabled for safety.
 */
const markdownItInstance = MarkdownIt("default", { html: false });

/**
 * Markdown parser that converts markdown text to a ProseMirror document.
 * Extends the default prosemirror-markdown parser with strikethrough support.
 */
export const markdownParser = new MarkdownParser(
  markdownSchema,
  markdownItInstance,
  {
    ...defaultMarkdownParser.tokens,
    s: { mark: "strikethrough" },
  }
);
