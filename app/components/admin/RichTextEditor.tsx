"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect } from "react";
import {
  FiBold, FiItalic, FiUnderline, FiList,
  FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiLink, FiCode, FiMinus,
} from "react-icons/fi";
import {
  MdFormatListNumbered, MdFormatQuote,
  MdFormatClear,
} from "react-icons/md";

interface Props {
  value:       string;
  onChange:    (html: string) => void;
  placeholder?: string;
  minHeight?:  string;
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick:   () => void;
  active?:   boolean;
  disabled?: boolean;
  title:     string;
  children:  React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded-lg text-sm transition-all ${
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[var(--border)] mx-0.5 self-center" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RichTextEditor({ value, onChange, placeholder = "Write your lesson content here…", minHeight = "280px" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:       { levels: [2, 3, 4] },
        bulletList:    {},
        orderedList:   {},
        blockquote:    {},
        code:          {},
        codeBlock:     {},
        horizontalRule: {},
      }),
      Underline,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require("@tiptap/extension-text-style") as { TextStyle: unknown }).TextStyle as import("@tiptap/core").AnyExtension,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require("@tiptap/extension-text-style") as { Color: unknown }).Color as import("@tiptap/core").AnyExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[var(--accent)] underline cursor-pointer" } }),
      Placeholder.configure({ placeholder }),
    ],
    content:           value,
    editorProps: {
      attributes: {
        class:        "tiptap-editor-inner",
        style:        `min-height: ${minHeight}`,
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. when loading saved content)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== "<p></p>" && value !== "") {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url  = window.prompt("Enter URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const headingLevel = editor.isActive("heading", { level: 2 }) ? "h2"
    : editor.isActive("heading", { level: 3 }) ? "h3"
    : editor.isActive("heading", { level: 4 }) ? "h4"
    : "p";

  return (
    <div className="tiptap-editor border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)] focus-within:border-[var(--accent)] transition-colors">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">

        {/* Heading select */}
        <select
          value={headingLevel}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(v.replace("h", "")) as 2|3|4 }).run();
          }}
          className="text-xs h-7 px-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive("bold")}      title="Bold (Ctrl+B)"><FiBold size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive("italic")}    title="Italic (Ctrl+I)"><FiItalic size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)"><FiUnderline size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()}      active={editor.isActive("code")}      title="Inline Code"><FiCode size={13} /></ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}   active={editor.isActive({ textAlign: "left" })}   title="Align Left"><FiAlignLeft size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center"><FiAlignCenter size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}  active={editor.isActive({ textAlign: "right" })}  title="Align Right"><FiAlignRight size={13} /></ToolBtn>

        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive("bulletList")}  title="Bullet List"><FiList size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List"><MdFormatListNumbered size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive("blockquote")}  title="Blockquote"><MdFormatQuote size={14} /></ToolBtn>

        <Divider />

        <ToolBtn onClick={setLink}   active={editor.isActive("link")}   title="Insert / Edit Link"><FiLink size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><FiMinus size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting"><MdFormatClear size={14} /></ToolBtn>

        {/* Word count */}
        <span className="ml-auto text-[10px] text-[var(--text-muted)] pr-1 select-none">
          {editor.storage.characterCount?.words?.() ?? 0} words
        </span>
      </div>

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        className="prose-editor-content"
        style={{ minHeight }}
      />
    </div>
  );
}
