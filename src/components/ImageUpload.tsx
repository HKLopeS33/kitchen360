import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/** Reduz a foto no próprio aparelho (máx. 1200px, WebP): carrega muito mais rápido no app. */
async function compressImage(file: File, maxSide = 1200, quality = 0.82): Promise<Blob> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', quality));
    // Usa a versão menor só se realmente ficou menor (e o navegador gerou WebP).
    return blob && blob.type === 'image/webp' && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

interface ImageUploadProps {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder?: string;         // pasta dentro do bucket (ex: "restaurantes", "cardapio")
  aspectRatio?: string;    // mantido por compatibilidade (não usado no novo layout compacto)
}

export function ImageUpload({ currentUrl, onUpload, onRemove, folder = 'geral' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida (JPG, PNG, WEBP)'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Imagem deve ter no máximo 15MB'); return; }

    setError('');
    setUploading(true);

    try {
      const body = await compressImage(file);
      const ext = body.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'jpg');
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(fileName, body, { upsert: false, contentType: body.type || file.type, cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('imagens').getPublicUrl(fileName);
      onUpload(data.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      // Limpa o input para permitir re-upload do mesmo arquivo
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-[#333] mb-1.5">Foto</label>

      {currentUrl ? (
        <div className="flex items-center gap-3">
          <div className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100`}>
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#6BA534] hover:text-[#2D5016] border border-gray-200 hover:border-[#6BA534] rounded-xl px-3 py-2 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            {uploading ? 'Enviando...' : 'Trocar foto'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-sm font-semibold text-[#6BA534] hover:text-[#2D5016] border border-dashed border-gray-300 hover:border-[#6BA534] hover:bg-[#f9fdf6] rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading
            ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
            : <><ImagePlus size={15} /> Adicionar foto <span className="text-xs font-normal text-[#aaa]">· JPG, PNG ou WEBP, máx. 5MB</span></>
          }
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
