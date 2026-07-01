import React, { useState } from 'react';
import { ClientLead } from '../types';
import { User, Mail, Phone, MapPin, Tag, FileText, ArrowLeft, Loader2, Paintbrush, ChevronRight } from 'lucide-react';

interface LeadFormProps {
  onSave: (
    clientData: Omit<ClientLead, 'id' | 'createdAt' | 'updatedAt'>,
    projectTitle: string,
    projectNotes: string
  ) => Promise<void>;
  onCancel: () => void;
  existingLead?: ClientLead;
}

export default function LeadForm({ onSave, onCancel, existingLead }: LeadFormProps) {
  // Client state parameters
  const [name, setName] = useState(existingLead?.name || '');
  const [company, setCompany] = useState(existingLead?.company || '');
  const [email, setEmail] = useState(existingLead?.email || '');
  const [phone, setPhone] = useState(existingLead?.phone || '');
  const [address, setAddress] = useState(existingLead?.address || '');
  const [source, setSource] = useState(existingLead?.source || 'Referral');
  const [notes, setNotes] = useState(existingLead?.notes || '');
  const [status, setStatus] = useState<ClientLead['status']>(existingLead?.status || 'Active');

  // Unified Project state parameters (only for new client + estimate drafting)
  const [projectTitle, setProjectTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client Name is required.');
      return;
    }

    if (!existingLead && !projectTitle.trim()) {
      setError('Please provide a painting estimate title to initialize the proposal worksheet.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(
        {
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          status,
          source,
          notes: notes.trim(),
        },
        projectTitle.trim(),
        projectNotes.trim()
      );
    } catch (err: any) {
      console.error('Error saving lead and proposal:', err);
      setError(err?.message || 'Failed to register proposal details and sync with Supabase CRM.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Automatically formulate default title if user types name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!existingLead && !projectTitle && val.trim()) {
      setProjectTitle(`Interior Painting - ${val.trim()}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-2">
      {/* Back button and View Header to match premium look */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h1 className="font-display text-2xl font-black text-white leading-none">
              {existingLead ? 'Edit CRM Customer Info' : 'New Client & Proposal Builder'}
            </h1>
            <p className="text-xs text-zinc-300 mt-1.5 font-medium">
              {existingLead 
                ? 'Update saved contact details and synchronization properties' 
                : 'Instantly register a client in your Supabase CRM and open their digital estimate sheet'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-xl font-mono text-left">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Customer CRM section Column */}
          <div className="lg:col-span-7 bg-[#161616] border border-neutral-800 rounded-2xl p-6 space-y-5 text-left shadow-lg">
            <div className="border-b border-neutral-850 pb-3">
              <h3 className="font-display font-black text-xs text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> 1. Client Contact Records
              </h3>
            </div>

            <div className="space-y-4">
              {/* Client Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 block">Contact Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                    <User className="w-4 h-4 text-zinc-400" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Ali Al-Nasih"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                  />
                </div>
              </div>

              {/* Company & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Company (Optional)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <Tag className="w-4 h-4 text-zinc-400" />
                    </span>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Al-Nasih Properties"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <Mail className="w-4 h-4 text-zinc-400" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ali@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <Phone className="w-4 h-4 text-zinc-400" />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(416) 555-1212"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Acquisition Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm hover:border-neutral-700 focus:outline-none focus:border-blue-500 transition font-sans"
                  >
                    <option value="Website">Website Form Submission</option>
                    <option value="Instagram">Instagram / Social Media</option>
                    <option value="Referral">Word-Of-Mouth / Referral</option>
                    <option value="Flyer">Local Advertisement / Flyer</option>
                    <option value="Google Maps">Google Search / Maps</option>
                  </select>
                </div>
              </div>

              {/* Property Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 block">Jobsite / Property Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 45 Overlea Blvd, East York, ON M4H 1C3"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-semibold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                  />
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 block">Customer Relationship Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional client details, preferred contact hours, paint finish preferences, etc."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                />
              </div>
            </div>
          </div>

          {/* Proposal Config section Column */}
          <div className="lg:col-span-5 bg-[#161616] border border-neutral-800 rounded-2xl p-6 space-y-5 text-left shadow-lg">
            <div className="border-b border-neutral-850 pb-3">
              <h3 className="font-display font-black text-xs text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Paintbrush className="w-3.5 h-3.5" /> 2. Painting Scope
              </h3>
            </div>

            {existingLead ? (
              <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl text-zinc-400 text-xs leading-relaxed font-sans">
                You are currently editing client record metadata. Saved estimates and active change order templates linked to this client are managed directly on the Proposals dashboard tab.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Proposal Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Proposal Title *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <FileText className="w-4 h-4 text-zinc-400" />
                    </span>
                    <input
                      type="text"
                      required
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="e.g. Interior Painting - Ali Al-Nasih"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-bold text-sm placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
                    />
                  </div>
                </div>

                {/* Scope Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 block">Estimate Scope Description</label>
                  <textarea
                    rows={4}
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    placeholder="e.g. Siding painting with satin acrylic latex and soffit coats. Custom prep work, patch plaster, master bedroom trim."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium text-xs placeholder-zinc-500 hover:border-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans leading-relaxed"
                  />
                </div>

                {/* Helpful info box */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-850 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block font-mono">
                    Quick-Draft Ready
                  </span>
                  <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                    As requested, this initiates a draft estimate with no configured room specs so you can start measuring dimensions dynamically on-site.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action button bar */}
        <div className="flex items-center justify-end gap-3.5 pt-5 border-t border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-350 text-white px-5 py-2.5 text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/10 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {existingLead ? 'Update Profile' : 'Save CRM Lead & Start Estimating'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
