import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { markdownSchema } from "../editor/schema";
import { markdownParser } from "../editor/parser";
import { markdownSerializer } from "../editor/serializer";

export interface MarkdownEditorProps {
  content: string;
  viewMode: "preview" | "raw";
  onChange: (content: string) => void;
}

export interface MarkdownEditorHandle {
  /** Current ProseMirror EditorView (null in raw mode) */
  editorView: EditorView | null;
}

/**
 * ProseMirror-backed markdown editor with preview/raw mode toggle.
 *
 * - preview mode: WYSIWYG rendering via ProseMirror
 * - raw mode: plain textarea showing markdown source
 *
 * Exposes EditorView via ref for Toolbar integration.
 */
export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ content, viewMode, onChange }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Track the latest content to avoid echoing back our own changes
    const contentRef = useRef(content);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      get editorView() {
        return viewRef.current;
      },
    }));

    // Create / destroy ProseMirror view
    useEffect(() => {
      if (viewMode !== "preview" || !editorRef.current) return;

      const doc = markdownParser.parse(content) ?? markdownSchema.topNodeType.create();

      const state = EditorState.create({
        doc,
        plugins: [
          history(),
          keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
          keymap(baseKeymap),
        ],
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          const newState = view.state.apply(tr);
          view.updateState(newState);
          if (tr.docChanged) {
            const md = markdownSerializer.serialize(newState.doc);
            contentRef.current = md;
            onChangeRef.current(md);
          }
        },
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // Re-create when switching TO preview mode.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    // Sync external content changes into ProseMirror (preview mode)
    useEffect(() => {
      if (viewMode !== "preview") return;
      if (content === contentRef.current) return;
      contentRef.current = content;

      const view = viewRef.current;
      if (!view) return;

      const doc = markdownParser.parse(content) ?? markdownSchema.topNodeType.create();
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
      view.dispatch(tr);
    }, [content, viewMode]);

    // Raw mode change handler
    const handleRawChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        contentRef.current = value;
        onChange(value);
      },
      [onChange],
    );

    if (viewMode === "raw") {
      return (
        <textarea
          className="w-full h-full p-4 font-mono text-sm bg-white border-0 resize-none outline-none"
          value={content}
          onChange={handleRawChange}
          spellCheck={false}
          aria-label="Markdown source editor"
        />
      );
    }

    return (
      <div
        ref={editorRef}
        className="w-full h-full prose prose-sm max-w-none p-4 outline-none"
        aria-label="Rich text editor"
      />
    );
  },
);
