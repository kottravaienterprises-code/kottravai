import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Calendar, Loader2, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Registration {
    id: string;
    event_slug: string;
    full_name: string;
    email: string;
    phone: string;
    organization: string;
    status: string;
    created_at: string;
}

const EventRegistrationsView = () => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [eventSlug, setEventSlug] = useState('design-the-next-livelihood');
    const [status, setStatus] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 25;

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('kottravai_admin_token');
            
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search,
                event_slug: eventSlug,
                status
            });

            const response = await fetch(`/api/admin/events/registrations?${queryParams.toString()}`, {
                headers: {
                    'x-admin-secret': token || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registrations');
            }

            const data = await response.json();
            if (data.success) {
                setRegistrations(data.registrations);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, [page, eventSlug, status]); // Re-fetch on pagination or filter changes

    // Re-fetch on search enter
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to page 1
        fetchRegistrations();
    };

    const handleDownload = async () => {
        try {
            toast.loading('Preparing download...', { id: 'csv-download' });
            const token = sessionStorage.getItem('kottravai_admin_token');
            
            const queryParams = new URLSearchParams({
                search,
                event_slug: eventSlug,
                status
            });

            const response = await fetch(`/api/admin/events/registrations/export?${queryParams.toString()}`, {
                headers: {
                    'x-admin-secret': token || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download CSV');
            }

            // Trigger browser download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = eventSlug ? `${eventSlug}-registrations.csv` : 'event-registrations.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success('Download complete!', { id: 'csv-download' });
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download CSV', { id: 'csv-download' });
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Event Registrations</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage and view event participants ({total} total)</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => fetchRegistrations()}
                        className="p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin text-[#8E2A8B]" : ""} />
                    </button>
                    
                    <button 
                        onClick={handleDownload}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#8E2A8B] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#2D1B4E] transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <Download size={18} />
                        Download CSV
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name, email, phone, or org..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] transition-all"
                    />
                </form>
                
                <div className="flex gap-4">
                    <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                            value={eventSlug}
                            onChange={(e) => {
                                setEventSlug(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 appearance-none font-medium text-slate-700"
                        >
                            <option value="">All Events</option>
                            <option value="design-the-next-livelihood">Design the Next Livelihood</option>
                            {/* Future events can be added here */}
                        </select>
                    </div>
                    
                    <div className="relative hidden md:block">
                        <select 
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                            className="pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 appearance-none font-medium text-slate-700"
                        >
                            <option value="">All Statuses</option>
                            <option value="registered">Registered</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Participant</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Event</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <Loader2 className="animate-spin text-[#8E2A8B] mx-auto mb-4" size={32} />
                                        <p className="text-slate-500 font-medium">Loading registrations...</p>
                                    </td>
                                </tr>
                            ) : registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="text-slate-400" size={24} />
                                        </div>
                                        <p className="text-slate-700 font-bold text-lg mb-1">No registrations found</p>
                                        <p className="text-slate-500">Try adjusting your search or filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                registrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{reg.full_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700">{reg.email}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{reg.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 font-medium max-w-[200px] truncate" title={reg.organization}>
                                                {reg.organization}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
                                                {reg.event_slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                                reg.status === 'registered' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                            }`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 flex items-center gap-2">
                                            <Calendar size={14} />
                                            {new Date(reg.created_at).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-700">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-slate-700">{Math.min(page * limit, total)}</span> of <span className="font-bold text-slate-700">{total}</span>
                        </p>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            
                            <div className="flex items-center px-4 font-bold text-sm text-slate-700 bg-white border border-slate-200 rounded-xl">
                                Page {page} of {totalPages}
                            </div>
                            
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventRegistrationsView;
