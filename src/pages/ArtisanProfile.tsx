import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import { ALL_ARTISANS } from '@/data/artisanData';
import { 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck,
  Heart,
  Quote,
  Sparkles,
  Layers,
  Clock,
  Leaf
} from 'lucide-react';

const ArtisanProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const artisan = ALL_ARTISANS.find(a => a.id === id);

  if (!artisan) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
             <h2 className="text-3xl font-bold text-gray-900 mb-4">Artisan Not Found</h2>
             <Link to="/" className="px-10 py-4 bg-[#8E2A8B] text-white rounded-lg font-bold">Back to Home</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>{artisan.name} - Master Artisan Profile | Kottravai</title>
        <meta name="description" content={`Read the inspiring story of ${artisan.name}, a master artisan at Kottravai. ${artisan.impact_statement}`} />
        <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/artisans/${artisan.id}`} />
        <meta property="og:title" content={`${artisan.name} - Master Artisan Profile | Kottravai`} />
        <meta property="og:description" content={`Read the inspiring story of ${artisan.name}, a master artisan at Kottravai. ${artisan.impact_statement}`} />
        <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/artisans/${artisan.id}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={artisan.image || `${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/hero.webp`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${artisan.name} - Master Artisan Profile | Kottravai`} />
        <meta name="twitter:description" content={`Read the inspiring story of ${artisan.name}, a master artisan at Kottravai. ${artisan.impact_statement}`} />
        <meta name="twitter:image" content={artisan.image || `${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/hero.webp`} />
      </Helmet>

      <div className="min-h-screen bg-white text-[#2D1B4E] py-8">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* --- TOP: THE IDENTITY --- */}
          <div className="text-center mb-12">
             <Link to={`/hubs/${artisan.hub}`} className="inline-flex items-center gap-2 text-[#8E2A8B] mb-8 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-[0.5em]">
                <ArrowLeft size={14} /> From {artisan.hub} Hub
             </Link>
             <h1 className="text-6xl md:text-8xl font-serif font-bold mb-4 italic">{artisan.name}</h1>
             <p className="text-xl md:text-2xl font-serif italic text-gray-400 mb-8">"{artisan.impact_statement}"</p>
             
             {/* THE MINI PORTRAIT */}
             <div className="relative w-56 h-56 mx-auto mb-8">
                <div className="absolute inset-0 bg-[#8E2A8B] rounded-full rotate-6 opacity-10"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl">
                   <img src={artisan.image} className="w-full h-full object-cover" alt={artisan.name} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg text-[#8E2A8B] border border-gray-100">
                   <ShieldCheck size={20} />
                </div>
             </div>
          </div>

          {/* --- THE 5 SECTIONS: MINIMALIST DOSSIER --- */}
          <div className="space-y-12">
             
             {/* 01. Basic Details */}
             <section className="border-t border-gray-100 pt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8E2A8B] mb-8">Section 01 / Basic Details</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Age</p>
                      <p className="text-xl font-bold font-serif">{artisan.age} Yrs</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Location</p>
                      <p className="text-xl font-bold font-serif">{artisan.location}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">State</p>
                      <p className="text-xl font-bold font-serif">{artisan.state}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Experience</p>
                      <p className="text-xl font-bold font-serif">{artisan.experience}</p>
                   </div>
                </div>
             </section>

             {/* 02. About the Artisan */}
             <section className="border-t border-gray-100 pt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8E2A8B] mb-8">Section 02 / The Artisan</h3>
                <div className="space-y-6">
                   <p className="text-2xl md:text-3xl font-serif italic text-gray-600 leading-snug">
                     {artisan.background_story.split('.')[0]}. I craft with a focus on {artisan.craft_specialization || 'dignity and creativity'}.
                   </p>
                   <p className="text-lg leading-relaxed text-[#2D1B4E]/60 max-w-2xl">
                     Learned this skill through dedicated training, turning local natural resources into beautiful, sustainable pieces of art.
                   </p>
                </div>
             </section>

             {/* 03. The Story Behind the Craft */}
             <section className="border-t border-gray-100 pt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8E2A8B] mb-8">Section 03 / The Story</h3>
                <div className="space-y-12">
                   <div className="relative p-10 bg-[#FCF9F5] rounded-[2.5rem] text-center">
                      <Quote className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 text-[#8E2A8B]/20" />
                      <p className="text-2xl font-serif font-bold text-[#2D1B4E] mb-6 italic leading-snug">"{artisan.motivation}"</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-10 h-px bg-[#8E2A8B]"></div>
                        <Heart size={14} className="text-[#8E2A8B] fill-[#8E2A8B]" />
                        <div className="w-10 h-px bg-[#8E2A8B]"></div>
                      </div>
                   </div>
                   <div className="space-y-6 text-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Working Toward a Dream</h4>
                      <p className="text-4xl md:text-5xl font-serif font-bold text-[#2D1B4E] leading-tight italic">"{artisan.dream}"</p>
                   </div>
                </div>
             </section>

             {/* 04. The Making Process */}
             <section className="border-t border-gray-100 pt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8E2A8B] mb-8">Section 04 / The Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                   <div className="space-y-3">
                      <Layers className="mx-auto text-[#2D1B4E]/10" size={40} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#8E2A8B]">Materials</p>
                      <p className="text-lg font-bold font-serif">{artisan.materials}</p>
                   </div>
                   <div className="space-y-3">
                      <Clock className="mx-auto text-[#2D1B4E]/10" size={40} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#8E2A8B]">Time to Make</p>
                      <p className="text-lg font-bold font-serif">{artisan.making_time}</p>
                   </div>
                   <div className="space-y-3">
                      <Leaf className="mx-auto text-[#2D1B4E]/10" size={40} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#8E2A8B]">Standard</p>
                      <p className="text-lg font-bold font-serif">100% Sustainable</p>
                   </div>
                </div>
             </section>

             {/* 05. Personal Touch */}
             <section className="border-t border-gray-100 pt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8E2A8B] mb-8">Section 05 / Personal</h3>
                <div className="p-10 md:p-16 bg-[#2D1B4E] text-white rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
                   <Sparkles className="absolute -top-12 -right-12 w-48 h-48 opacity-5 rotate-12" />
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-8">Message to Customers</p>
                   <p className="text-2xl md:text-3xl font-serif italic mb-10 leading-snug">"{artisan.message}"</p>
                   <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Favorite Quote</p>
                         <p className="text-lg font-bold font-serif">{artisan.favorite_quote}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Fun Fact</p>
                         <p className="text-lg font-bold font-serif">{artisan.fun_fact}</p>
                      </div>
                   </div>
                </div>
             </section>

             {/* CTA */}
             <div className="pt-4 text-center">
                <Link 
                   to={artisan.hub === 'mathalampaarai' ? "/category/coconut-shell-products" : "/shop"}
                   className="inline-flex items-center gap-6 px-12 py-4 bg-white border-4 border-[#2D1B4E] text-[#2D1B4E] rounded-full font-black uppercase tracking-widest text-xs hover:bg-[#2D1B4E] hover:text-white transition-all shadow-xl hover:scale-105"
                 >
                   Explore Her Collection <ArrowRight size={20} />
                 </Link>
             </div>

             <div className="pt-8 pb-4 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.5em]">
                Kottravai Verified Artisan Document • Secure Record
             </div>


          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .font-serif { font-family: 'DM Serif Display', serif; }
      `}} />
    </MainLayout>
  );
};

export default ArtisanProfile;
