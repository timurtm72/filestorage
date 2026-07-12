import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Home,
  Link,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  StickyNote,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import './App.css'

type FolderItem = {
  id: string
  parentId: string | null
  name: string
  createdAt: string
}

type StoredFile = {
  id: string
  folderId: string | null
  originalName: string
  storageName: string
  sizeBytes: number
  contentType: string
  createdAt: string
}

type BookmarkItem = {
  id: string
  groupId: string | null
  title: string
  url: string
  description: string | null
  createdAt: string
}

type NoteItem = {
  id: string
  groupId: string | null
  title: string
  content: string
  color: NoteColor
  createdAt: string
  updatedAt: string
}

type NoteColor = 'white' | 'yellow' | 'green' | 'blue' | 'rose'

type FolderPathItem = {
  id: string | null
  name: string
}

type Tab = 'files' | 'bookmarks' | 'notes'
type ToastType = 'success' | 'error'

type Toast = {
  id: number
  type: ToastType
  text: string
}

type ConfirmAction = {
  title: string
  text: string
  confirmText: string
  onConfirm: () => Promise<void>
}

type FolderContents = {
  folders: FolderItem[]
  files: StoredFile[]
}

type ContentGroup = { id: string; type: 'BOOKMARK' | 'NOTE'; name: string; createdAt: string }

const NOTE_COLORS: { value: NoteColor; label: string }[] = [
  { value: 'white', label: 'Белый' },
  { value: 'yellow', label: 'Жёлтый' },
  { value: 'green', label: 'Зелёный' },
  { value: 'blue', label: 'Голубой' },
  { value: 'rose', label: 'Розовый' },
]

const api = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url)
    return parseResponse<T>(response)
  },
  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse<T>(response)
  },
  async patch<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse<T>(response)
  },
  async delete(url: string): Promise<void> {
    const response = await fetch(url, { method: 'DELETE' })
    await parseResponse<void>(response)
  },
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }
    return response.json()
  }

  const payload = await response.json().catch(() => null)
  throw new Error(payload?.message ?? 'Ошибка запроса')
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('files')
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<StoredFile[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [bookmarkGroups, setBookmarkGroups] = useState<ContentGroup[]>([])
  const [noteGroups, setNoteGroups] = useState<ContentGroup[]>([])
  const [bookmarkGroup, setBookmarkGroup] = useState('all')
  const [noteGroup, setNoteGroup] = useState('all')
  const [path, setPath] = useState<FolderPathItem[]>([{ id: null, name: 'Главная' }])
  const [folderName, setFolderName] = useState('')
  const [bookmarkForm, setBookmarkForm] = useState({ title: '', url: '', description: '', groupId: '' })
  const [noteForm, setNoteForm] = useState<{ title: string; content: string; color: NoteColor; groupId: string }>({
    title: '',
    content: '',
    color: 'white', groupId: '',
  })
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, FolderContents>>({})
  const [loadingFolders, setLoadingFolders] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const currentFolder = path[path.length - 1]
  const currentFolderId = currentFolder.id

  const totalFileSize = useMemo(
    () => files.reduce((total, file) => total + file.sizeBytes, 0),
    [files],
  )

  const filteredNotes = useMemo(() => {
    const query = noteSearch.trim().toLocaleLowerCase('ru-RU')
    const grouped = notes.filter((note) => noteGroup === 'all' || (noteGroup === 'ungrouped' ? !note.groupId : note.groupId === noteGroup))
    if (!query) return grouped
    return grouped.filter((note) =>
      `${note.title} ${note.content}`.toLocaleLowerCase('ru-RU').includes(query),
    )
  }, [noteSearch, notes, noteGroup])

  const filteredBookmarks = useMemo(() => bookmarks.filter((bookmark) =>
    bookmarkGroup === 'all' || (bookmarkGroup === 'ungrouped' ? !bookmark.groupId : bookmark.groupId === bookmarkGroup)
  ), [bookmarks, bookmarkGroup])

  useEffect(() => {
    void loadFilesView(currentFolderId)
  }, [currentFolderId])

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      void loadBookmarks()
    }
    if (activeTab === 'notes') {
      void loadNotes()
    }
  }, [activeTab])

  async function loadFilesView(folderId: string | null) {
    setIsLoading(true)
    try {
      const folderSuffix = folderId ? `?${new URLSearchParams({ parentId: folderId })}` : ''
      const fileSuffix = folderId ? `?${new URLSearchParams({ folderId })}` : ''
      const [nextFolders, nextFiles] = await Promise.all([
        api.get<FolderItem[]>(`/api/folders${folderSuffix}`),
        api.get<StoredFile[]>(`/api/files${fileSuffix}`),
      ])
      setFolders(nextFolders)
      setFiles(nextFiles)
      setExpandedFolders({})
    } catch (error) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function getFolderContents(folderId: string): Promise<FolderContents> {
    const folderSuffix = `?${new URLSearchParams({ parentId: folderId })}`
    const fileSuffix = `?${new URLSearchParams({ folderId })}`
    const [childFolders, childFiles] = await Promise.all([
      api.get<FolderItem[]>(`/api/folders${folderSuffix}`),
      api.get<StoredFile[]>(`/api/files${fileSuffix}`),
    ])
    return { folders: childFolders, files: childFiles }
  }

  async function toggleFolder(folder: FolderItem) {
    if (expandedFolders[folder.id]) {
      setExpandedFolders((items) => {
        const next = { ...items }
        delete next[folder.id]
        return next
      })
      return
    }

    setLoadingFolders((items) => ({ ...items, [folder.id]: true }))
    try {
      const contents = await getFolderContents(folder.id)
      setExpandedFolders((items) => ({ ...items, [folder.id]: contents }))
    } catch (error) {
      showError(error)
    } finally {
      setLoadingFolders((items) => ({ ...items, [folder.id]: false }))
    }
  }

  async function refreshFolderBranch(folderId: string | null) {
    if (!folderId || !expandedFolders[folderId]) {
      await loadFilesView(currentFolderId)
      return
    }

    const contents = await getFolderContents(folderId)
    setExpandedFolders((items) => ({ ...items, [folderId]: contents }))
  }

  async function loadBookmarks() {
    setIsLoading(true)
    try {
      const [items, groups] = await Promise.all([api.get<BookmarkItem[]>('/api/bookmarks'), api.get<ContentGroup[]>('/api/groups?type=BOOKMARK')])
      setBookmarks(items); setBookmarkGroups(groups)
    } catch (error) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadNotes() {
    setIsLoading(true)
    try {
      const [items, groups] = await Promise.all([api.get<NoteItem[]>('/api/notes'), api.get<ContentGroup[]>('/api/groups?type=NOTE')])
      setNotes(items); setNoteGroups(groups)
    } catch (error) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createFolder(event: FormEvent) {
    event.preventDefault()
    if (!folderName.trim()) {
      return
    }

    try {
      await api.post<FolderItem>('/api/folders', {
        parentId: currentFolderId,
        name: folderName.trim(),
      })
      setFolderName('')
      notify('success', 'Папка создана')
      await loadFilesView(currentFolderId)
    } catch (error) {
      showError(error)
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    const suffix = currentFolderId ? `?${new URLSearchParams({ folderId: currentFolderId })}` : ''

    try {
      const response = await fetch(`/api/files/upload${suffix}`, {
        method: 'POST',
        body: formData,
      })
      await parseResponse<StoredFile>(response)
      notify('success', `Файл «${file.name}» загружен`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadFilesView(currentFolderId)
    } catch (error) {
      showError(error)
    }
  }

  function confirmDeleteFolder(folder: FolderItem) {
    setConfirmAction({
      title: 'Удалить папку?',
      text: `Папка «${folder.name}» будет удалена, если она пустая.`,
      confirmText: 'Удалить папку',
      onConfirm: async () => {
        try {
          await api.delete(`/api/folders/${folder.id}`)
          notify('success', 'Папка удалена')
          setExpandedFolders((items) => {
            const next = { ...items }
            delete next[folder.id]
            return next
          })
          await refreshFolderBranch(folder.parentId)
        } catch (error) {
          showError(error)
        }
      },
    })
  }

  async function renameFolder(folder: FolderItem) {
    const name = window.prompt('Новое название папки', folder.name)?.trim()
    if (!name || name === folder.name) return
    try {
      await api.patch<FolderItem>(`/api/folders/${folder.id}`, { name })
      setPath((items) => items.map((item) => item.id === folder.id ? { ...item, name } : item))
      notify('success', 'Папка переименована')
      await refreshFolderBranch(folder.parentId)
    } catch (error) { showError(error) }
  }

  async function createGroup(type: 'BOOKMARK' | 'NOTE') {
    const name = window.prompt('Название новой группы')?.trim()
    if (!name) return
    try {
      await api.post<ContentGroup>('/api/groups', { type, name })
      notify('success', 'Группа создана')
      await (type === 'BOOKMARK' ? loadBookmarks() : loadNotes())
    } catch (error) { showError(error) }
  }

  async function renameGroup(group: ContentGroup) {
    const name = window.prompt('Новое название группы', group.name)?.trim()
    if (!name || name === group.name) return
    try {
      await api.patch<ContentGroup>(`/api/groups/${group.id}`, { type: group.type, name })
      notify('success', 'Группа переименована')
      await (group.type === 'BOOKMARK' ? loadBookmarks() : loadNotes())
    } catch (error) { showError(error) }
  }

  function deleteGroup(group: ContentGroup) {
    setConfirmAction({ title: 'Удалить группу?', text: `Группа «${group.name}» должна быть пустой.`, confirmText: 'Удалить группу', onConfirm: async () => {
      try {
        await api.delete(`/api/groups/${group.id}`)
        if (group.type === 'BOOKMARK') setBookmarkGroup('all'); else setNoteGroup('all')
        notify('success', 'Группа удалена')
        await (group.type === 'BOOKMARK' ? loadBookmarks() : loadNotes())
      } catch (error) { showError(error) }
    }})
  }

  function confirmDeleteFile(file: StoredFile) {
    setConfirmAction({
      title: 'Удалить файл?',
      text: `Файл «${file.originalName}» будет удален из текущей папки.`,
      confirmText: 'Удалить файл',
      onConfirm: async () => {
        try {
          await api.delete(`/api/files/${file.id}`)
          notify('success', 'Файл удален')
          await refreshFolderBranch(file.folderId)
        } catch (error) {
          showError(error)
        }
      },
    })
  }

  async function createBookmark(event: FormEvent) {
    event.preventDefault()
    if (!bookmarkForm.title.trim() || !bookmarkForm.url.trim()) {
      return
    }

    try {
      await api.post<BookmarkItem>('/api/bookmarks', {
        title: bookmarkForm.title.trim(),
        url: bookmarkForm.url.trim(),
        description: bookmarkForm.description.trim(),
        groupId: bookmarkForm.groupId || null,
      })
      setBookmarkForm({ title: '', url: '', description: '', groupId: bookmarkForm.groupId })
      notify('success', 'Закладка сохранена')
      await loadBookmarks()
    } catch (error) {
      showError(error)
    }
  }

  function confirmDeleteBookmark(bookmark: BookmarkItem) {
    setConfirmAction({
      title: 'Удалить закладку?',
      text: `Закладка «${bookmark.title}» исчезнет из списка.`,
      confirmText: 'Удалить закладку',
      onConfirm: async () => {
        try {
          await api.delete(`/api/bookmarks/${bookmark.id}`)
          notify('success', 'Закладка удалена')
          await loadBookmarks()
        } catch (error) {
          showError(error)
        }
      },
    })
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault()
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      return
    }

    try {
      const payload = {
        title: noteForm.title.trim(),
        content: noteForm.content.trim(),
        color: noteForm.color,
        groupId: noteForm.groupId || null,
      }
      if (editingNoteId) {
        await api.patch<NoteItem>(`/api/notes/${editingNoteId}`, payload)
        notify('success', 'Заметка обновлена')
      } else {
        await api.post<NoteItem>('/api/notes', payload)
        notify('success', 'Заметка создана')
      }
      resetNoteForm()
      await loadNotes()
    } catch (error) {
      showError(error)
    }
  }

  function editNote(note: NoteItem) {
    setEditingNoteId(note.id)
    setNoteForm({ title: note.title, content: note.content, color: note.color, groupId: note.groupId ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetNoteForm() {
    setEditingNoteId(null)
    setNoteForm({ title: '', content: '', color: 'white', groupId: noteForm.groupId })
  }

  function confirmDeleteNote(note: NoteItem) {
    setConfirmAction({
      title: 'Удалить заметку?',
      text: `Заметка «${note.title}» будет удалена без возможности восстановления.`,
      confirmText: 'Удалить заметку',
      onConfirm: async () => {
        try {
          await api.delete(`/api/notes/${note.id}`)
          if (editingNoteId === note.id) {
            resetNoteForm()
          }
          notify('success', 'Заметка удалена')
          await loadNotes()
        } catch (error) {
          showError(error)
        }
      },
    })
  }

  function openFolder(folder: FolderItem) {
    setPath((items) => [...items, { id: folder.id, name: folder.name }])
  }

  function renderFileRow(file: StoredFile, depth = 0) {
    return (
      <motion.div className="table-row tree-row" key={file.id} {...rowAnimation}>
        <span className="item-type file-type">
          <File size={17} />
          Файл
        </span>
        <span className="tree-name" style={{ paddingLeft: depth * 24 }}>{file.originalName}</span>
        <span>{formatBytes(file.sizeBytes)}</span>
        <span>{formatDate(file.createdAt)}</span>
        <span className="row-actions">
          <a className="icon-action" href={`/api/files/${file.id}/download`}>
            <Download size={16} />
            Скачать
          </a>
          <button type="button" className="icon-action danger" onClick={() => confirmDeleteFile(file)}>
            <Trash2 size={16} />
            Удалить
          </button>
        </span>
      </motion.div>
    )
  }

  function renderFolderBranch(folder: FolderItem, depth = 0): ReactNode {
    const contents = expandedFolders[folder.id]
    const isExpanded = Boolean(contents)
    const isBranchLoading = Boolean(loadingFolders[folder.id])

    return (
      <div className="tree-branch" key={folder.id}>
        <motion.div className={`table-row tree-row ${isExpanded ? 'expanded' : ''}`} {...rowAnimation}>
          <span className="item-type folder-type">
            <Folder size={17} />
            Папка
          </span>
          <button
            type="button"
            className="name-button tree-name-button"
            style={{ paddingLeft: depth * 24 }}
            onClick={() => void toggleFolder(folder)}
            aria-expanded={isExpanded}
          >
            {isBranchLoading ? (
              <RefreshCw className="spin" size={17} />
            ) : isExpanded ? (
              <ChevronDown size={17} />
            ) : (
              <ChevronRight size={17} />
            )}
            {folder.name}
          </button>
          <span>-</span>
          <span>{formatDate(folder.createdAt)}</span>
          <span className="row-actions">
            <button type="button" className="icon-action" onClick={() => openFolder(folder)}>
              <FolderOpen size={16} />
              Открыть
            </button>
            <button type="button" className="icon-action" onClick={() => void renameFolder(folder)}>
              <Pencil size={16} />
              Переименовать
            </button>
            <button type="button" className="icon-action danger" onClick={() => confirmDeleteFolder(folder)}>
              <Trash2 size={16} />
              Удалить
            </button>
          </span>
        </motion.div>

        <AnimatePresence initial={false}>
          {contents && (
            <motion.div
              className="tree-children"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {contents.folders.map((child) => renderFolderBranch(child, depth + 1))}
              {contents.files.map((file) => renderFileRow(file, depth + 1))}
              {contents.folders.length === 0 && contents.files.length === 0 && (
                <div className="tree-empty" style={{ paddingLeft: (depth + 1) * 24 }}>
                  Папка пуста
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  function goToPath(index: number) {
    setPath((items) => items.slice(0, index + 1))
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingFile(true)
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (event.currentTarget === event.target) {
      setIsDraggingFile(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDraggingFile(false)
    void uploadFile(event.dataTransfer.files[0])
  }

  function notify(type: ToastType, text: string) {
    const id = Date.now()
    setToasts((items) => [...items, { id, type, text }])
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 3400)
  }

  function showError(error: unknown) {
    notify('error', error instanceof Error ? error.message : 'Неизвестная ошибка')
  }

  async function runConfirmedAction() {
    if (!confirmAction) {
      return
    }
    const action = confirmAction
    setConfirmAction(null)
    await action.onConfirm()
  }

  return (
    <main className="app-shell">
      <motion.header
        className="topbar"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <p className="eyebrow">Файловое хранилище</p>
          <h1>Хранилище файлов, закладок и заметок</h1>
        </div>
        <nav className="tabs" aria-label="Разделы">
          <button
            type="button"
            className={activeTab === 'files' ? 'active' : ''}
            onClick={() => setActiveTab('files')}
          >
            <Folder size={18} />
            Файлы
          </button>
          <button
            type="button"
            className={activeTab === 'bookmarks' ? 'active' : ''}
            onClick={() => setActiveTab('bookmarks')}
          >
            <Bookmark size={18} />
            Закладки
          </button>
          <button
            type="button"
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            <StickyNote size={18} />
            Заметки
          </button>
        </nav>
      </motion.header>

      <section className="status-grid" aria-label="Статистика">
        <StatCard icon={<Folder size={20} />} label="Папки" value={folders.length} />
        <StatCard icon={<File size={20} />} label="Файлы" value={files.length} />
        <StatCard icon={<HardDrive size={20} />} label="Размер" value={formatBytes(totalFileSize)} />
        <StatCard icon={<Bookmark size={20} />} label="Закладки" value={bookmarks.length} />
        <StatCard icon={<StickyNote size={20} />} label="Заметки" value={notes.length} />
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'files' ? (
          <motion.section
            key="files"
            className={`workspace ${isDraggingFile ? 'dragging' : ''}`}
            aria-label="Файловый менеджер"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {isDraggingFile && (
                <motion.div
                  className="drop-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Upload size={42} />
                  <strong>Отпустите файл для загрузки</strong>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="toolbar">
              <div className="breadcrumbs" aria-label="Путь">
                {path.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.id ?? 'root'}-${index}`}
                    onClick={() => goToPath(index)}
                  >
                    {index === 0 && <Home size={16} />}
                    {item.name}
                  </button>
                ))}
              </div>
              <button type="button" className="secondary-button" onClick={() => loadFilesView(currentFolderId)}>
                <RefreshCw size={16} />
                Обновить
              </button>
            </div>

            <form className="action-row" onSubmit={createFolder}>
              <input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Название папки"
              />
              <button type="submit">
                <FolderPlus size={17} />
                Создать папку
              </button>
              <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                onChange={(event) => uploadFile(event.target.files?.[0])}
              />
              <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={17} />
                Загрузить файл
              </button>
              <button type="button" className="drop-hint" onClick={() => fileInputRef.current?.click()}>
                Перетащите файл сюда
              </button>
            </form>

            <div className="table">
              <div className="table-row table-head">
                <span>Тип</span>
                <span>Название</span>
                <span>Размер</span>
                <span>Дата</span>
                <span>Действия</span>
              </div>

              {isLoading && folders.length === 0 && files.length === 0 ? (
                <SkeletonRows rows={4} />
              ) : (
                <AnimatePresence initial={false}>
                  {folders.map((folder) => renderFolderBranch(folder))}

                  {files.map((file) => renderFileRow(file))}
                </AnimatePresence>
              )}

              {!isLoading && folders.length === 0 && files.length === 0 && (
                <EmptyState icon={<Folder size={30} />} text="В этой папке пока пусто" />
              )}
            </div>
          </motion.section>
        ) : activeTab === 'bookmarks' ? (
          <motion.section
            key="bookmarks"
            className="workspace"
            aria-label="Закладки"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <div className="toolbar">
              <h2>Закладки</h2>
              <button type="button" className="secondary-button" onClick={loadBookmarks}>
                <RefreshCw size={16} />
                Обновить
              </button>
            </div>

            <div className="group-actions">
              <select value={bookmarkGroup} onChange={(event) => setBookmarkGroup(event.target.value)}>
                <option value="all">Все группы</option><option value="ungrouped">Без группы</option>
                {bookmarkGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <button type="button" className="secondary-button" onClick={() => void createGroup('BOOKMARK')}><FolderPlus size={16} />Новая группа</button>
              {bookmarkGroup !== 'all' && bookmarkGroup !== 'ungrouped' && <>
                <button type="button" className="icon-action" onClick={() => void renameGroup(bookmarkGroups.find((g) => g.id === bookmarkGroup)!)}><Pencil size={16} /></button>
                <button type="button" className="icon-action danger" onClick={() => deleteGroup(bookmarkGroups.find((g) => g.id === bookmarkGroup)!)}><Trash2 size={16} /></button>
              </>}
            </div>

            <form className="bookmark-form" onSubmit={createBookmark}>
              <input
                value={bookmarkForm.title}
                onChange={(event) => setBookmarkForm((form) => ({ ...form, title: event.target.value }))}
                placeholder="Название"
              />
              <input
                value={bookmarkForm.url}
                onChange={(event) => setBookmarkForm((form) => ({ ...form, url: event.target.value }))}
                placeholder="https://site.ru"
              />
              <input
                value={bookmarkForm.description}
                onChange={(event) => setBookmarkForm((form) => ({ ...form, description: event.target.value }))}
                placeholder="Описание"
              />
              <select value={bookmarkForm.groupId} onChange={(event) => setBookmarkForm((form) => ({ ...form, groupId: event.target.value }))}>
                <option value="">Без группы</option>{bookmarkGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <button type="submit">
                <Plus size={17} />
                Добавить
              </button>
            </form>

            <div className="bookmark-list">
              {isLoading && bookmarks.length === 0 ? (
                <BookmarkSkeletonRows rows={3} />
              ) : (
                <AnimatePresence initial={false}>
                  {filteredBookmarks.map((bookmark) => (
                    <motion.article className="bookmark-item" key={bookmark.id} {...rowAnimation}>
                      <div className="bookmark-main">
                        <span className="bookmark-icon">
                          <Link size={18} />
                        </span>
                        <div>
                          <a href={bookmark.url} target="_blank" rel="noreferrer">
                            {bookmark.title}
                            <ExternalLink size={15} />
                          </a>
                          <p>{bookmark.description || bookmark.url}</p>
                        </div>
                      </div>
                      <button type="button" className="icon-action danger" onClick={() => confirmDeleteBookmark(bookmark)}>
                        <Trash2 size={16} />
                        Удалить
                      </button>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}
              {!isLoading && filteredBookmarks.length === 0 && (
                <EmptyState icon={<Bookmark size={30} />} text="Закладок пока нет" />
              )}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="notes"
            className="workspace"
            aria-label="Заметки"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <div className="toolbar notes-toolbar">
              <h2>Заметки</h2>
              <label className="search-field">
                <Search size={17} />
                <input
                  value={noteSearch}
                  onChange={(event) => setNoteSearch(event.target.value)}
                  placeholder="Поиск по заметкам"
                />
              </label>
              <button type="button" className="secondary-button" onClick={loadNotes}>
                <RefreshCw size={16} />
                Обновить
              </button>
            </div>

            <div className="group-actions">
              <select value={noteGroup} onChange={(event) => setNoteGroup(event.target.value)}>
                <option value="all">Все группы</option><option value="ungrouped">Без группы</option>
                {noteGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <button type="button" className="secondary-button" onClick={() => void createGroup('NOTE')}><FolderPlus size={16} />Новая группа</button>
              {noteGroup !== 'all' && noteGroup !== 'ungrouped' && <>
                <button type="button" className="icon-action" onClick={() => void renameGroup(noteGroups.find((g) => g.id === noteGroup)!)}><Pencil size={16} /></button>
                <button type="button" className="icon-action danger" onClick={() => deleteGroup(noteGroups.find((g) => g.id === noteGroup)!)}><Trash2 size={16} /></button>
              </>}
            </div>

            <form className="note-form" onSubmit={saveNote}>
              <div className="note-fields">
                <input
                  value={noteForm.title}
                  onChange={(event) => setNoteForm((form) => ({ ...form, title: event.target.value }))}
                  placeholder="Заголовок заметки"
                  maxLength={255}
                />
                <textarea
                  value={noteForm.content}
                  onChange={(event) => setNoteForm((form) => ({ ...form, content: event.target.value }))}
                  placeholder="Введите текст заметки"
                  rows={4}
                />
                <select value={noteForm.groupId} onChange={(event) => setNoteForm((form) => ({ ...form, groupId: event.target.value }))}>
                  <option value="">Без группы</option>{noteGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div className="note-form-actions">
                <fieldset className="color-picker">
                  <legend>Цвет заметки</legend>
                  {NOTE_COLORS.map((color) => (
                    <label key={color.value} title={color.label}>
                      <input
                        type="radio"
                        name="note-color"
                        value={color.value}
                        checked={noteForm.color === color.value}
                        onChange={() => setNoteForm((form) => ({ ...form, color: color.value }))}
                      />
                      <span className={`color-swatch ${color.value}`} />
                    </label>
                  ))}
                </fieldset>
                <div className="note-submit-actions">
                  {editingNoteId && (
                    <button type="button" className="secondary-button" onClick={resetNoteForm}>
                      <X size={16} />
                      Отменить
                    </button>
                  )}
                  <button type="submit">
                    {editingNoteId ? <Save size={17} /> : <Plus size={17} />}
                    {editingNoteId ? 'Сохранить' : 'Создать заметку'}
                  </button>
                </div>
              </div>
            </form>

            <div className="notes-grid">
              {isLoading && notes.length === 0 ? (
                <NoteSkeletonCards cards={4} />
              ) : (
                <AnimatePresence initial={false}>
                  {filteredNotes.map((note) => (
                    <motion.article className={`note-card ${note.color}`} key={note.id} {...rowAnimation}>
                      <div className="note-card-header">
                        <span className="note-card-icon"><StickyNote size={18} /></span>
                        <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
                      </div>
                      <h3>{note.title}</h3>
                      <p>{note.content}</p>
                      <div className="note-card-actions">
                        <button type="button" className="icon-action" onClick={() => editNote(note)}>
                          <Pencil size={16} />
                          Изменить
                        </button>
                        <button type="button" className="icon-action danger" onClick={() => confirmDeleteNote(note)}>
                          <Trash2 size={16} />
                          Удалить
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}
              {!isLoading && notes.length === 0 && (
                <EmptyState icon={<StickyNote size={30} />} text="Заметок пока нет" />
              )}
              {!isLoading && notes.length > 0 && filteredNotes.length === 0 && (
                <EmptyState icon={<Search size={30} />} text="По вашему запросу ничего не найдено" />
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />

      <AnimatePresence>
        {confirmAction && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="confirm-modal"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <span className="confirm-icon">
                <AlertTriangle size={24} />
              </span>
              <h2>{confirmAction.title}</h2>
              <p>{confirmAction.text}</p>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setConfirmAction(null)}>
                  Отмена
                </button>
                <button type="button" className="danger-button" onClick={() => void runConfirmedAction()}>
                  <Trash2 size={16} />
                  {confirmAction.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

const rowAnimation = {
  initial: { opacity: 0, y: 8, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
  transition: { duration: 0.18 },
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22 }}
    >
      <span className="stat-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  )
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <span>{icon}</span>
      {text}
    </motion.div>
  )
}

function SkeletonRows({ rows }: { rows: number }) {
  return Array.from({ length: rows }, (_, index) => (
    <div className="table-row skeleton-row" key={index}>
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  ))
}

function BookmarkSkeletonRows({ rows }: { rows: number }) {
  return Array.from({ length: rows }, (_, index) => (
    <div className="bookmark-item skeleton-bookmark" key={index}>
      <div className="bookmark-main">
        <span className="bookmark-icon" />
        <div>
          <span />
          <p />
        </div>
      </div>
      <span />
    </div>
  ))
}

function NoteSkeletonCards({ cards }: { cards: number }) {
  return Array.from({ length: cards }, (_, index) => (
    <div className="note-card note-skeleton" key={index}>
      <span />
      <strong />
      <p />
      <p />
    </div>
  ))
}

function ToastStack({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            className={`toast ${toast.type}`}
            key={toast.id}
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
            <span>{toast.text}</span>
            <button type="button" onClick={() => onClose(toast.id)} aria-label="Закрыть уведомление">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 Б'
  }
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default App
