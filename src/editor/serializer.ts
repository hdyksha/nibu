import { MarkdownSerializer, defaultMarkdownSerializer } from "prosemirror-markdown";

/**
 * Markdown serializer that converts a ProseMirror document back to markdown text.
 * Extends the default prosemirror-markdown serializer with strikethrough (~~text~~) support.
 */
export const markdownSerializer = new MarkdownSerializer(
  { ...defaultMarkdownSerializer.nodes },
  {
    ...defaultMarkdownSerializer.marks,
    strikethrough: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  }
);
