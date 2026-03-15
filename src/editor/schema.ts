import { Schema } from "prosemirror-model";
import { schema as baseSchema } from "prosemirror-markdown";

/**
 * ProseMirror schema for markdown editing.
 * Extends the default prosemirror-markdown schema with strikethrough support.
 *
 * Nodes (from base): doc, paragraph, blockquote, horizontal_rule, heading,
 *   code_block, ordered_list, bullet_list, list_item, text, image, hard_break
 * Marks (from base): em, strong, link, code
 * Marks (added): strikethrough
 */
export const markdownSchema = new Schema({
  nodes: baseSchema.spec.nodes,
  marks: baseSchema.spec.marks.append({
    strikethrough: {
      parseDOM: [
        { tag: "s" },
        { tag: "del" },
        { style: "text-decoration=line-through" },
      ],
      toDOM() {
        return ["del"];
      },
    },
  }),
});
