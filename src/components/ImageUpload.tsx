import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder?: string;         // pasta dentro do bucket (ex: "restaurantes", "cardapio")
  aspectRatio?: string;    // ex: "aspect-video" ou "aspect-square"
}

export function ImageUpload({ currentUrl, onUpload, onRemove, folder = 'geral', aspectRatio = 'aspect-video' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida (JPG, PNG, WEBP)'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB'); return; }

    setError('');
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(fileName, file, { upsert: false });

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
        <div className={`relative w-full ${aspectRatio} rounded-xl overflow-hidden bg-gray-100`}>
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspectRatio} rounded-xl border-2 border-dashed border-gray-200 hover:border-[#6BA534] hover:bg-[#f9fdf6] transition-all flex flex-col items-center justify-center gap-2 text-[#aaa] hover:text-[#6BA534] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading
            ? <><Loader2 size={24} className="animate-spin" /><span className="text-sm">Enviando...</span></>
            : <><ImagePlus size={24} /><span className="text-sm font-medium">Clique para adicionar foto</span><span className="text-xs">JPG, PNG ou WEBP · máx. 5MB</span></>
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
