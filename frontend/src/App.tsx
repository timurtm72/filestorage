import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
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
  MoreVertical,
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
type StorageModal = { parentId: string | null; parentName: string; folder?: FolderItem; folderOnly?: boolean }
type GroupModal = { type: 'BOOKMARK' | 'NOTE'; group?: ContentGroup }

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
  const [expandedBookmarkGroups, setExpandedBookmarkGroups] = useState<Record<string, boolean>>({})
  const [expandedNoteGroups, setExpandedNoteGroups] = useState<Record<string, boolean>>({})
  const [path, setPath] = useState<FolderPathItem[]>([{ id: null, name: 'Главная' }])
  const [folderName, setFolderName] = useState('')
  const [storageModal, setStorageModal] = useState<StorageModal | null>(null)
  const [storageAction, setStorageAction] = useState<'folder' | 'file'>('folder')
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null)
  const [groupModal, setGroupModal] = useState<GroupModal | null>(null)
  const [groupName, setGroupName] = useState('')
  const [bookmarkForm, setBookmarkForm] = useState({ title: '', url: '', description: '', groupId: '' })
  const [noteForm, setNoteForm] = useState<{ title: string; content: string; color: NoteColor; groupId: string }>({
    title: '',
    content: '',
    color: 'white', groupId: '',
  })
  const [contentModal, setContentModal] = useState<'BOOKMARK' | 'NOTE' | null>(null)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
    if (!query) return notes
    return notes.filter((note) =>
      `${note.title} ${note.content}`.toLocaleLowerCase('ru-RU').includes(query),
    )
  }, [noteSearch, notes])

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

  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenu])

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
      setBookmarks(items.filter((item) => item.groupId)); setBookmarkGroups(groups)
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
      setNotes(items.filter((item) => item.groupId)); setNoteGroups(groups)
    } catch (error) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  function openStorageModal(parentId: string | null, parentName: string, folderOnly = false, action: 'folder' | 'file' = 'folder') {
    setFolderName('')
    setUploadFile(null)
    setStorageAction(action)
    setStorageModal({ parentId, parentName, folderOnly })
  }

  function openRenameFolder(folder: FolderItem) {
    setFolderName(folder.name)
    setStorageAction('folder')
    setStorageModal({ parentId: folder.parentId, parentName: folder.name, folder })
  }

  async function refreshStorage(parentId: string | null) {
    if (parentId === currentFolderId || !parentId) {
      await loadFilesView(currentFolderId)
      return
    }
    const contents = await getFolderContents(parentId)
    setExpandedFolders((items) => ({ ...items, [parentId]: contents }))
  }

  async function saveStorage(event: FormEvent) {
    event.preventDefault()
    if (!storageModal) return

    try {
      if (storageModal.folder) {
        if (!folderName.trim()) return
        await api.patch<FolderItem>(`/api/folders/${storageModal.folder.id}`, { name: folderName.trim() })
        setPath((items) => items.map((item) => item.id === storageModal.folder?.id ? { ...item, name: folderName.trim() } : item))
        notify('success', 'Папка переименована')
      } else if (storageAction === 'folder') {
        if (!folderName.trim()) return
        await api.post<FolderItem>('/api/folders', { parentId: storageModal.parentId, name: folderName.trim() })
        notify('success', 'Папка создана')
      } else {
        const file = uploadFile
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        const suffix = storageModal.parentId ? `?${new URLSearchParams({ folderId: storageModal.parentId })}` : ''
        const response = await fetch(`/api/files/upload${suffix}`, { method: 'POST', body: formData })
        await parseResponse<StoredFile>(response)
        notify('success', `Файл «${file.name}» загружен`)
      }
      setStorageModal(null)
      await refreshStorage(storageModal.parentId)
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

  function openGroupModal(type: 'BOOKMARK' | 'NOTE', group?: ContentGroup) {
    setGroupName(group?.name ?? '')
    setGroupModal({ type, group })
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault()
    if (!groupModal || !groupName.trim()) return
    try {
      if (groupModal.group) {
        await api.patch<ContentGroup>(`/api/groups/${groupModal.group.id}`, { type: groupModal.type, name: groupName.trim() })
        notify('success', 'Группа переименована')
      } else {
        await api.post<ContentGroup>('/api/groups', { type: groupModal.type, name: groupName.trim() })
        notify('success', 'Группа создана')
      }
      const type = groupModal.type
      setGroupModal(null)
      await (type === 'BOOKMARK' ? loadBookmarks() : loadNotes())
    } catch (error) { showError(error) }
  }

  function deleteGroup(group: ContentGroup) {
    setConfirmAction({ title: 'Удалить группу?', text: `Группа «${group.name}» должна быть пустой.`, confirmText: 'Удалить группу', onConfirm: async () => {
      try {
        await api.delete(`/api/groups/${group.id}`)
        notify('success', 'Группа удалена')
        await (group.type === 'BOOKMARK' ? loadBookmarks() : loadNotes())
      } catch (error) { showError(error) }
    }})
  }

  function toggleGroup(type: 'BOOKMARK' | 'NOTE', id: string) {
    const setExpanded = type === 'BOOKMARK' ? setExpandedBookmarkGroups : setExpandedNoteGroups
    setExpanded((groups) => ({ ...groups, [id]: !(groups[id] ?? true) }))
  }

  function openCreateModal(type: 'BOOKMARK' | 'NOTE', groupId: string) {
    if (type === 'BOOKMARK') {
      setEditingBookmarkId(null)
      setBookmarkForm({ title: '', url: '', description: '', groupId })
      setExpandedBookmarkGroups((groups) => ({ ...groups, [groupId]: true }))
    } else {
      setEditingNoteId(null)
      setNoteForm({ title: '', content: '', color: 'white', groupId })
      setExpandedNoteGroups((groups) => ({ ...groups, [groupId]: true }))
    }
    setContentModal(type)
  }

  function closeContentModal() {
    setContentModal(null)
    setEditingBookmarkId(null)
    setEditingNoteId(null)
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
    if (!bookmarkForm.title.trim() || !bookmarkForm.url.trim() || !bookmarkForm.groupId) {
      return
    }

    try {
      const payload = {
        title: bookmarkForm.title.trim(),
        url: bookmarkForm.url.trim(),
        description: bookmarkForm.description.trim(),
        groupId: bookmarkForm.groupId || null,
      }
      if (editingBookmarkId) {
        await api.patch<BookmarkItem>(`/api/bookmarks/${editingBookmarkId}`, payload)
        notify('success', 'Закладка обновлена')
      } else {
        await api.post<BookmarkItem>('/api/bookmarks', payload)
        notify('success', 'Закладка сохранена')
      }
      closeContentModal()
      await loadBookmarks()
    } catch (error) {
      showError(error)
    }
  }

  function editBookmark(bookmark: BookmarkItem) {
    setEditingBookmarkId(bookmark.id)
    setBookmarkForm({ title: bookmark.title, url: bookmark.url, description: bookmark.description ?? '', groupId: bookmark.groupId ?? '' })
    setContentModal('BOOKMARK')
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
    if (!noteForm.title.trim() || !noteForm.content.trim() || !noteForm.groupId) {
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
      closeContentModal()
      await loadNotes()
    } catch (error) {
      showError(error)
    }
  }

  function editNote(note: NoteItem) {
    setEditingNoteId(note.id)
    setNoteForm({ title: note.title, content: note.content, color: note.color, groupId: note.groupId ?? '' })
    setContentModal('NOTE')
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
            closeContentModal()
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
        <div className="row-actions">
          <ActionMenu id={`file-${file.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
            <a href={`/api/files/${file.id}/download`}><Download size={16} />Скачать</a>
            <button type="button" className="danger" onClick={() => confirmDeleteFile(file)}><Trash2 size={16} />Удалить</button>
          </ActionMenu>
        </div>
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
          <div className="row-actions">
            <ActionMenu id={`folder-${folder.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
              <button type="button" onClick={() => openStorageModal(folder.id, folder.name, false, 'file')}><Upload size={16} />Загрузить файл</button>
              <button type="button" onClick={() => openStorageModal(folder.id, folder.name, false, 'folder')}><FolderPlus size={16} />Создать папку</button>
              <button type="button" onClick={() => openFolder(folder)}><FolderOpen size={16} />Открыть</button>
              <button type="button" onClick={() => openRenameFolder(folder)}><Pencil size={16} />Переименовать</button>
              <button type="button" className="danger" onClick={() => confirmDeleteFolder(folder)}><Trash2 size={16} />Удалить</button>
            </ActionMenu>
          </div>
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
          <h1>{activeTab === 'files' ? 'Файлы' : activeTab === 'bookmarks' ? 'Закладки' : 'Заметки'}</h1>
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
            className="workspace"
            aria-label="Файловый менеджер"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
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
              <div className="toolbar-actions">
                <button type="button" onClick={() => openStorageModal(currentFolderId, currentFolder.name, true)}><FolderPlus size={16} />Новая папка</button>
                <button type="button" className="secondary-button" onClick={() => loadFilesView(currentFolderId)}><RefreshCw size={16} />Обновить</button>
              </div>
            </div>

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
              <button type="button" className="secondary-button" onClick={() => openGroupModal('BOOKMARK')}><FolderPlus size={16} />Новая группа</button>
            </div>

            <div className="content-groups">
              {isLoading && bookmarks.length === 0 ? (
                <BookmarkSkeletonRows rows={3} />
              ) : (
                bookmarkGroups.map((group) => {
                  const { id, name } = group
                  const items = bookmarks.filter((bookmark) => bookmark.groupId === group.id)
                  const expanded = expandedBookmarkGroups[id] ?? true
                  return (
                    <section className="content-group" key={id}>
                      <div className="content-group-header">
                        <button type="button" className="content-group-toggle" onClick={() => toggleGroup('BOOKMARK', id)} aria-expanded={expanded}>
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span>{name}</span><small>{items.length}</small>
                        </button>
                        <ActionMenu id={`bookmark-group-${group.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
                          <button type="button" onClick={() => openCreateModal('BOOKMARK', group.id)}><Plus size={16} />Добавить закладку</button>
                          <button type="button" onClick={() => openGroupModal('BOOKMARK', group)}><Pencil size={16} />Переименовать</button>
                          <button type="button" className="danger" onClick={() => deleteGroup(group)}><Trash2 size={16} />Удалить</button>
                        </ActionMenu>
                      </div>
                      <AnimatePresence initial={false}>
                        {expanded && <motion.div className="bookmark-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          {items.map((bookmark) => (
                            <motion.article className="bookmark-item" key={bookmark.id} {...rowAnimation}>
                              <div className="bookmark-main">
                                <span className="bookmark-icon"><Link size={18} /></span>
                                <div>
                                  <a href={bookmark.url} target="_blank" rel="noreferrer">{bookmark.title}<ExternalLink size={15} /></a>
                                  <p>{bookmark.description || bookmark.url}</p>
                                </div>
                              </div>
                              <ActionMenu id={`bookmark-${bookmark.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
                                <button type="button" onClick={() => editBookmark(bookmark)}><Pencil size={16} />Изменить</button>
                                <button type="button" className="danger" onClick={() => confirmDeleteBookmark(bookmark)}><Trash2 size={16} />Удалить</button>
                              </ActionMenu>
                            </motion.article>
                          ))}
                          {items.length === 0 && <div className="group-empty">В группе пока нет закладок</div>}
                        </motion.div>}
                      </AnimatePresence>
                    </section>
                  )
                })
              )}
              {!isLoading && bookmarkGroups.length === 0 && <EmptyState icon={<Bookmark size={30} />} text="Групп пока нет" />}
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
              <button type="button" className="secondary-button" onClick={() => openGroupModal('NOTE')}><FolderPlus size={16} />Новая группа</button>
            </div>

            <div className="content-groups">
              {isLoading && notes.length === 0 ? (
                <NoteSkeletonCards cards={4} />
              ) : (
                noteGroups.map((group) => {
                  const { id, name } = group
                  const items = filteredNotes.filter((note) => note.groupId === group.id)
                  const expanded = expandedNoteGroups[id] ?? true
                  return (
                    <section className="content-group" key={id}>
                      <div className="content-group-header">
                        <button type="button" className="content-group-toggle" onClick={() => toggleGroup('NOTE', id)} aria-expanded={expanded}>
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span>{name}</span><small>{items.length}</small>
                        </button>
                        <ActionMenu id={`note-group-${group.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
                          <button type="button" onClick={() => openCreateModal('NOTE', group.id)}><Plus size={16} />Добавить заметку</button>
                          <button type="button" onClick={() => openGroupModal('NOTE', group)}><Pencil size={16} />Переименовать</button>
                          <button type="button" className="danger" onClick={() => deleteGroup(group)}><Trash2 size={16} />Удалить</button>
                        </ActionMenu>
                      </div>
                      <AnimatePresence initial={false}>
                        {expanded && <motion.div className="notes-grid" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          {items.map((note) => (
                            <motion.article className={`note-card ${note.color}`} key={note.id} {...rowAnimation}>
                              <div className="note-card-header">
                                <span className="note-card-icon"><StickyNote size={18} /></span>
                                <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
                              </div>
                              <h3>{note.title}</h3><p>{note.content}</p>
                              <div className="note-card-actions">
                                <ActionMenu id={`note-${note.id}`} openMenu={openMenu} setOpenMenu={setOpenMenu}>
                                  <button type="button" onClick={() => editNote(note)}><Pencil size={16} />Изменить</button>
                                  <button type="button" className="danger" onClick={() => confirmDeleteNote(note)}><Trash2 size={16} />Удалить</button>
                                </ActionMenu>
                              </div>
                            </motion.article>
                          ))}
                          {items.length === 0 && <div className="group-empty">{noteSearch ? 'Совпадений в группе нет' : 'В группе пока нет заметок'}</div>}
                        </motion.div>}
                      </AnimatePresence>
                    </section>
                  )
                })
              )}
              {!isLoading && noteGroups.length === 0 && <EmptyState icon={<StickyNote size={30} />} text="Групп пока нет" />}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />

      <AnimatePresence>
        {groupModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGroupModal(null)}>
            <motion.form
              className="content-modal group-modal"
              onSubmit={saveGroup}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <div className="content-modal-header">
                <h2>{groupModal.group ? 'Переименовать группу' : 'Новая группа'}</h2>
                <button type="button" className="icon-action" onClick={() => setGroupModal(null)}><X size={18} /></button>
              </div>
              <div className="modal-fields">
                <input required autoFocus maxLength={255} value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Название группы" />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setGroupModal(null)}>Отмена</button>
                <button type="submit"><Save size={16} />{groupModal.group ? 'Сохранить' : 'Создать'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {storageModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStorageModal(null)}>
            <motion.form
              className="content-modal"
              onSubmit={saveStorage}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <div className="content-modal-header">
                <h2>{storageModal.folder
                  ? 'Переименовать папку'
                  : storageAction === 'file'
                    ? `Загрузить файл в «${storageModal.parentName}»`
                    : storageModal.folderOnly ? 'Новая папка' : `Новая папка в «${storageModal.parentName}»`}</h2>
                <button type="button" className="icon-action" onClick={() => setStorageModal(null)}><X size={18} /></button>
              </div>

              <div className="modal-fields">
                {storageModal.folder || storageAction === 'folder' ? (
                  <input required maxLength={255} autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Название папки" />
                ) : (
                  <div
                    className={`upload-dropzone ${uploadFile ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      setUploadFile(event.dataTransfer.files[0] ?? null)
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      className="upload-file-input"
                      type="file"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    />
                    <span className="upload-dropzone-icon"><Upload size={28} /></span>
                    <strong>{uploadFile?.name ?? 'Перетащите файл сюда'}</strong>
                    <span>{uploadFile ? formatBytes(uploadFile.size) : 'или нажмите, чтобы выбрать'}</span>
                    <span className="upload-file-button">Выбрать файл</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setStorageModal(null)}>Отмена</button>
                <button type="submit" disabled={storageAction === 'file' && !uploadFile}>
                  {storageAction === 'file' ? <Upload size={16} /> : storageModal.folder ? <Save size={16} /> : <FolderPlus size={16} />}
                  {storageModal.folder ? 'Сохранить' : storageAction === 'folder' ? 'Создать папку' : 'Загрузить файл'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contentModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeContentModal}>
            <motion.form
              className="content-modal"
              onSubmit={contentModal === 'BOOKMARK' ? createBookmark : saveNote}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <div className="content-modal-header">
                <h2>{contentModal === 'BOOKMARK'
                  ? editingBookmarkId ? 'Редактировать закладку' : 'Новая закладка'
                  : editingNoteId ? 'Редактировать заметку' : 'Новая заметка'}</h2>
                <button type="button" className="icon-action" onClick={closeContentModal}><X size={18} /></button>
              </div>
              <p className="modal-group-label">Группа: <strong>{contentModal === 'BOOKMARK'
                ? bookmarkGroups.find((group) => group.id === bookmarkForm.groupId)?.name
                : noteGroups.find((group) => group.id === noteForm.groupId)?.name}</strong></p>

              {contentModal === 'BOOKMARK' ? <div className="modal-fields">
                <input required maxLength={255} value={bookmarkForm.title} onChange={(event) => setBookmarkForm((form) => ({ ...form, title: event.target.value }))} placeholder="Название" />
                <input required value={bookmarkForm.url} onChange={(event) => setBookmarkForm((form) => ({ ...form, url: event.target.value }))} placeholder="https://site.ru" />
                <textarea rows={3} value={bookmarkForm.description} onChange={(event) => setBookmarkForm((form) => ({ ...form, description: event.target.value }))} placeholder="Описание" />
                {editingBookmarkId && <select value={bookmarkForm.groupId} onChange={(event) => setBookmarkForm((form) => ({ ...form, groupId: event.target.value }))}>
                  {bookmarkGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>}
              </div> : <div className="modal-fields">
                <input required maxLength={255} value={noteForm.title} onChange={(event) => setNoteForm((form) => ({ ...form, title: event.target.value }))} placeholder="Заголовок заметки" />
                <textarea required rows={6} value={noteForm.content} onChange={(event) => setNoteForm((form) => ({ ...form, content: event.target.value }))} placeholder="Текст заметки" />
                {editingNoteId && <select value={noteForm.groupId} onChange={(event) => setNoteForm((form) => ({ ...form, groupId: event.target.value }))}>
                  {noteGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>}
                <fieldset className="color-picker">
                  <legend>Цвет заметки</legend>
                  {NOTE_COLORS.map((color) => <label key={color.value} title={color.label}>
                    <input type="radio" name="note-color" value={color.value} checked={noteForm.color === color.value} onChange={() => setNoteForm((form) => ({ ...form, color: color.value }))} />
                    <span className={`color-swatch ${color.value}`} />
                  </label>)}
                </fieldset>
              </div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeContentModal}>Отмена</button>
                <button type="submit"><Save size={16} />{editingBookmarkId || editingNoteId ? 'Сохранить' : 'Добавить'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

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

function ActionMenu({ id, openMenu, setOpenMenu, children }: {
  id: string
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  children: ReactNode
}) {
  const open = openMenu === id
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger || !menu) return
      const rect = trigger.getBoundingClientRect()
      const width = menu.offsetWidth
      const height = menu.offsetHeight
      const below = rect.bottom + 6
      const above = rect.top - height - 6
      const top = below + height <= window.innerHeight - 8 || above < 8
        ? Math.min(below, window.innerHeight - height - 8)
        : above
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      setPosition({ top: Math.max(8, top), left })
    }

    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="action-menu-trigger"
        aria-label="Действия"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpenMenu(open ? null : id)
        }}
      >
        <MoreVertical size={19} />
      </button>
      {createPortal(<AnimatePresence>
        {open && <motion.div
          ref={menuRef}
          className="action-menu-popover"
          style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
        >
          {children}
        </motion.div>}
      </AnimatePresence>, document.body)}
    </div>
  )
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
