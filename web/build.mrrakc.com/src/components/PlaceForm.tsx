import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Select from 'react-select';
import { 
  PlaceSchema, 
  type Place, 
  KINDS, 
  ACTIVITIES, 
  ITEMS, 
  ACCESS_STATUS, 
  ACCESS_TYPE, 
  ACCESS_MODALITY, 
  AUDIENCE 
} from '../data/schema';
import { Plus, Trash2, MapPin, Calendar, MessageSquare, ChevronDown, Link as LinkIcon, Info, Settings } from 'lucide-react';

interface Props {
  initialData?: Partial<Place>;
  onSubmit: (data: Place) => void;
  onCancel: () => void;
  onError?: (message: string) => void;
}

// Local interface for form handling because useFieldArray requires objects
interface FormPlace extends Omit<Place, 'spec'> {
  spec: Omit<Place['spec'], 'comments'> & {
    comments: { value: string }[];
  }
}

const kindOptions = KINDS.map(k => ({ value: k, label: k }));
const activityOptions = ACTIVITIES.map(a => ({ value: a, label: a }));
const itemOptions = ITEMS.map(i => ({ value: i, label: i }));
const statusOptions = ACCESS_STATUS.map(s => ({ value: s, label: s }));
const typeOptions = ACCESS_TYPE.map(t => ({ value: t, label: t }));
const modalityOptions = ACCESS_MODALITY.map(m => ({ value: m, label: m }));
const audienceOptions = AUDIENCE.map(a => ({ value: a, label: a }));
const linkTypeOptions = ["article", "video", "image", "movie", "website", "book", "social", "map"].map(t => ({ value: t, label: t }));

const CollapsibleSection: React.FC<{ 
  title: string, 
  icon?: React.ReactNode, 
  children: React.ReactNode, 
  defaultOpen?: boolean 
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-clay dark:border-stone-800 last:border-0">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 hover:text-terra transition-colors group"
      >
        <span className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
          {icon} {title}
        </span>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} />
        </div>
      </button>
      {isOpen && (
        <div className="pb-6 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const PlaceForm: React.FC<Props> = ({ initialData, onSubmit, onCancel, onError }) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors }
  } = useForm<FormPlace>({
    defaultValues: {
      version: 'mrrakc/v0',
      kind: 'urban/landmark',
      metadata: {
        tags: []
      },
      spec: {
        name: '',
        id: '',
        description: '',
        location: {
          longitude: 0,
          latitude: 0,
          altitude: 0,
          province: 'province/marrakesh',
        },
        timePeriods: ['Modern'],
        access: {
          status: 'open',
          type: 'public',
          options: []
        },
        timeline: [],
        people: [],
        comments: [],
        links: [],
        activities: [],
        items: []
      }
    }
  });

  // Reactive Update: Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      const currentValues = getValues();
      const incomingHasMapLink = initialData.spec?.links?.some(l => l.type === 'map');

      const mappedComments = initialData.spec?.comments?.map(c => ({ value: c })) || currentValues.spec.comments;

      reset({
        ...currentValues,
        ...initialData,
        metadata: initialData.metadata || currentValues.metadata || { tags: [] },
        spec: {
          ...currentValues.spec,
          ...initialData.spec,
          location: {
            ...currentValues.spec?.location,
            ...initialData.spec?.location
          },
          comments: mappedComments as { value: string }[],
          links: initialData.spec?.links?.length 
            ? [
                ...(initialData.spec.links), 
                ...(currentValues.spec.links || []).filter(l => {
                  const isDuplicateUrl = initialData.spec?.links?.some(il => il.url === l.url);
                  const isReplacedMapLink = incomingHasMapLink && l.type === 'map';
                  return !isDuplicateUrl && !isReplacedMapLink;
                })
              ]
            : currentValues.spec.links
        }
      } as FormPlace);
    }
  }, [initialData, reset, getValues]);

  const name = watch('spec.name');
  useEffect(() => {
    if (name && !initialData?.spec?.id) {
      const generatedId = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      setValue('spec.id', generatedId);
    }
  }, [name, setValue, initialData]);

  const { fields: links, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: 'spec.links'
  });

  const { fields: timeline, append: appendTimeline, remove: removeTimeline } = useFieldArray({
    control,
    name: 'spec.timeline'
  });

  const { fields: accessOptions, append: appendAccess, remove: removeAccess } = useFieldArray({
    control,
    name: 'spec.access.options'
  });

  const { fields: comments, append: appendComment, remove: removeComment } = useFieldArray({
    control,
    name: 'spec.comments'
  });

  const handleFormSubmit = (data: FormPlace) => {
    // Transform back to Place schema
    const finalData: Place = {
      ...data,
      spec: {
        ...data.spec,
        comments: data.spec.comments.map(c => c.value)
      }
    } as Place;

    // Validate with Zod before calling parent onSubmit
    const result = PlaceSchema.safeParse(finalData);
    if (result.success) {
      onSubmit(result.data);
    } else {
      console.error('Zod Validation Failed:', result.error);
      if (onError) {
        onError('Please check the highlighted fields.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <CollapsibleSection title="Basic Information" icon={<Info size={14} />} defaultOpen={true}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase ${errors.spec?.name ? 'text-red-500' : 'text-stone-500'}`}>Name</label>
              <input 
                {...register('spec.name')}
                className={`w-full px-4 py-3 md:py-2 rounded-lg border ${errors.spec?.name ? 'border-red-500 focus:ring-red-500' : 'border-clay dark:border-stone-700 focus:ring-terra'} bg-white dark:bg-stone-800 focus:ring-1 outline-none transition-all text-base md:text-sm`}
                placeholder="e.g. Koutoubia Mosque"
              />
              {errors.spec?.name && <p className="text-red-500 text-[10px] mt-1">{errors.spec.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase ${errors.spec?.id ? 'text-red-500' : 'text-stone-500'}`}>ID (Slug)</label>
              <input 
                {...register('spec.id')}
                className={`w-full px-4 py-3 md:py-2 rounded-lg border ${errors.spec?.id ? 'border-red-500 focus:ring-red-500' : 'border-clay dark:border-stone-700'} bg-sand/30 dark:bg-stone-900 font-mono text-base md:text-xs outline-none`}
              />
              {errors.spec?.id && <p className="text-red-500 text-[10px] mt-1">{errors.spec.id.message}</p>}
            </div>

            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase ${errors.kind ? 'text-red-500' : 'text-stone-500'}`}>Kind</label>
              <Controller
                name="kind"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={kindOptions}
                    value={kindOptions.find(o => o.value === field.value)}
                    onChange={(val) => field.onChange((val as { value: typeof KINDS[number] } | null)?.value)}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.kind ? '#ef4444' : base.borderColor,
                        '&:hover': {
                          borderColor: errors.kind ? '#ef4444' : base.borderColor,
                        }
                      })
                    }}
                  />
                )}
              />
              {errors.kind && <p className="text-red-500 text-[10px] mt-1">{errors.kind.message}</p>}
            </div>

            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase ${errors.spec?.description ? 'text-red-500' : 'text-stone-500'}`}>Description</label>
              <textarea 
                {...register('spec.description')}
                rows={3}
                className={`w-full px-4 py-3 md:py-2 rounded-lg border ${errors.spec?.description ? 'border-red-500 focus:ring-red-500' : 'border-clay dark:border-stone-700 focus:ring-terra'} bg-white dark:bg-stone-800 focus:ring-1 outline-none transition-all text-base md:text-sm`}
                placeholder="Write a brief description..."
              />
              {errors.spec?.description && <p className="text-red-500 text-[10px] mt-1">{errors.spec.description.message}</p>}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Location" icon={<MapPin size={14} />} defaultOpen={true}>
          <div className={`space-y-4 p-4 bg-sand/30 dark:bg-stone-950/30 rounded-xl border ${errors.spec?.location ? 'border-red-500/50 bg-red-50/10' : 'border-clay/50 dark:border-stone-800/50'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500">Latitude</label>
                <input type="number" step="any" {...register('spec.location.latitude', { valueAsNumber: true })} className="w-full px-3 py-2 md:py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-base md:text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500">Longitude</label>
                <input type="number" step="any" {...register('spec.location.longitude', { valueAsNumber: true })} className="w-full px-3 py-2 md:py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-base md:text-xs" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500">Altitude (m)</label>
                <input type="number" step="any" {...register('spec.location.altitude', { valueAsNumber: true })} className="w-full px-3 py-2 md:py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-base md:text-xs" />
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold ${errors.spec?.location?.province ? 'text-red-500' : 'text-stone-500'}`}>Province</label>
                <input 
                  {...register('spec.location.province')}
                  readOnly
                  className={`w-full px-3 py-2 md:py-1.5 rounded border ${errors.spec?.location?.province ? 'border-red-500 bg-red-50/10' : 'border-clay dark:border-stone-700 bg-clay/20 dark:bg-stone-900'} text-base md:text-xs font-mono`}
                  placeholder="Auto..."
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Access & Fees" icon={<Settings size={14} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-stone-500">Status</label>
                <Controller
                  name="spec.access.status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={statusOptions}
                      value={statusOptions.find(o => o.value === field.value)}
                      onChange={(val) => field.onChange((val as { value: typeof ACCESS_STATUS[number] } | null)?.value)}
                      className="text-xs"
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-stone-500">Type</label>
                <Controller
                  name="spec.access.type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={typeOptions}
                      value={typeOptions.find(o => o.value === field.value)}
                      onChange={(val) => field.onChange((val as { value: typeof ACCESS_TYPE[number] } | null)?.value)}
                      className="text-xs"
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase text-stone-500">Pricing Options</label>
                <button type="button" onClick={() => appendAccess({ title: '', modality: 'free', audience: 'all', entranceFee: 0 })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md transition-colors">
                  <Plus size={12} /> Add
                </button>
              </div>
              
              {accessOptions.map((field, index) => (
                <div key={field.id} className="p-3 border border-clay dark:border-stone-800 rounded-lg space-y-2 relative group bg-sand/10 dark:bg-stone-950/10">
                  <button type="button" onClick={() => removeAccess(index)} className="absolute top-2 right-2 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <input {...register(`spec.access.options.${index}.title`)} placeholder="Title (e.g. Adult)" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Controller
                      name={`spec.access.options.${index}.modality`}
                      control={control}
                      render={({ field }) => <Select options={modalityOptions} value={modalityOptions.find(o => o.value === field.value)} onChange={(val) => field.onChange((val as { value: typeof ACCESS_MODALITY[number] } | null)?.value)} className="text-[10px]" />}
                    />
                    <Controller
                      name={`spec.access.options.${index}.audience`}
                      control={control}
                      render={({ field }) => <Select options={audienceOptions} value={audienceOptions.find(o => o.value === field.value)} onChange={(val) => field.onChange((val as { value: typeof AUDIENCE[number] } | null)?.value)} className="text-[10px]" />}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-stone-500 shrink-0">Fee:</span>
                    <input type="number" {...register(`spec.access.options.${index}.entranceFee`, { valueAsNumber: true })} className="w-full px-2 py-1 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Activities & Features" icon={<Calendar size={14} />}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-stone-500">Activities</label>
              <Controller
                name="spec.activities"
                control={control}
                render={({ field }) => (
                  <Select
                    isMulti
                    options={activityOptions}
                    value={activityOptions.filter(o => (field.value as string[])?.includes(o.value))}
                    onChange={(vals) => field.onChange(vals.map(v => v.value))}
                    className="text-xs"
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-stone-500">Items / Features</label>
              <Controller
                name="spec.items"
                control={control}
                render={({ field }) => (
                  <Select
                    isMulti
                    options={itemOptions}
                    value={itemOptions.filter(o => (field.value as string[])?.includes(o.value))}
                    onChange={(vals) => field.onChange(vals.map(v => v.value))}
                    className="text-xs"
                  />
                )}
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Timeline" icon={<Calendar size={14} />}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase text-stone-500">Historical Events</label>
              <button type="button" onClick={() => appendTimeline({ title: '', date: '', description: '' })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              {timeline.map((field, index) => (
                <div key={field.id} className="p-3 border border-clay dark:border-stone-800 rounded-lg space-y-2 relative group">
                  <button type="button" onClick={() => removeTimeline(index)} className="absolute top-2 right-2 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <input {...register(`spec.timeline.${index}.title`)} placeholder="Event Title" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold" />
                  <input type="date" {...register(`spec.timeline.${index}.date`)} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                  <textarea {...register(`spec.timeline.${index}.description`)} rows={2} placeholder="Description..." className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Links & References" icon={<LinkIcon size={14} />}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase text-stone-500">URLs</label>
              <button type="button" onClick={() => appendLink({ title: '', url: '', type: 'website' })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              {links.map((field, index) => (
                <div key={field.id} className="p-3 border border-clay dark:border-stone-800 rounded-lg space-y-2 relative group bg-sand/10 dark:bg-stone-950/10">
                  <button type="button" onClick={() => removeLink(index)} className="absolute top-2 right-2 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <input {...register(`spec.links.${index}.title`)} placeholder="Label" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                  <input {...register(`spec.links.${index}.url`)} placeholder="https://..." className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-[10px] font-mono" />
                  <Controller
                    name={`spec.links.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={linkTypeOptions}
                        value={linkTypeOptions.find(o => o.value === field.value)}
                        onChange={(val) => field.onChange((val as { value: string } | null)?.value)}
                        className="text-[10px]"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Internal Notes" icon={<MessageSquare size={14} />}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase text-stone-500">Comments</label>
              <button type="button" onClick={() => appendComment({ value: '' })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>
            
            <div className="space-y-2">
              {comments.map((field, index) => (
                <div key={field.id} className="flex gap-2 group">
                  <input {...register(`spec.comments.${index}.value`)} placeholder="Note..." className="flex-1 px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs" />
                  <button type="button" onClick={() => removeComment(index)} className="p-1 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <div className="shrink-0 p-6 border-t border-clay dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md flex gap-4 z-10">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-clay dark:border-stone-700 rounded-lg hover:bg-clay/20 transition-colors text-sm font-bold">
          Cancel
        </button>
        <button type="submit" className="flex-[2] px-4 py-3 bg-terra hover:bg-terra-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-terra/20 text-sm">
          Save Place
        </button>
      </div>
    </form>
  );
};

export default PlaceForm;
