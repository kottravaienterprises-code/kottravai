import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const galleryImages = [
    {
        src: '/WhatsApp Image 2026-05-22 at 4.59.29 PM.jpeg',
        alt: 'Kottravai lifestyle 1',
        link: '/category/coconut-shell-products'
    },
    {
        src: '/WhatsApp Image 2026-05-22 at 5.00.10 PM.jpeg',
        alt: 'Kottravai lifestyle 2',
        link: '/category/handmade-jewellery'
    },
    {
        src: '/WhatsApp Image 2026-05-22 at 5.00.35 PM.jpeg',
        alt: 'Kottravai lifestyle 3',
        link: '/category/banana-fiber'
    },
    {
        src: '/WhatsApp Image 2026-05-22 at 5.10.33 PM.jpeg',
        alt: 'Kottravai lifestyle 4',
        link: '/category/essential-care'
    },
    {
        src: '/WhatsApp Image 2026-05-22 at 5.01.35 PM.jpeg',
        alt: 'Kottravai lifestyle 5',
        link: '/category/masala-powders'
    },
    {
        src: '/hampers.webp',
        alt: 'Kottravai lifestyle 6',
        link: '/category/hampers'
    },
];

const SeeKottravaiInLife = () => {
    const carouselRef = useRef<HTMLDivElement>(null);

    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const { scrollLeft, clientWidth } = carouselRef.current;
            const scrollAmount = clientWidth * 0.75;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            carouselRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-4 bg-white">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="mb-6 max-w-3xl">
                    <h2 className="text-3xl md:text-4xl font-black text-[#8E2A8B] tracking-tight">See Kottravai in life</h2>
                    <p className="text-gray-600 mt-3 text-sm md:text-base">
                        A visual story from our studio, kitchen and customer homes.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex">
                        <button
                            type="button"
                            onClick={() => scrollCarousel('left')}
                            className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition"
                            aria-label="Scroll gallery left"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </div>

                    <div
                        ref={carouselRef}
                        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 scroll-smooth px-2"
                    >
                        {galleryImages.map((image) => (
                            <Link
                                key={image.src}
                                to={image.link}
                                className="snap-center flex-shrink-0 w-[80vw] sm:w-[360px] md:w-[320px] block overflow-hidden rounded-xl bg-[#F8F5FA] border border-[#F0E7F7] shadow-sm"
                            >
                                <img
                                    src={image.src}
                                    alt={image.alt}
                                    className="w-full h-[240px] object-cover transition-transform duration-700 hover:scale-105"
                                    loading="lazy"
                                />
                            </Link>
                        ))}
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex">
                        <button
                            type="button"
                            onClick={() => scrollCarousel('right')}
                            className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition"
                            aria-label="Scroll gallery right"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SeeKottravaiInLife;
