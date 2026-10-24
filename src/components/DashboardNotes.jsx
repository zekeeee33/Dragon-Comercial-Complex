import { useState } from 'react';
import { MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { deleteRecord, saveRecord } from '../lib/coreData';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200';

function noteDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function DashboardNotes({ notes, profile, loading, error, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  function startCreate() {
    setEditing({ id: null, author_name: profile?.full_name || profile?.email || 'Team member' });
    setTitle('');
    setContent('');
    setActionError('');
  }

  function startEdit(note) {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setActionError('');
  }

  async function save(event) {
    event.preventDefault();
    setActionError('');
    setBusy(true);
    try {
      const author = editing.id
        ? editing.author_name
        : profile?.full_name || profile?.email || 'Team member';
      await saveRecord('dashboard_notes', {
        ...(editing.id ? { id: editing.id } : {}),
        title: title.trim(),
        content: content.trim(),
        author_name: author,
        ...(editing.id ? {} : { created_by: profile?.id }),
      });
      setEditing(null);
      await onRefresh();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Unable to save this note.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(note) {
    if (!window.confirm(`Delete the note “${note.title}”? This cannot be undone.`)) return;
    setActionError('');
    try {
      await deleteRecord('dashboard_notes', note.id);
      await onRefresh();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this note.');
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-slate-600" /><h2 className="text-lg font-semibold text-slate-900">Shared dashboard notes</h2></div>
          <p className="mt-1 text-sm text-slate-600">Notes are visible to every signed-in team member. All team members can add, edit, or delete notes.</p>
        </div>
        {!editing ? <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add note</button> : null}
      </div>

      {error ? <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {actionError ? <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p> : null}

      {editing ? (
        <form onSubmit={save} className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-medium text-slate-700">Title<input required maxLength={160} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-medium text-slate-700">Note<textarea required maxLength={10000} rows={4} value={content} onChange={(event) => setContent(event.target.value)} className={`${inputClass} mt-1`} /></label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(null); setActionError(''); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"><X className="h-4 w-4" />Cancel</button>
            <button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save note'}</button>
          </div>
        </form>
      ) : null}

      {loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading shared notes…</p> : null}
      <div className="space-y-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-900">{note.title}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{note.content}</p>
                <p className="mt-3 text-xs text-slate-500">By {note.author_name} · Updated {noteDate(note.updated_at || note.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Edit note ${note.title}`} onClick={() => startEdit(note)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={`Delete note ${note.title}`} onClick={() => remove(note)} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!loading && !notes.length ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No shared notes yet. Add the first dashboard note.</p> : null}
    </section>
  );
}
