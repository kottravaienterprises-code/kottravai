import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabaseClient';
import MainLayout from '@/layouts/MainLayout';
import ProductCard from '@/components/home/ProductCard';
import { Product } from '@/data/products';
import { ALL_ARTISANS } from '@/data/artisanData';
import { 
  Users, 
  ArrowRight, 
  ShoppingBag,
  Leaf,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Count-up hook
const useCountUp = (end: number, duration: number = 2) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
};

const ArtisanHub: React.FC = () => {
  const { hubName } = useParams<{ hubName: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Filter artisans from central data file
  const artisans = ALL_ARTISANS.filter(a => a.hub === hubName);

    useEffect(() => {
    const fetchProducts = async () => {
      if (!hubName) return;
      setLoading(true);
      setError(null);
      console.time(`fetchProducts-${hubName}`);

      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, slug, price, image, variants, hub, is_live, shortDescription, stock, images, category, category_slug')
          .eq('hub', hubName)
          .eq('is_live', true);

        if (productsError) console.error('Products fetch error:', productsError);
        setProducts(productsData || []);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        console.timeEnd(`fetchProducts-${hubName}`);
        setLoading(false);
      }
    };

    fetchProducts();
    window.scrollTo(0, 0);
  }, [hubName]);

  const hubTitle = hubName?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Artisan Hub';
  const isCoconutHub = hubName === 'mathalampaarai';

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-red-50 max-w-lg">
             <h2 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong</h2>
             <p className="text-gray-500 mb-8">{error}</p>
             <button onClick={() => window.location.reload()} className="px-10 py-4 bg-[#8E2A8B] text-white rounded-lg font-bold">Retry</button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>{hubTitle} | Kottravai Artisans</title>
      </Helmet>

      <div className="bg-[#FCF9F5] text-[#2D1B4E]">
        {/* --- HERO SECTION (FULL BANNED) --- */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-[#2D1B4E]">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src={isCoconutHub ? "/tenkasi_hub.jpg" : "/hero.webp"} 
              className="w-full h-full object-cover scale-105" 
              alt="Hub Banner" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#2D1B4E] via-[#2D1B4E]/60 to-transparent"></div>
          </div>

          <div className="container relative z-10 px-4 md:px-20 py-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 1, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <span className="inline-block px-5 py-2 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8">
                The Hub Story
              </span>
              <h1 className="text-5xl md:text-8xl font-bold font-serif text-white leading-[1.1] mb-8 shadow-sm">
                  {isCoconutHub ? "From a Small Room to a Thriving Craft Hub" : `${hubTitle}: A Journey of Craft`}
              </h1>
              <p className="text-xl text-white/80 mb-12 max-w-lg italic font-serif leading-relaxed">
                  "Every piece we craft helps a woman walk away from hazardous labor and towards a future of health and dignity."
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <button 
                  onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="px-12 py-5 bg-white text-[#2D1B4E] rounded-full font-black shadow-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                  Explore Products <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- TIMELINE SECTION --- */}
        <section className="py-24 bg-[#FCF9F5]">
          <div className="container px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                <div className="rounded-[3rem] overflow-hidden shadow-2xl h-[600px] hidden lg:block">
                  <img src="/Picture2.webp" className="w-full h-full object-cover" alt="Artisans at work" />
                </div>
                <div className="space-y-20">
                    <div className="max-w-xl">
                      <h2 className="text-4xl md:text-5xl font-bold font-serif text-[#2D1B4E] mb-8">Our Transformation</h2>
                      <p className="text-gray-600 text-lg leading-relaxed mb-12">
                          Before Kottravai intervened, the women of Mathalampaarai were tied to beedi rolling—a job that brought toxic dust into their homes and poor health to their families.
                      </p>
                    </div>
                    <div className="space-y-12 border-l-2 border-[#8E2A8B]/20 pl-10 relative">
                      {[
                          { year: '2021', title: 'The Resistance', desc: '5 women decided to stop beedi rolling and started learning shell crafts in a single small room.' },
                          { year: '2022', title: 'The Skill Shift', desc: 'Training intensified. Discarded shells became polished kitchenware and stunning jewelry.' },
                          { year: '2024', title: 'The Hub Growth', desc: 'Now over 10 master artisans lead the movement, ensuring no woman in the village is left behind.' }
                      ].map((item, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[51px] top-0 w-10 h-10 bg-[#8E2A8B] rounded-full flex items-center justify-center text-white border-4 border-[#FCF9F5]">
                                <Sparkles size={16} />
                            </div>
                            <span className="text-[#8E2A8B] font-black text-xs block mb-2">{item.year}</span>
                            <h4 className="text-2xl font-bold text-[#2D1B4E] mb-3">{item.title}</h4>
                            <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                          </div>
                      ))}
                    </div>
                </div>
              </div>
          </div>
        </section>

        {/* --- ARTISAN GRID --- */}
        <section id="artisans-grid" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,42,139,0.04)_0%,_transparent_60%)] pointer-events-none"></div>
          <div className="container px-4 relative z-10">
            <div className="text-center mb-20">
              <span className="inline-block text-[#8E2A8B] font-black uppercase tracking-[0.4em] text-[10px] mb-4">The Creators</span>
              <h2 className="text-4xl md:text-6xl font-bold font-serif text-[#2D1B4E] mb-6">Master Artisans</h2>
              <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">The hands behind every polished shell.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
              {artisans.map(artisan => (
                <motion.div
                  key={artisan.id}
                  whileHover={{ y: -10 }}
                  className="group flex flex-col items-center bg-white"
                >
                  <div
                    onClick={() => navigate(`/artisans/${artisan.id}`)}
                    className="relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-6 cursor-pointer shadow-lg bg-[#F8F0FF]"
                  >
                    <img
                      src={artisan.image}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                      alt={artisan.name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.artisan-fb') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }
                      }}
                    />
                    {/* Fallback placeholder */}
                    <div
                      className="artisan-fb absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-br from-[#F8F0FF] to-[#EDE0F5]"
                    >
                      <div className="w-20 h-20 rounded-full bg-[#8E2A8B]/10 flex items-center justify-center mb-3">
                        <Users size={34} className="text-[#8E2A8B]/40" />
                      </div>
                      <p className="text-[9px] font-black text-[#8E2A8B]/40 uppercase tracking-widest">{artisan.name.split(' ')[0]}</p>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        Read Her Story <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-[#2D1B4E]">{artisan.name}</h4>
                  <p className="text-[#8E2A8B]/60 text-[9px] font-black uppercase tracking-widest mt-1 mb-2">{artisan.craft_role}</p>
                  <Link
                    to={`/artisans/${artisan.id}`}
                    className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E] border-b-2 border-transparent hover:border-[#8E2A8B] transition-all pb-1"
                  >
                    View Full Bio
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Bottom tag — only show when artisans exist */}
            {artisans.length > 0 && (
              <div className="mt-16 pt-8 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-gray-400 text-sm font-medium text-center sm:text-left">
                  Every artisan here was once a beedi laborer. Today they are proud craftswomen.
                </p>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-6 h-[2px] bg-[#8E2A8B]/20 rounded-full"></div>
                  <span className="text-[10px] font-black text-[#8E2A8B] uppercase tracking-[0.3em]">{artisans.length} Master Artisans</span>
                  <div className="w-6 h-[2px] bg-[#8E2A8B]/20 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        </section>


        {/* --- STATS SECTION --- */}
        {hubName !== 'mathalampaarai' && (
          <section className="py-20 bg-[#2D1B4E] text-white">
            <div className="container px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                {[
                  { label: "Village Moms", val: 10, suffix: "+", icon: <Users size={24} /> },
                  { label: "Toxic-Free", val: 100, suffix: "%", icon: <Leaf size={24} /> },
                  { label: "Community", val: 1, suffix: " Hub", icon: <MapPin size={24} /> },
                  { label: "Zero Waste", val: 98, suffix: "%", icon: <Sparkles size={24} /> }
                ].map((stat, i) => (
                  <div key={i}>
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">{stat.icon}</div>
                      <div className="text-4xl font-serif font-bold">{useCountUp(stat.val)}{stat.suffix}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* --- PRODUCTS SECTION --- */}
        {hubName !== 'mathalampaarai' && (
          <section id="products-section" className="py-24 bg-white">
              <div className="container px-4">
                <div className="flex justify-between items-end mb-16">
                    <div>
                      <h2 className="text-4xl font-serif font-bold text-[#2D1B4E]">Made in {hubTitle}</h2>
                      <div className="w-16 h-1 bg-[#8E2A8B]/20 rounded-full mt-4"></div>
                    </div>
                    <Link to={hubName === 'mathalampaarai' ? "/category/coconut-shell-products" : "/shop"} className="text-xs font-black uppercase tracking-widest text-[#8E2A8B] hover:opacity-60 flex items-center gap-2">
                      All Products <ArrowRight size={14} />
                    </Link>
                </div>


                <div className="relative group/carousel">
                  {/* Navigation Buttons */}
                  {products.length > 4 && (
                    <>
                      <button 
                        onClick={() => scroll('left')} 
                        className="absolute left-0 md:left-4 top-[40%] -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white border border-[#8E2A8B]/10 hidden md:flex"
                      >
                        <ChevronLeft size={28} />
                      </button>
                      <button 
                        onClick={() => scroll('right')} 
                        className="absolute right-0 md:right-4 top-[40%] -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white border border-[#8E2A8B]/10 hidden md:flex"
                      >
                        <ChevronRight size={28} />
                      </button>
                    </>
                  )}

                  <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 md:gap-10 pb-8 -mx-4 px-4 h-full"
                  >
                    {products.map(p => (
                      <div key={p.id} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[calc(25%-30px)] snap-start flex">
                        <ProductCard product={p} />
                      </div>
                    ))}
                    {loading && (
                      <div className="col-span-full py-20 text-center animate-pulse min-w-full">
                        <p className="text-[#2D1B4E] font-bold tracking-widest uppercase">Loading Hub Collection...</p>
                      </div>
                    )}
                    {!loading && products.length === 0 && (
                      <div className="col-span-full py-20 bg-white rounded-[3rem] text-center border-2 border-dashed border-[#8E2A8B]/10 min-w-full">
                        <ShoppingBag size={40} className="mx-auto text-[#2D1B4E]/20 mb-4" />
                        <p className="text-[#2D1B4E] font-medium">Coming Soon to the Shop</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </section>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .font-serif { font-family: 'DM Serif Display', serif; }
      `}} />
    </MainLayout>
  );
};

export default ArtisanHub;
