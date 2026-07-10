'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { uploadFiles } from '@/lib/uploadthing';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const TEST_EMAILS = [
  'raghavsobti37@gmail.com',
  'raghavishaan@gmail.com',
  'Harshika@theshakticollective.in',
];

const ASPECTS = [
  { label: 'Wide', value: '3:1', ratio: 3 },
  { label: 'Classic', value: '2:1', ratio: 2 },
  { label: 'Square', value: '1:1', ratio: 1 },
  { label: 'Tall', value: '4:5', ratio: 0.8 },
];

type BannerAsset = {
  filename: string;
  contentType: string;
  storageKey?: string;
  storageUrl: string;
  role: 'banner';
  aspectRatio: string;
};

function splitRecipients(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

function bannerHtml(asset: BannerAsset | null) {
  if (!asset?.storageUrl) return '';
  return `<div style="margin:0 0 20px 0;"><img src="${asset.storageUrl}" alt="" style="width:100%;max-width:640px;height:auto;display:block;border:0;" /></div>`;
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function cropBannerFile(file: File, ratio: number, zoom: number) {
  const image = await loadImage(file);
  const width = 1280;
  const height = Math.round(width / ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare banner crop');

  const sourceRatio = image.width / image.height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  if (sourceRatio > ratio) {
    sourceHeight = image.height / zoom;
    sourceWidth = sourceHeight * ratio;
  } else {
    sourceWidth = image.width / zoom;
    sourceHeight = sourceWidth / ratio;
  }

  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error('Could not export banner crop'));
    }, 'image/jpeg', 0.88);
  });

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-banner.jpg', { type: 'image/jpeg' });
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('<p>Hi {{name}},</p><p></p>');
  const [format, setFormat] = useState<'visual' | 'rawHtml'>('rawHtml');
  const [templateId, setTemplateId] = useState('');
  const [customRecipients, setCustomRecipients] = useState(TEST_EMAILS.join('\n'));
  const [senderId, setSenderId] = useState('');
  const [senderMode, setSenderMode] = useState<'single' | 'pool'>('single');
  const [includeSignature, setIncludeSignature] = useState(false);
  const [signature, setSignature] = useState('');
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);
  const [action, setAction] = useState<'draft' | 'dispatch'>('draft');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [bannerAsset, setBannerAsset] = useState<BannerAsset | null>(null);
  const [aspect, setAspect] = useState(ASPECTS[0]);
  const [zoom, setZoom] = useState(1);
  const [previewHtml, setPreviewHtml] = useState('');

  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: () => live.templates.list() });
  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => live.senders.list() });
  const approvedTemplates = (templates || []).filter((template: any) => template.status === 'approved');
  const recipients = useMemo(() => splitRecipients(customRecipients), [customRecipients]);
  const selectedSender = senders?.find((sender: any) => sender._id === senderId);

  const finalContent = `${bannerHtml(bannerAsset)}${content}`;

  const createMut = useMutation({
    mutationFn: () => live.campaigns.create({
      title,
      subject,
      content: finalContent,
      mailTemplateId: templateId || undefined,
      senderProfileId: senderId || undefined,
      senderProfileIds: senderMode === 'pool' && senderId ? [senderId] : undefined,
      senderMode,
      customRecipients: recipients,
      action,
      includeSignature,
      signature,
      removeUnsubscribe: !includeUnsubscribe,
      attachments: bannerAsset ? [bannerAsset] : [],
    }),
    onSuccess: (data) => router.push('/campaigns/' + data._id),
  });

  const previewMut = useMutation({
    mutationFn: () => live.mail.preview({
      subject,
      content: finalContent,
      format,
      includeSignature,
      signature,
      sampleRecipient: { email: recipients[0]?.email || 'preview@example.com', name: 'Raghav', rowData: { name: 'Raghav' } },
      variableMapping: { name: 'name' },
    }),
    onSuccess: (data) => setPreviewHtml(data.html),
  });

  const testMut = useMutation({
    mutationFn: () => live.mail.testCampaign({
      subject,
      content: finalContent,
      format,
      testEmail: TEST_EMAILS.join(','),
      senderProfileId: senderId || undefined,
      senderMode,
      includeSignature,
      signature,
    }),
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!bannerFile) throw new Error('Choose a banner image first');
      const cropped = await cropBannerFile(bannerFile, aspect.ratio, zoom);
      const [uploaded] = await uploadFiles('campaignBanner', { files: [cropped] });
      const url = uploaded.ufsUrl || uploaded.url || uploaded.serverData?.url;
      if (!url) throw new Error('UploadThing did not return a URL');
      return {
        filename: uploaded.name,
        contentType: cropped.type,
        storageKey: uploaded.key,
        storageUrl: url,
        role: 'banner',
        aspectRatio: aspect.value,
      } as BannerAsset;
    },
    onSuccess: (asset) => setBannerAsset(asset),
  });

  function onBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setBannerFile(file);
    setBannerAsset(null);
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    setBannerPreviewUrl(file ? URL.createObjectURL(file) : '');
  }

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <a href="/campaigns" className="text-sm text-indigo-600 hover:text-indigo-800">Back to campaigns</a>
            <h1 className="text-2xl font-bold tracking-tight mt-1">New campaign</h1>
            <p className="text-sm text-gray-500 mt-1">Compose, preview, test, then send.</p>
          </div>
          <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !title || !subject || !senderId || recipients.length === 0} className="btn-primary">
            {createMut.isPending ? 'Creating...' : action === 'dispatch' ? 'Create and send' : 'Save draft'}
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <section className="card space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">Campaign title</label>
                  <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="July workshop follow-up" />
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Your subject line" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">Approved template</label>
                  <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="input">
                    <option value="">Custom content</option>
                    {approvedTemplates.map((template: any) => <option key={template._id} value={template._id}>{template.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Content mode</label>
                  <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                    {(['rawHtml', 'visual'] as const).map((nextFormat) => (
                      <button key={nextFormat} type="button" onClick={() => setFormat(nextFormat)} className={`flex-1 rounded-md px-3 py-1.5 text-sm ${format === nextFormat ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {nextFormat === 'rawHtml' ? 'Raw HTML' : 'Simple'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Email HTML</label>
                <textarea className="input min-h-72 font-mono text-xs leading-5" value={content} onChange={(event) => setContent(event.target.value)} placeholder="<p>Hello...</p>" />
              </div>
            </section>

            <section className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Banner</h2>
                  <p className="text-xs text-gray-500">Crop locally, upload to UploadThing, store only the URL.</p>
                </div>
                {bannerAsset && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Uploaded</span>}
              </div>
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50" style={{ aspectRatio: aspect.value.replace(':', ' / ') }}>
                  {bannerPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerPreviewUrl} alt="Banner crop preview" className="h-full w-full object-cover" style={{ transform: `scale(${zoom})` }} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">No banner</div>
                  )}
                </div>
                <div className="space-y-3">
                  <input type="file" accept="image/*" onChange={onBannerChange} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
                  <div className="flex flex-wrap gap-2">
                    {ASPECTS.map((nextAspect) => (
                      <button key={nextAspect.value} type="button" onClick={() => setAspect(nextAspect)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${aspect.value === nextAspect.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
                        {nextAspect.label}
                      </button>
                    ))}
                  </div>
                  <label className="label">Zoom {zoom.toFixed(1)}x</label>
                  <input type="range" min="1" max="2.4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" />
                  <button type="button" onClick={() => uploadMut.mutate()} disabled={!bannerFile || uploadMut.isPending} className="btn-secondary">
                    {uploadMut.isPending ? 'Uploading...' : 'Upload banner'}
                  </button>
                  {uploadMut.error && <p className="text-xs text-red-600">{(uploadMut.error as Error).message}</p>}
                </div>
              </div>
            </section>

            <section className="card space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Recipients</label>
                  <textarea className="input min-h-40" value={customRecipients} onChange={(event) => setCustomRecipients(event.target.value)} />
                  <p className="mt-1 text-xs text-gray-500">{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Sender profile</label>
                    <select value={senderId} onChange={(event) => setSenderId(event.target.value)} className="input">
                      <option value="">Select sender</option>
                      {senders?.map((sender: any) => <option key={sender._id} value={sender._id}>{sender.name} ({sender.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sender mode</label>
                    <select value={senderMode} onChange={(event) => setSenderMode(event.target.value as 'single' | 'pool')} className="input">
                      <option value="single">Single profile</option>
                      <option value="pool">Pool rotation</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={action === 'dispatch'} onChange={(event) => setAction(event.target.checked ? 'dispatch' : 'draft')} />
                    Send immediately after creating
                  </label>
                </div>
              </div>
            </section>

            <section className="card space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input type="checkbox" checked={includeSignature} onChange={(event) => setIncludeSignature(event.target.checked)} />
                Add signature
              </label>
              {includeSignature && (
                <textarea className="input min-h-24" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder={selectedSender?.signature || 'Warmly,\nRaghav'} />
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input type="checkbox" checked={includeUnsubscribe} onChange={(event) => setIncludeUnsubscribe(event.target.checked)} />
                Add unsubscribe text at the bottom
              </label>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="card space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Review</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Recipients</dt><dd className="font-medium">{recipients.length}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Sender</dt><dd className="truncate font-medium">{selectedSender?.name || 'Missing'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Banner</dt><dd className="font-medium">{bannerAsset ? aspect.value : 'None'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Signature</dt><dd className="font-medium">{includeSignature ? 'On' : 'Off'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Unsubscribe</dt><dd className="font-medium">{includeUnsubscribe ? 'On' : 'Off'}</dd></div>
              </dl>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => previewMut.mutate()} disabled={previewMut.isPending || !content} className="btn-secondary">
                  {previewMut.isPending ? 'Rendering...' : 'Preview'}
                </button>
                <button type="button" onClick={() => testMut.mutate()} disabled={testMut.isPending || !senderId || !subject} className="btn-secondary">
                  {testMut.isPending ? 'Sending...' : 'Send test'}
                </button>
              </div>
              {testMut.data && <p className="text-xs text-emerald-700">Test requested for {TEST_EMAILS.length} addresses.</p>}
              {testMut.error && <p className="text-xs text-red-600">{(testMut.error as Error).message}</p>}
            </section>

            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
                <span className="text-xs text-gray-500">{format}</span>
              </div>
              <iframe title="Email preview" srcDoc={previewHtml || finalContent} className="h-[560px] w-full rounded-lg border border-gray-200 bg-white" />
            </section>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}
