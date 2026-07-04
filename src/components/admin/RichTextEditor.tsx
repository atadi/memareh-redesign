'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Node } from '@tiptap/core'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Undo,
  Redo,
  Link2,
  Link2Off,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  ChevronDown,
  Minus,
  RemoveFormatting,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Youtube,
  Upload,
  TableCellsMerge,
  TableCellsSplit,
  Delete,
  Columns2,
  Rows2,
  ExternalLink,
  Pencil
} from 'lucide-react'
import { useCallback, useState, useRef } from 'react'
import { uploadContentImage } from '@/lib/uploadImage'
import toast from 'react-hot-toast'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
}

const YoutubeEmbed = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: '400' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-embed] iframe',
        getAttrs: (node) => {
          const iframe = node as HTMLIFrameElement
          return { src: iframe.src }
        },
      },
      {
        tag: 'iframe[src*="youtube"]',
        getAttrs: (node) => {
          const iframe = node as HTMLIFrameElement
          return { src: iframe.src }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-youtube-embed': 'true',
        class: 'relative w-full aspect-video my-4 rounded-lg overflow-hidden',
      },
      [
        'iframe',
        {
          src: HTMLAttributes.src,
          width: '100%',
          height: '100%',
          frameborder: '0',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          class: 'absolute inset-0 w-full h-full',
          style: 'border: none;',
        },
      ],
    ]
  },
})

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showLinkEditor, setShowLinkEditor] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [youTubeUrl, setYouTubeUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full'
        }
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2'
        }
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 bg-gray-100 font-bold'
        }
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose'
        }
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start gap-2'
        },
        nested: true
      }),
      Superscript,
      Subscript,
      Placeholder.configure({
        placeholder: 'محتوا را اینجا بنویسید...',
      }),
      YoutubeEmbed,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[400px] p-4'
      }
    }
  })

  const isInTable = editor?.isActive('table')

  const addLink = useCallback(() => {
    if (!editor) return

    if (editor.isActive('link')) {
      const href = editor.getAttributes('link').href
      setLinkUrl(href || '')
      setShowLinkEditor(true)
    } else {
      setLinkUrl('')
      setShowLinkEditor(true)
    }
  }, [editor])

  const saveLink = useCallback(() => {
    if (!editor) return

    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkEditor(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setShowLinkEditor(false)
  }, [editor])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return

    setUploading(true)
    const toastId = toast.loading('در حال آپلود تصویر...')

    try {
      const { url, error } = await uploadContentImage(file)
      if (error) {
        toast.error(error, { id: toastId })
        return
      }
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
        toast.success('تصویر با موفقیت اضافه شد', { id: toastId })
      }
    } catch {
      toast.error('خطا در آپلود تصویر', { id: toastId })
    } finally {
      setUploading(false)
    }
  }, [editor])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('لطفا یک فایل تصویری انتخاب کنید')
      return
    }
    handleImageUpload(file)
    e.target.value = ''
  }, [handleImageUpload])

  const addImageUrl = useCallback(() => {
    if (!editor) return
    const url = window.prompt('آدرس تصویر را وارد کنید:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const addYouTubeEmbed = useCallback(() => {
    if (!youTubeUrl) return

    const getYouTubeId = (url: string) => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
      ]
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
      }
      return null
    }

    const videoId = getYouTubeId(youTubeUrl)
    if (!videoId) {
      toast.error('آدرس یوتیوب معتبر نیست')
      return
    }

    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'youtube',
        attrs: {
          src: `https://www.youtube.com/embed/${videoId}`,
        },
      })
      .run()

    setShowYouTubeModal(false)
    setYouTubeUrl('')
  }, [editor, youTubeUrl])

  const addTableRow = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addRowAfter().run()
  }, [editor])

  const removeTableRow = useCallback(() => {
    if (!editor) return
    editor.chain().focus().deleteRow().run()
  }, [editor])

  const addTableCol = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addColumnAfter().run()
  }, [editor])

  const removeTableCol = useCallback(() => {
    if (!editor) return
    editor.chain().focus().deleteColumn().run()
  }, [editor])

  const toggleCodeBlock = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleCodeBlock().run()
  }, [editor])

  const colors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ]

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    title,
    children,
    disabled
  }: {
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? 'bg-gray-300' : ''
      }`}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 border-l border-gray-300 pl-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="ضخیم">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="مورب">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="زیرخط">
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="خط خورده">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="کد درون خطی">
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={toggleCodeBlock} isActive={editor.isActive('codeBlock')} title="بلوک کد">
            <Code2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')} title="بالانویس">
            <SuperscriptIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')} title="زیرنویس">
            <SubscriptIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-l border-gray-300 pl-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="عنوان ۱">
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="عنوان ۲">
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="عنوان ۳">
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-l border-gray-300 pl-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="لیست نقطه‌ای">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="لیست شماره‌دار">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="لیست چک‌باکس">
            <ListChecks className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="نقل قول">
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="خط افقی">
            <Minus className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-l border-gray-300 pl-1">
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="چپ">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="وسط">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="راست">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="هم‌تراز">
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Color & Highlight */}
        <div className="flex gap-1 border-l border-gray-300 pl-1 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded hover:bg-gray-200 flex items-center gap-1"
              title="رنگ متن"
            >
              <Palette className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-10 grid grid-cols-6 gap-1">
                {colors.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run()
                      setShowColorPicker(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowColorPicker(false)
                  }}
                  className="col-span-6 text-xs py-1 text-gray-500 hover:text-gray-700"
                >
                  حذف رنگ
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              className="p-2 rounded hover:bg-gray-200 flex items-center gap-1"
              title="هایلایت"
            >
              <Highlighter className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-10 grid grid-cols-6 gap-1">
                {colors.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color }).run()
                      setShowHighlightPicker(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Insert */}
        <div className="flex gap-1 border-l border-gray-300 pl-1">
          <div className="relative">
            <button
              type="button"
              onClick={addLink}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
              title={editor.isActive('link') ? 'ویرایش لینک' : 'افزودن لینک'}
            >
              <Link2 className="w-4 h-4" />
            </button>
            {showLinkEditor && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[300px]">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-1.5 border rounded text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveLink()
                      if (e.key === 'Escape') setShowLinkEditor(false)
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveLink}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {editor.isActive('link') ? 'بروزرسانی' : 'افزودن'}
                  </button>
                  {editor.isActive('link') && (
                    <button
                      type="button"
                      onClick={removeLink}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      <Link2Off className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLinkEditor(false)}
                    className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed ${uploading ? 'opacity-50' : ''}`}
            title="آپلود تصویر"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={addImageUrl}
            className="p-2 rounded hover:bg-gray-200"
            title="افزودن تصویر با آدرس"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowYouTubeModal(true)}
            className="p-2 rounded hover:bg-gray-200"
            title="افزودن ویدیو یوتیوب"
          >
            <Youtube className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={addTable}
            className="p-2 rounded hover:bg-gray-200"
            title="افزودن جدول"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Table Controls (contextual) */}
        {isInTable && (
          <div className="flex gap-1 border-l border-gray-300 pl-1">
            <ToolbarButton onClick={addTableRow} title="افزودن ردیف">
              <Rows2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={removeTableRow} title="حذف ردیف">
              <Delete className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addTableCol} title="افزودن ستون">
              <Columns2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={removeTableCol} title="حذف ستون">
              <TableCellsSplit className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}

        {/* Clear formatting + Undo/Redo */}
        <div className="flex gap-1">
          <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="پاک کردن قالب‌بندی">
            <RemoveFormatting className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px bg-gray-300 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="بازگشت">
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="جلو">
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* YouTube Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowYouTubeModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">افزودن ویدیو یوتیوب</h3>
            <input
              type="url"
              value={youTubeUrl}
              onChange={(e) => setYouTubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2 border rounded-lg mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addYouTubeEmbed()
                if (e.key === 'Escape') { setShowYouTubeModal(false); setYouTubeUrl('') }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowYouTubeModal(false); setYouTubeUrl('') }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={addYouTubeEmbed}
                disabled={!youTubeUrl}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                افزودن ویدیو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
