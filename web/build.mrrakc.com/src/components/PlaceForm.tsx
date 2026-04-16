import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { X, Plus, Trash2, MapPin, Calendar, MessageSquare, Ticket } from 'lucide-react';

interface Props {
  initialData?: Partial<Place>;
  onSubmit: (data: Place) => void;
  onCancel: () => void;
}

const kindOptions = KINDS.map(k => ({ value: k, label: k }));
const activityOptions = ACTIVITIES.map(a => ({ value: a, label: a }));
const itemOptions = ITEMS.map(i => ({ value: i, label: i }));
const statusOptions = ACCESS_STATUS.map(s => ({ value: s, label: s }));
const typeOptions = ACCESS_TYPE.map(t => ({ value: t, label: t }));
const modalityOptions = ACCESS_MODALITY.map(m => ({ value: m, label: m }));
const audienceOptions = AUDIENCE.map(a => ({ value: a, label: a }));
const linkTypeOptions = ["article", "video", "image", "movie", "website", "book", "social", "map"].map(t => ({ value: t, label: t }));

const PlaceForm: React.FC<Props> = ({ initialData, onSubmit, onCancel }) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<Place>({
    resolver: zodResolver(PlaceSchema),
    defaultValues: {
      version: 'mrrakc/v0',
      spec: {
        name: '',
        id: '',
        description: '',
        location: {
          longitude: 0,
          latitude: 0,
          altitude: 0,
          province: '',
        },
        timePeriods: ['Modern'],
        access: {
          status: 'open',
          type: 'public',
          options: []
        },
        timeline: [],
        comments: [],
        links: [],
        activities: [],
        items: []
      }
    }
  });

  // Reactive Update: Update form when initialData changes (e.g. Map Point Select)
  useEffect(() => {
    if (initialData) {
      const currentValues = watch();
      
      // Determine if the incoming data has a map link
      const incomingHasMapLink = initialData.spec?.links?.some(l => l.type === 'map');

      reset({
        ...currentValues,
        ...initialData,
        spec: {
          ...currentValues.spec,
          ...initialData.spec,
          location: {
            ...currentValues.spec?.location,
            ...initialData.spec?.location
          },
          // Merge links:
          // 1. Always take incoming links
          // 2. Keep current links ONLY if they don't have the same URL AND 
          //    (if we have an incoming map link, filter out existing map links)
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
      });
    }
  }, [initialData, reset]);

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
    name: 'spec.comments' as any
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full bg-white dark:bg-stone-900 border-l border-clay dark:border-stone-800 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-clay dark:border-stone-800 flex justify-between items-center bg-sand dark:bg-stone-950">
        <h2 className="text-xl font-serif font-bold text-terra">Place Details</h2>
        <button type="button" onClick={onCancel} className="p-2 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400">Basic Information</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Name</label>
            <input 
              {...register('spec.name')}
              className="w-full px-4 py-2 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-terra outline-none transition-all"
              placeholder="e.g. Koutoubia Mosque"
            />
            {errors.spec?.name && <p className="text-red-500 text-xs">{errors.spec.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">ID (Slug)</label>
            <input 
              {...register('spec.id')}
              className="w-full px-4 py-2 rounded-lg border border-clay dark:border-stone-700 bg-sand/50 dark:bg-stone-900 font-mono text-sm outline-none"
            />
            {errors.spec?.id && <p className="text-red-500 text-xs">{errors.spec.id.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Kind</label>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={kindOptions}
                  value={kindOptions.find(o => o.value === field.value)}
                  onChange={(val) => field.onChange(val?.value)}
                />
              )}
            />
            {errors.kind && <p className="text-red-500 text-xs">{errors.kind.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea 
              {...register('spec.description')}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-terra outline-none transition-all"
              placeholder="Write a brief description of the place..."
            />
            {errors.spec?.description && <p className="text-red-500 text-xs">{errors.spec.description.message}</p>}
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4 p-4 bg-sand/50 dark:bg-stone-950 rounded-xl border border-clay dark:border-stone-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <MapPin size={16} /> Location
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Latitude</label>
              <input type="number" step="any" {...register('spec.location.latitude', { valueAsNumber: true })} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Longitude</label>
              <input type="number" step="any" {...register('spec.location.longitude', { valueAsNumber: true })} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Altitude (meters)</label>
              <input type="number" step="any" {...register('spec.location.altitude', { valueAsNumber: true })} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Province</label>
              <input 
                {...register('spec.location.province')}
                readOnly
                className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-clay/30 dark:bg-stone-900 text-sm font-mono"
                placeholder="Auto-detected..."
              />
            </div>
          </div>
        </section>

        {/* Access */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400">Access & Options</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Status</label>
              <Controller
                name="spec.access.status"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={statusOptions}
                    value={statusOptions.find(o => o.value === field.value)}
                    onChange={(val) => field.onChange(val?.value)}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Type</label>
              <Controller
                name="spec.access.type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={typeOptions}
                    value={typeOptions.find(o => o.value === field.value)}
                    onChange={(val) => field.onChange(val?.value)}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Price/Audience Options</label>
              <button type="button" onClick={() => appendAccess({ title: '', modality: 'free', audience: 'all', entranceFee: 0 })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-xs font-bold">
                <Plus size={14} /> Add Option
              </button>
            </div>
            
            {accessOptions.map((field, index) => (
              <div key={field.id} className="p-4 border border-clay dark:border-stone-800 rounded-lg space-y-3 relative group bg-sand/30 dark:bg-stone-950/30">
                <button type="button" onClick={() => removeAccess(index)} className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
                <input {...register(`spec.access.options.${index}.title`)} placeholder="e.g. Adult Entrance" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name={`spec.access.options.${index}.modality`}
                    control={control}
                    render={({ field }) => <Select options={modalityOptions} value={modalityOptions.find(o => o.value === field.value)} onChange={(val) => field.onChange(val?.value)} className="text-xs" />}
                  />
                  <Controller
                    name={`spec.access.options.${index}.audience`}
                    control={control}
                    render={({ field }) => <Select options={audienceOptions} value={audienceOptions.find(o => o.value === field.value)} onChange={(val) => field.onChange(val?.value)} className="text-xs" />}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-500">Fee (-1 for N/A)</label>
                  <input type="number" {...register(`spec.access.options.${index}.entranceFee`, { valueAsNumber: true })} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400 flex items-center gap-2">
              <Calendar size={16} /> Timeline
            </h3>
            <button type="button" onClick={() => appendTimeline({ title: '', date: '', description: '' })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-sm font-bold">
              <Plus size={16} /> Add Event
            </button>
          </div>
          
          <div className="space-y-4">
            {timeline.map((field, index) => (
              <div key={field.id} className="p-4 border border-clay dark:border-stone-800 rounded-lg space-y-3 relative group">
                <button type="button" onClick={() => removeTimeline(index)} className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
                <input {...register(`spec.timeline.${index}.title`)} placeholder="Event Title" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-bold" />
                <input type="date" {...register(`spec.timeline.${index}.date`)} className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                <textarea {...register(`spec.timeline.${index}.description`)} rows={2} placeholder="Event description..." className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Multi-select Enums */}
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Activities</label>
            <Controller
              name="spec.activities"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  options={activityOptions}
                  value={activityOptions.filter(o => field.value?.includes(o.value as any))}
                  onChange={(vals) => field.onChange(vals.map(v => v.value))}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Items/Features</label>
            <Controller
              name="spec.items"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  options={itemOptions}
                  value={itemOptions.filter(o => field.value?.includes(o.value as any))}
                  onChange={(vals) => field.onChange(vals.map(v => v.value))}
                />
              )}
            />
          </div>
        </section>

        {/* Links */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400">Links</h3>
            <button type="button" onClick={() => appendLink({ title: '', url: '', type: 'website' })} className="text-terra hover:text-terra-dark flex items-center gap-1 text-sm font-bold">
              <Plus size={16} /> Add Link
            </button>
          </div>
          
          <div className="space-y-4">
            {links.map((field, index) => (
              <div key={field.id} className="p-4 border border-clay dark:border-stone-800 rounded-lg space-y-3 relative group">
                <button type="button" onClick={() => removeLink(index)} className="absolute top-2 right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
                <input {...register(`spec.links.${index}.title`)} placeholder="Title" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                <input {...register(`spec.links.${index}.url`)} placeholder="URL" className="w-full px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                <Controller
                  name={`spec.links.${index}.type`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={linkTypeOptions}
                      value={linkTypeOptions.find(o => o.value === field.value)}
                      onChange={(val) => field.onChange(val?.value)}
                      className="text-sm"
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Comments */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-400 flex items-center gap-2">
              <MessageSquare size={16} /> Comments
            </h3>
            <button type="button" onClick={() => appendComment('')} className="text-terra hover:text-terra-dark flex items-center gap-1 text-sm font-bold">
              <Plus size={16} /> Add Comment
            </button>
          </div>
          
          <div className="space-y-2">
            {comments.map((field, index) => (
              <div key={field.id} className="flex gap-2 group">
                <input {...register(`spec.comments.${index}` as any)} placeholder="Additional notes..." className="flex-1 px-3 py-1.5 rounded border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-sm" />
                <button type="button" onClick={() => removeComment(index)} className="p-1.5 text-stone-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-clay dark:border-stone-800 bg-sand/90 dark:bg-stone-950/90 backdrop-blur-md flex gap-4 z-10">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-clay dark:border-stone-700 rounded-lg hover:bg-clay/50 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-[2] px-4 py-2 bg-terra hover:bg-terra-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-terra/20">
          Save Place
        </button>
      </div>
    </form>
  );
};

export default PlaceForm;
