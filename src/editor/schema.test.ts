import { describe, it, expect } from "vitest";
import { markdownSchema } from "./schema";
import { markdownParser } from "./parser";
import { markdownSerializer } from "./serializer";

describe("markdownSchema", () => {
  describe("デフォルトスキーマの統合検証", () => {
    it("should have all required node types from base schema", () => {
      const nodeNames = Object.keys(markdownSchema.nodes);
      const expected = [
        "doc", "paragraph", "heading", "blockquote", "code_block",
        "horizontal_rule", "ordered_list", "bullet_list", "list_item",
        "image", "hard_break", "text",
      ];
      for (const name of expected) {
        expect(nodeNames).toContain(name);
      }
    });

    it("should have all base mark types", () => {
      const markNames = Object.keys(markdownSchema.marks);
      for (const name of ["strong", "em", "code", "link"]) {
        expect(markNames).toContain(name);
      }
    });
  });

  describe("カスタム拡張: strikethrough", () => {
    it("should include strikethrough mark in schema", () => {
      expect(Object.keys(markdownSchema.marks)).toContain("strikethrough");
    });
  });
});

describe("markdownParser", () => {
  describe("デフォルト構文のパース検証", () => {
    it("should parse a simple paragraph", () => {
      const doc = markdownParser.parse("Hello world");
      expect(doc.type.name).toBe("doc");
      expect(doc.firstChild?.type.name).toBe("paragraph");
      expect(doc.firstChild?.textContent).toBe("Hello world");
    });

    it("should parse headings h1-h6", () => {
      for (let level = 1; level <= 6; level++) {
        const doc = markdownParser.parse("#".repeat(level) + " Heading " + level);
        const heading = doc.firstChild!;
        expect(heading.type.name).toBe("heading");
        expect(heading.attrs.level).toBe(level);
      }
    });

    it("should parse bold text", () => {
      const doc = markdownParser.parse("**bold**");
      const textNode = doc.firstChild!.firstChild!;
      expect(textNode.marks.some((m) => m.type.name === "strong")).toBe(true);
    });

    it("should parse italic text", () => {
      const doc = markdownParser.parse("*italic*");
      const textNode = doc.firstChild!.firstChild!;
      expect(textNode.marks.some((m) => m.type.name === "em")).toBe(true);
    });

    it("should parse inline code", () => {
      const doc = markdownParser.parse("`code`");
      const textNode = doc.firstChild!.firstChild!;
      expect(textNode.marks.some((m) => m.type.name === "code")).toBe(true);
    });

    it("should parse links", () => {
      const doc = markdownParser.parse("[link](https://example.com)");
      const textNode = doc.firstChild!.firstChild!;
      const linkMark = textNode.marks.find((m) => m.type.name === "link");
      expect(linkMark).toBeDefined();
      expect(linkMark!.attrs.href).toBe("https://example.com");
    });

    it("should parse blockquotes", () => {
      const doc = markdownParser.parse("> quote");
      expect(doc.firstChild?.type.name).toBe("blockquote");
    });

    it("should parse code blocks", () => {
      const doc = markdownParser.parse("```js\nconsole.log('hi')\n```");
      const codeBlock = doc.firstChild!;
      expect(codeBlock.type.name).toBe("code_block");
      expect(codeBlock.attrs.params).toBe("js");
    });

    it("should parse horizontal rules", () => {
      const doc = markdownParser.parse("---");
      expect(doc.firstChild?.type.name).toBe("horizontal_rule");
    });

    it("should parse bullet lists", () => {
      const doc = markdownParser.parse("* item 1\n* item 2");
      expect(doc.firstChild?.type.name).toBe("bullet_list");
      expect(doc.firstChild?.childCount).toBe(2);
    });

    it("should parse ordered lists", () => {
      const doc = markdownParser.parse("1. first\n2. second");
      expect(doc.firstChild?.type.name).toBe("ordered_list");
      expect(doc.firstChild?.childCount).toBe(2);
    });

    it("should parse images", () => {
      const doc = markdownParser.parse("![alt text](https://example.com/img.png)");
      const imageNode = doc.firstChild!.firstChild!;
      expect(imageNode.type.name).toBe("image");
      expect(imageNode.attrs.src).toBe("https://example.com/img.png");
      expect(imageNode.attrs.alt).toBe("alt text");
    });
  });

  describe("カスタム拡張: strikethrough パース", () => {
    it("should parse strikethrough text", () => {
      const doc = markdownParser.parse("~~deleted~~");
      const textNode = doc.firstChild!.firstChild!;
      expect(textNode.marks.some((m) => m.type.name === "strikethrough")).toBe(true);
    });
  });
});

describe("markdownSerializer", () => {
  describe("デフォルト構文のラウンドトリップ検証", () => {
    it("should round-trip a simple paragraph", () => {
      const doc = markdownParser.parse("Hello world");
      expect(markdownSerializer.serialize(doc).trim()).toBe("Hello world");
    });

    it("should round-trip headings", () => {
      const input = "## Heading 2";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip bold text", () => {
      const input = "**bold text**";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip italic text", () => {
      const input = "*italic text*";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip inline code", () => {
      const input = "`inline code`";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip links", () => {
      const input = "[example](https://example.com)";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip blockquotes", () => {
      const input = "> quoted text";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip code blocks", () => {
      const input = "```js\nconsole.log('hi')\n```";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });

    it("should round-trip horizontal rules", () => {
      const doc = markdownParser.parse("---");
      expect(markdownSerializer.serialize(doc).trim()).toBe("---");
    });

    it("should round-trip bullet lists", () => {
      const doc = markdownParser.parse("* item 1\n* item 2");
      const output = markdownSerializer.serialize(doc);
      expect(output).toContain("* item 1");
      expect(output).toContain("* item 2");
    });

    it("should round-trip ordered lists", () => {
      const doc = markdownParser.parse("1. first\n2. second");
      const output = markdownSerializer.serialize(doc);
      expect(output).toContain("1. first");
      expect(output).toContain("2. second");
    });
  });

  describe("カスタム拡張: strikethrough ラウンドトリップ", () => {
    it("should round-trip strikethrough text", () => {
      const input = "~~deleted text~~";
      const doc = markdownParser.parse(input);
      expect(markdownSerializer.serialize(doc).trim()).toBe(input);
    });
  });
});
