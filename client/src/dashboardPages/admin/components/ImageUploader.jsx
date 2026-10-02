// client/src/dashboardPages/admin/components/ImageUploader.jsx
import { ImagePlus, Link2, Loader2, Star, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import { uploadImageFromUrl, uploadProductImages } from '../products.api.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** "data:image/png;base64,…" (what Google Images often copies) → a File we can upload normally */
function dataUrlToFile(dataUrl) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m || !TYPES.includes(m[1].toLowerCase())) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new File([bytes], `pasted.${m[1].split('/')[1]}`, { type: m[1].toLowerCase() });
}

/**
 * Product images, stored on Cloudflare R2; value = array of public URLs (first one = main picture).
 * Add: pick files, or paste an image link ("From URL").
 * On each image (hover): Upload = replace from computer · Link = replace from a URL · ★ = make main · ✕ = remove.
 */
export default function ImageUploader({ value = [], onChange, max = 6 }) {
  const [busy, setBusy] = useState(null); // null | 'add' | index being replaced
  const [showUrl, setShowUrl] = useState(false);
  const [replaceAt, setReplaceAt] = useState(null); // index replaced by the link box / file picker, null = add new
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const addInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceFileIndex = useRef(null); // which image the file picker replaces (ref: survives a cancelled picker without leaving a highlight)
  const full = value.length >= max;
  const uploading = busy !== null;

  /** Puts a new URL either at `index` (replace) or at the end (add) */
  const place = (url, index) => onChange(index === null ? [...value, url] : value.map((u, i) => (i === index ? url : u)));

  const onAddFiles = async (e) => {
    const files = [...e.target.files].slice(0, max - value.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy('add');
    try {
      const res = await uploadProductImages(files);
      onChange([...value, ...res.data.map((f) => f.url)]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const startReplaceFile = (i) => { closeLinkBox(); replaceFileIndex.current = i; replaceInputRef.current?.click(); };
  const onReplaceFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    const index = replaceFileIndex.current;
    if (!file || index === null) return;
    setBusy(index);
    try {
      const res = await uploadProductImages([file]);
      place(res.data[0].url, index);
      toast.success(`Image ${index + 1} replaced`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
      replaceFileIndex.current = null;
    }
  };

  const openLinkBox = (index) => {
    setReplaceAt(index);
    setShowUrl(true);
    setLink('');
    setLinkError('');
  };
  function closeLinkBox() { setShowUrl(false); setReplaceAt(null); setLinkError(''); }

  const saveLink = async () => {
    const url = link.trim();
    setLinkError('');
    if (!url) return setLinkError('Paste an image link first');
    const index = replaceAt;
    setBusy(index === null ? 'add' : index);
    try {
      let saved;
      if (url.startsWith('data:')) {
        const file = dataUrlToFile(url);
        if (!file) throw new Error('That pasted image is not a JPG, PNG, WEBP or AVIF picture');
        if (file.size > 5 * 1024 * 1024) throw new Error('That image is larger than 5 MB');
        saved = (await uploadProductImages([file])).data[0];
      } else {
        if (!/^https?:\/\//i.test(url)) throw new Error('The link must start with https:// (or http://)');
        saved = (await uploadImageFromUrl(url)).data;
      }
      place(saved.url, index);
      toast.success(index === null ? 'Image added' : `Image ${index + 1} replaced`);
      setLink('');
      closeLinkBox();
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const makeMain = (i) => onChange([value[i], ...value.filter((_, j) => j !== i)]);

  // Not a <form>: this lives inside the product <form>, and nested forms aren't allowed
  const onLinkKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveLink(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeLinkBox(); }
  };

  const tile = 'flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs transition disabled:opacity-60';
  const iconBtn = 'rounded-full bg-white/95 p-1 text-slate-700 shadow hover:text-brand-600 disabled:opacity-50';

  return (
    <div>
      <p className="label">Images <span className="font-normal text-slate-400">({value.length}/{max})</span></p>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className={`group relative h-20 w-20 overflow-hidden rounded-lg border ${replaceAt === i ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'}`}>
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-slate-900/60 py-0.5 text-center text-[10px] text-white">Main</span>}

            {busy === i ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
            ) : (
              <>
                <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} disabled={uploading}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-600 opacity-0 shadow hover:text-red-600 group-hover:opacity-100 focus:opacity-100" aria-label={`Remove image ${i + 1}`} title="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Replace / make main — shown on hover (or keyboard focus) */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-slate-900/60 to-transparent pb-1 pt-3 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                  <button type="button" onClick={() => startReplaceFile(i)} disabled={uploading} className={iconBtn} title="Replace — upload from computer" aria-label={`Replace image ${i + 1} by uploading`}>
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => openLinkBox(i)} disabled={uploading} className={iconBtn} title="Replace — from image link" aria-label={`Replace image ${i + 1} from a link`}>
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  {i > 0 && (
                    <button type="button" onClick={() => makeMain(i)} disabled={uploading} className={iconBtn} title="Make main picture" aria-label={`Make image ${i + 1} the main picture`}>
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {!full && (
          <>
            <button type="button" onClick={() => { closeLinkBox(); addInputRef.current?.click(); }} disabled={uploading}
              className={`${tile} border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600`}>
              {busy === 'add' && !showUrl ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="h-5 w-5" /> Add</>}
            </button>
            <button type="button" onClick={() => (showUrl && replaceAt === null ? closeLinkBox() : openLinkBox(null))} disabled={uploading}
              className={`${tile} ${showUrl && replaceAt === null ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600'}`}>
              <Link2 className="h-5 w-5" /> From URL
            </button>
          </>
        )}
      </div>

      {showUrl && (replaceAt !== null || !full) && (
        <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
          <label htmlFor="image-url" className="label">
            {replaceAt === null ? 'Image link' : `Replace image ${replaceAt + 1}${replaceAt === 0 ? ' (main)' : ''} with a link`}
          </label>
          <div className="flex gap-2">
            <input
              id="image-url"
              type="url"
              value={link}
              onChange={(e) => { setLink(e.target.value); setLinkError(''); }}
              onKeyDown={onLinkKey}
              placeholder="https://example.com/brake-pad.jpg"
              className={`field text-slate-900 ${linkError ? 'border-red-400' : ''}`}
              autoFocus
              disabled={uploading}
            />
            <Button type="button" size="sm" loading={uploading} onClick={saveLink} className="shrink-0">{replaceAt === null ? 'Add image' : 'Replace'}</Button>
            <Button type="button" size="sm" variant="secondary" onClick={closeLinkBox} disabled={uploading} className="shrink-0">Cancel</Button>
          </div>
          {linkError
            ? <p className="mt-1 text-xs text-red-600">{linkError}</p>
            : <p className="mt-1 text-xs text-slate-500">Right-click a picture on any website → <b>Copy image address</b>, then paste it here. A copy is saved to your storage.</p>}
        </div>
      )}

      <input ref={addInputRef} type="file" accept={TYPES.join(',')} multiple hidden onChange={onAddFiles} />
      <input ref={replaceInputRef} type="file" accept={TYPES.join(',')} hidden onChange={onReplaceFile} />
      <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP · max 5 MB each · stored on Cloudflare R2 · hover an image to replace it or make it the main picture</p>
    </div>
  );
}