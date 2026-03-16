import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorState, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { markdownSchema } from "../editor/schema";
import { markdownParser } from "../editor/parser";
import { markdownSerializer } from "../editor/serializer";

export interface SavedPosition {
  cursorOffset: number;
  scrollRatio: number;
}

export interface MarkdownEditorProps {
  content: string;
  viewMode: "preview" | "raw";
  onChange: (content: string) => void;
  /** Position to restore after mode switch */
  savedPosition?: SavedPosition | null;
}

export interface MarkdownEditorHandle {
  /** Current ProseMirror EditorView (null in raw mode) */
  editorView: EditorView | null;
  /** Get current cursor offset in markdown source */
  getCursorOffset: () => number;
  /** Get current scroll ratio */
  getScrollRatio: () => number;
  /** Focus the editor */
  focus: () => void;
}

/**
 * ProseMirror-backed markdown editor with preview/raw mode toggle.
 *
 * - preview mode: WYSIWYG rendering via ProseMirror
 * - raw mode: plain textarea showing markdown source
 *
 * Supports cursor/scroll position preservation across mode switches (Req 2.6).
 * Exposes EditorView via ref for Toolbar integration.
 */
export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ content, viewMode, onChange, savedPosition }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const contentRef = useRef(content);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    /** Convert ProseMirror position to character offset in markdown source */
    const getCursorOffset = useCallback((): number => {
      if (viewMode === "raw") {
        return textareaRef.current?.selectionStart ?? 0;
      }
      const view = viewRef.current;
      if (!view) return 0;
      const { from } = view.state.selection;
      const beforeSlice = view.state.doc.slice(0, from);
      const tempDoc = markdownSchema.topNodeType.create(null, beforeSlice.content);
      return markdownSerializer.serialize(tempDoc).length;
    }, [viewMode]);

    /** Get scroll ratio (0-1) of the editor container */
    const getScrollRatio = useCallback((): number => {
      if (viewMode === "raw") {
        const ta = textareaRef.current;
        if (!ta || ta.scrollHeight <= ta.clientHeight) return 0;
        return ta.scrollTop / (ta.scrollHeight - ta.clientHeight);
      }
      const el = editorRef.current;
      if (!el || el.scrollHeight <= el.clientHeight) return 0;
      return el.scrollTop / (el.scrollHeight - el.clientHeight);
    }, [viewMode]);

    useImperativeHandle(ref, () => ({
      get editorView() {
        return viewRef.current;
      },
      getCursorOffset,
      getScrollRatio,
      focus() {
        if (viewRef.current) {
          viewRef.current.focus();
        } else if (textareaRef.current) {
          textareaRef.current.focus();
        }
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

      // Restore cursor position after ProseMirror mounts
      if (savedPosition) {
        requestAnimationFrame(() => {
          try {
            const targetOffset = savedPosition.cursorOffset;
            const resolvedPos = findProseMirrorPos(view, targetOffset);
            const selection = Selection.near(view.state.doc.resolve(resolvedPos));
            const tr = view.state.tr.setSelection(selection);
            view.dispatch(tr);
            view.focus();

            const el = editorRef.current;
            if (el && el.scrollHeight > el.clientHeight) {
              el.scrollTop = savedPosition.scrollRatio * (el.scrollHeight - el.clientHeight);
            }
          } catch {
            // Position restoration is best-effort
          }
        });
      } else {
        requestAnimationFrame(() => view.focus());
      }

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    // Restore position in raw mode (textarea)
    useEffect(() => {
      if (viewMode !== "raw") return;
      const ta = textareaRef.current;
      if (!ta) return;

      if (savedPosition) {
        requestAnimationFrame(() => {
          const offset = Math.min(savedPosition.cursorOffset, ta.value.length);
          ta.setSelectionRange(offset, offset);
          ta.focus();

          if (ta.scrollHeight > ta.clientHeight) {
            ta.scrollTop = savedPosition.scrollRatio * (ta.scrollHeight - ta.clientHeight);
          }
        });
      } else {
        requestAnimationFrame(() => ta.focus());
      }
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
          ref={textareaRef}
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

/**
 * Find the ProseMirror document position closest to a character offset
 * in the serialized markdown text.
 */
function findProseMirrorPos(view: EditorView, targetOffset: number): number {
  const docSize = view.state.doc.content.size;
  if (targetOffset <= 0) return 0;

  let lo = 0;
  let hi = docSize;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const slice = view.state.doc.slice(0, mid);
    const tempDoc = markdownSchema.topNodeType.create(null, slice.content);
    const len = markdownSerializer.serialize(tempDoc).length;
    if (len < targetOffset) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return Math.min(lo, docSize);
}
