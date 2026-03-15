import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { markdownSchema } from "../editor/schema";

export interface ToolbarProps {
  editorView: EditorView | null;
}

export type ToolbarAction =
  | "bold" | "italic" | "strikethrough"
  | "heading1" | "heading2" | "heading3"
  | "bulletList" | "orderedList" | "codeBlock"
  | "link" | "image";

interface ButtonDef {
  action: ToolbarAction;
  label: string;
  ariaLabel: string;
}

const BUTTONS: ButtonDef[] = [
  { action: "bold", label: "B", ariaLabel: "Bold" },
  { action: "italic", label: "I", ariaLabel: "Italic" },
  { action: "strikethrough", label: "S", ariaLabel: "Strikethrough" },
  { action: "heading1", label: "H1", ariaLabel: "Heading 1" },
  { action: "heading2", label: "H2", ariaLabel: "Heading 2" },
  { action: "heading3", label: "H3", ariaLabel: "Heading 3" },
  { action: "bulletList", label: "•", ariaLabel: "Bullet list" },
  { action: "orderedList", label: "1.", ariaLabel: "Ordered list" },
  { action: "codeBlock", label: "<>", ariaLabel: "Code block" },
  { action: "link", label: "🔗", ariaLabel: "Insert link" },
  { action: "image", label: "🖼", ariaLabel: "Insert image" },
];

export function executeToolbarAction(view: EditorView, action: ToolbarAction): boolean {
  const { state, dispatch } = view;
  const schema = markdownSchema;
  switch (action) {
    case "bold": return toggleMark(schema.marks.strong)(state, dispatch);
    case "italic": return toggleMark(schema.marks.em)(state, dispatch);
    case "strikethrough": return toggleMark(schema.marks.strikethrough)(state, dispatch);
    case "heading1": return setBlockType(schema.nodes.heading, { level: 1 })(state, dispatch);
    case "heading2": return setBlockType(schema.nodes.heading, { level: 2 })(state, dispatch);
    case "heading3": return setBlockType(schema.nodes.heading, { level: 3 })(state, dispatch);
    case "bulletList": return wrapInList(schema.nodes.bullet_list)(state, dispatch);
    case "orderedList": return wrapInList(schema.nodes.ordered_list)(state, dispatch);
    case "codeBlock": return setBlockType(schema.nodes.code_block)(state, dispatch);
    case "link": {
      const href = window.prompt("URL:");
      if (!href) return false;
      const title = window.prompt("Title (optional):") ?? "";
      return toggleMark(schema.marks.link, { href, title })(state, dispatch);
    }
    case "image": {
      const src = window.prompt("Image URL:");
      if (!src) return false;
      const alt = window.prompt("Alt text (optional):") ?? "";
      const node = schema.nodes.image.create({ src, alt });
      dispatch(state.tr.replaceSelectionWith(node));
      return true;
    }
    default: return false;
  }
}

export function Toolbar({ editorView }: ToolbarProps) {
  const disabled = !editorView;

  const handleClick = (action: ToolbarAction) => {
    if (!editorView) return;
    executeToolbarAction(editorView, action);
    editorView.focus();
  };

  return (
    <div className="flex gap-0.5 px-1" role="toolbar" aria-label="Formatting toolbar">
      {BUTTONS.map(({ action, label, ariaLabel }) => (
        <button
          key={action}
          type="button"
          className="px-2 py-1.5 text-sm rounded-md text-[var(--text-secondary)] hover:bg-slate-100 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={disabled}
          onClick={() => handleClick(action)}
          aria-label={ariaLabel}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
